from dataclasses import dataclass
from io import BytesIO
import json
from math import isfinite
from pathlib import Path
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


DESTINATIONS = ("glass", "metal", "plastic", "paper", "reject")
LABELS = ("battery", "biological", "cardboard", "glass", "metal", "paper", "plastic", "trash")
DEFAULT_MODEL = Path(__file__).parent / "models" / "wastewise-yolo.onnx"


@dataclass(frozen=True)
class Prediction:
    label: str
    destination: str
    score: float | None


class InvalidImage(ValueError):
    pass


class ModelUnavailable(RuntimeError):
    pass


def route(label: str, score: float, threshold: float) -> Prediction:
    destination = "paper" if label == "cardboard" else label
    if destination not in DESTINATIONS or score < threshold:
        destination = "reject"
    return Prediction(label, destination, round(score, 4))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class HttpClassifier:
    """Call a teammate's model over LAN, or a hosted HTTPS model."""

    def __init__(self, url: str, threshold: float, token: str | None):
        parsed = urlsplit(url)
        if parsed.scheme not in ("http", "https") or not parsed.hostname or parsed.username is not None:
            raise ValueError("Use an HTTP(S) model endpoint without embedded credentials.")
        if token and parsed.scheme != "https":
            raise ValueError("Model tokens require HTTPS.")
        self.url = url
        self.threshold = threshold
        self.headers = {"Content-Type": "image/jpeg", "Accept": "application/json"}
        if token:
            self.headers["Authorization"] = f"Bearer {token}"
        self.opener = build_opener(ProxyHandler({}), NoRedirect())

    def predict(self, jpeg: bytes) -> Prediction:
        request = Request(self.url, data=jpeg, headers=self.headers, method="POST")
        try:
            with self.opener.open(request, timeout=3) as response:
                data = response.read(4097)
            if len(data) > 4096:
                raise ValueError("Oversized response")
            result = json.loads(data)
            if not isinstance(result, dict):
                raise ValueError("Expected a JSON object")
            label, score = result.get("label"), result.get("score")
            if (
                label not in (*LABELS, "other", "unknown", "empty", "reject")
                or type(score) not in (int, float)
                or not 0 <= score <= 1
                or not isfinite(score)
            ):
                raise ValueError("Invalid prediction")
        except (URLError, OSError, ValueError) as exc:
            raise ModelUnavailable("The model endpoint did not return a valid label and score.") from exc
        return route(label, score, self.threshold)


class Classifier:
    """CPU inference for the WasteWise ONNX input and label order."""

    def __init__(self, path: Path, threshold: float):
        import numpy as np
        import onnxruntime as ort

        self.np = np
        self.threshold = threshold
        self.session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
        self.input_name = self.session.get_inputs()[0].name
        self.predict_tensor(np.zeros((1, 3, 224, 224), dtype=np.float32))

    def predict_tensor(self, tensor) -> Prediction:
        scores = self.session.run(None, {self.input_name: tensor})[0].reshape(-1)
        if (
            scores.size != len(LABELS)
            or not self.np.isfinite(scores).all()
            or not ((0 <= scores) & (scores <= 1)).all()
            or not self.np.isclose(scores.sum(), 1, atol=0.01)
        ):
            raise ValueError("The model must return the eight WasteWise class probabilities.")

        index = int(scores.argmax())
        label, score = LABELS[index], float(scores[index])
        return route(label, score, self.threshold)

    def predict(self, jpeg: bytes) -> Prediction:
        from PIL import Image, UnidentifiedImageError

        try:
            with Image.open(BytesIO(jpeg), formats=["JPEG"]) as source:
                if source.width * source.height > 4_000_000:
                    raise InvalidImage("Image is too large.")
                image = source.convert("RGB").resize((224, 224), Image.Resampling.BILINEAR)
        except (UnidentifiedImageError, Image.DecompressionBombError, OSError) as exc:
            raise InvalidImage("Capture a valid JPEG image.") from exc

        pixels = self.np.asarray(image, dtype=self.np.float32) / 255.0
        return self.predict_tensor(pixels.transpose(2, 0, 1)[None, ...].copy())
