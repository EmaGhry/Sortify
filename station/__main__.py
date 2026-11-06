import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from time import perf_counter

from .model import (
    Classifier, DEFAULT_MODEL, DESTINATIONS, HttpClassifier, InvalidImage, ModelUnavailable, Prediction,
)
from .esp_link import Board, BoardError, DEFAULT_ESP_URL


HOST = "127.0.0.1"
PORT = 8765
MAX_BYTES = 1_000_000


class Station:
    def __init__(self, mode, classifier=None, board=None):
        self.mode = mode
        self.classifier = classifier
        self.board = board
        self.lock = Lock()

    def scan(self, content_type, data):
        start = perf_counter()
        if self.mode == "simulation":
            if content_type != "application/json":
                raise ValueError("Choose a simulation case.")
            payload = json.loads(data)
            destination = payload.get("destination") if isinstance(payload, dict) else None
            if destination not in DESTINATIONS:
                raise ValueError("Choose a valid simulation case.")
            prediction = Prediction(destination, destination, None)
        else:
            if content_type != "image/jpeg":
                raise ValueError("Capture a JPEG from the camera.")
            prediction = self.classifier.predict(data)

        inference_ms = round((perf_counter() - start) * 1000)
        hardware = "disabled"
        error = None
        if self.board:
            try:
                self.board.indicate(prediction.destination)
                hardware = "acknowledged"
            except BoardError as exc:
                hardware, error = "unconfirmed", str(exc)

        return {
            "mode": self.mode,
            "model_source": self.model_source,
            "label": prediction.label,
            "destination": prediction.destination,
            "score": prediction.score,
            "inference_ms": None if self.mode == "simulation" else inference_ms,
            "elapsed_ms": round((perf_counter() - start) * 1000),
            "hardware": hardware,
            "error": error,
        }

    @property
    def model_source(self):
        if self.classifier is None:
            return "simulation"
        return "network" if isinstance(self.classifier, HttpClassifier) else "local"


def make_handler(station):
    class Handler(BaseHTTPRequestHandler):
        timeout = 8

        def respond(self, status, data):
            payload = json.dumps(data).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            try:
                self.wfile.write(payload)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def allowed(self):
            if (
                self.headers.get("Host") == f"{HOST}:{PORT}"
                and self.headers.get("X-Sortify-Bench") == "1"
                and self.headers.get("Origin") is None
            ):
                return True
            self.respond(403, {"error": "Use the local Sortify kiosk."})
            return False

        def do_GET(self):
            if not self.allowed():
                return
            if self.path == "/status":
                self.respond(200, {"mode": station.mode, "model_source": station.model_source})
            else:
                self.respond(404, {"error": "Unknown station endpoint."})

        def do_POST(self):
            if not self.allowed():
                return
            if self.path != "/scan":
                self.respond(404, {"error": "Unknown station endpoint."})
                return
            try:
                size = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                size = 0
            if not 0 < size <= MAX_BYTES:
                self.respond(413, {"error": "Send a non-empty image or simulation case under 1 MB."})
                return
            if not station.lock.acquire(blocking=False):
                self.respond(409, {"error": "A scan is already in progress."})
                return
            try:
                data = self.rfile.read(size)
                if len(data) != size:
                    raise ValueError("Incomplete request.")
                result = station.scan(self.headers.get_content_type(), data)
            except InvalidImage:
                self.respond(400, {"error": "Capture a valid JPEG image."})
            except (ValueError, UnicodeError):
                self.respond(400, {"error": "Invalid scan input."})
            except TimeoutError:
                self.respond(408, {"error": "The scan upload timed out."})
            except ModelUnavailable:
                self.respond(502, {"error": "Modelul din rețea nu răspunde corect. Verifică IP-ul și endpointul."})
            except Exception as exc:
                print(f"Scan failed: {exc}", flush=True)
                self.respond(500, {"error": "Local inference failed. See the station terminal."})
            else:
                self.respond(200, result)
            finally:
                station.lock.release()

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Sortify bench demo service on 127.0.0.1.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--simulate", action="store_true", help="Preset results, no camera/model/ESP32.")
    mode.add_argument("--preview", action="store_true", help="Run local AI without moving hardware.")
    mode.add_argument("--esp", nargs="?", const=DEFAULT_ESP_URL, metavar="URL",
                      help="Run AI and send material to the ESP32 SoftAP.")
    model = parser.add_mutually_exclusive_group()
    model.add_argument("--model", type=Path, default=DEFAULT_MODEL, help="WasteWise-compatible ONNX file.")
    model.add_argument("--model-url", help="HTTP(S) endpoint accepting JPEG and returning label and score.")
    parser.add_argument("--threshold", type=float, default=0.75, help="Minimum class score to indicate.")
    args = parser.parse_args()
    if not 0 < args.threshold <= 1:
        parser.error("--threshold must be greater than 0 and at most 1")

    if args.simulate:
        if args.model_url:
            parser.error("--model-url requires --preview or --esp")
        station = Station("simulation")
    else:
        if not args.model_url and not args.model.is_file():
            parser.error(f"Model missing: {args.model}. Run python -m station.download_model.")
        try:
            if args.model_url:
                classifier = HttpClassifier(args.model_url, args.threshold, os.getenv("SORTIFY_MODEL_TOKEN"))
            else:
                classifier = Classifier(args.model, args.threshold)
            board = Board(args.esp) if args.esp else None
        except Exception as exc:
            parser.exit(1, f"Could not initialize the station: {exc}\n")
        station = Station("bench" if board else "preview", classifier, board)

    try:
        with ThreadingHTTPServer((HOST, PORT), make_handler(station)) as server:
            print(f"Sortify station: {station.mode} on http://{HOST}:{PORT}", flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
