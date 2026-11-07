import argparse
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sqlite3
from threading import Lock
from time import perf_counter

from .model import DESTINATIONS, HttpClassifier, ModelUnavailable, Prediction
from .esp_link import Board, BoardError, DEFAULT_ESP_URL
from .history import History


HOST = "127.0.0.1"
PORT = 8765
MAX_BYTES = 1_000_000
DEFAULT_HISTORY = Path(__file__).parent / "data" / "station.sqlite3"


class Station:
    def __init__(self, mode, classifier=None, board=None, history=None):
        self.mode = mode
        self.classifier = classifier
        self.board = board
        self.history = history
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

        result = {
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
        if self.mode != "simulation" and self.history:
            try:
                self.history.record(result)
            except sqlite3.Error as exc:
                print(f"History write failed: {exc}", flush=True)
                result["history_saved"] = False
        return result

    @property
    def model_source(self):
        if self.classifier is None:
            return "simulation"
        return "network"


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
            elif self.path == "/hardware":
                if not station.board:
                    self.respond(200, {"ready": None})
                    return
                try:
                    station.board.check()
                except BoardError as exc:
                    self.respond(503, {"ready": False, "error": str(exc)})
                else:
                    self.respond(200, {"ready": True})
            elif self.path == "/history":
                if not station.history:
                    self.respond(200, {"summary": None, "events": []})
                    return
                try:
                    snapshot = station.history.snapshot()
                except sqlite3.Error as exc:
                    print(f"History read failed: {exc}", flush=True)
                    self.respond(503, {"error": "Istoricul local nu este disponibil."})
                else:
                    self.respond(200, snapshot)
            else:
                self.respond(404, {"error": "Unknown station endpoint."})

        def do_POST(self):
            if not self.allowed():
                return
            if self.path not in ("/scan", "/classify"):
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
                content_type = self.headers.get_content_type()
                if self.path == "/classify":
                    if not station.classifier:
                        self.respond(503, {"error": "Team model is unavailable."})
                        return
                    if content_type != "image/jpeg":
                        raise ValueError("Capture a JPEG from the camera.")
                    prediction = station.classifier.predict(data)
                    result = {"destination": prediction.destination, "score": prediction.score}
                else:
                    result = station.scan(content_type, data)
            except (ValueError, UnicodeError):
                self.respond(400, {"error": "Invalid scan input."})
            except TimeoutError:
                self.respond(408, {"error": "The scan upload timed out."})
            except ModelUnavailable:
                self.respond(502, {"error": "Modelul din rețea nu răspunde corect. Verifică IP-ul și endpointul."})
            except Exception as exc:
                print(f"Scan failed: {exc}", flush=True)
                self.respond(500, {"error": "Scan failed. See the station terminal."})
            else:
                self.respond(200, result)
            finally:
                station.lock.release()

    return Handler


def main():
    parser = argparse.ArgumentParser(description="Sortify bench demo service on 127.0.0.1.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--simulate", action="store_true", help="Preset results, no camera/model/ESP32.")
    mode.add_argument("--preview", action="store_true", help="Use the team model without moving hardware.")
    mode.add_argument("--esp", nargs="?", const=DEFAULT_ESP_URL, metavar="URL",
                      help="Run AI and send material to the ESP32 SoftAP.")
    parser.add_argument("--model-url", help="Team model endpoint accepting JPEG and returning label and score.")
    parser.add_argument("--threshold", type=float, default=0.75, help="Minimum class score to indicate.")
    parser.add_argument("--history", type=Path, default=DEFAULT_HISTORY, help="SQLite file for live scan history.")
    args = parser.parse_args()
    if not 0 < args.threshold <= 1:
        parser.error("--threshold must be greater than 0 and at most 1")

    if args.simulate:
        if args.model_url:
            parser.error("--model-url requires --preview or --esp")
        station = Station("simulation")
    else:
        if not args.model_url:
            parser.error("--preview and --esp require --model-url with the team model endpoint")
        try:
            classifier = HttpClassifier(args.model_url, args.threshold, os.getenv("SORTIFY_MODEL_TOKEN"))
            board = Board(args.esp) if args.esp else None
        except Exception as exc:
            parser.exit(1, f"Could not initialize the station: {exc}\n")
        try:
            history = History(args.history)
        except (OSError, sqlite3.Error) as exc:
            parser.exit(1, f"Could not initialize station history: {exc}\n")
        station = Station("bench" if board else "preview", classifier, board, history)

    try:
        with ThreadingHTTPServer((HOST, PORT), make_handler(station)) as server:
            print(f"Sortify station: {station.mode} on http://{HOST}:{PORT}", flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
