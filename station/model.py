from dataclasses import dataclass
import json
from math import isfinite
from urllib.error import URLError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, ProxyHandler, Request, build_opener


DESTINATIONS = ("glass", "metal", "plastic", "paper", "other")


@dataclass(frozen=True)
class Prediction:
    label: str
    destination: str
    score: float | None


class ModelUnavailable(RuntimeError):
    pass


def route(label: str, score: float, threshold: float) -> Prediction:
    destination = label if score >= threshold else "other"
    return Prediction(label, destination, round(score, 4))


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class HttpClassifier:
    """Call the team's model endpoint."""

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
                label not in DESTINATIONS
                or type(score) not in (int, float)
                or not 0 <= score <= 1
                or not isfinite(score)
            ):
                raise ValueError("Invalid prediction")
        except (URLError, OSError, ValueError) as exc:
            raise ModelUnavailable("The model endpoint did not return a valid label and score.") from exc
        return route(label, score, self.threshold)
