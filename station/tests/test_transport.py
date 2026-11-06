import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import unittest
from urllib.request import Request, urlopen

from station.__main__ import HOST, PORT, Station, make_handler
from station.esp_link import Board, BoardError
from station.model import HttpClassifier, ModelUnavailable


class StationTransportTests(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.prediction = {"label": "paper", "score": 0.93}
        self.board_reply = None
        self.firmware_version = 2
        test = self

        class Peer(BaseHTTPRequestHandler):
            def log_message(self, *_args):
                pass

            def reply(self, data):
                self.send_response(200)
                self.end_headers()
                self.wfile.write(json.dumps(data).encode())

            def do_POST(self):
                body = self.rfile.read(int(self.headers["Content-Length"]))
                test.requests.append((self.path, self.headers.get("Content-Type"), body))
                self.reply(test.prediction)

            def do_GET(self):
                test.requests.append((self.path, self.headers.get("X-Sortify-Bench")))
                if self.path == "/health":
                    self.reply({"station": "sortify-bench", "version": test.firmware_version})
                    return
                material = self.path.rsplit("=", 1)[-1]
                self.reply(test.board_reply or {"material": material})

        server = ThreadingHTTPServer(("127.0.0.1", 0), Peer)
        thread = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01})
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(thread.join)
        self.addCleanup(server.shutdown)
        url = f"http://127.0.0.1:{server.server_port}"
        self.board = Board(url)
        self.station = Station("bench", HttpClassifier(url + "/predict", 0.75, None), self.board)

    def test_jpeg_goes_to_model_and_only_material_goes_to_board(self):
        result = self.station.scan("image/jpeg", b"frame")
        self.assertEqual(self.requests, [
            ("/predict", "image/jpeg", b"frame"),
            ("/sort?type=paper", "1"),
        ])
        self.assertEqual(result["hardware"], "acknowledged")
        self.assertEqual(result["model_source"], "network")

    def test_below_threshold_routes_to_other(self):
        self.prediction = {"label": "glass", "score": 0.4}
        result = self.station.scan("image/jpeg", b"frame")
        self.assertEqual(result["destination"], "other")
        self.assertEqual(result["hardware"], "acknowledged")
        self.assertEqual(self.requests[-1], ("/sort?type=other", "1"))

    def test_explicit_other_routes_to_its_compartment(self):
        self.prediction = {"label": "other", "score": 0.9}
        result = self.station.scan("image/jpeg", b"frame")
        self.assertEqual(result["destination"], "other")
        self.assertEqual(self.requests[-1], ("/sort?type=other", "1"))

    def test_old_firmware_cannot_acknowledge_other_as_a_destination(self):
        self.firmware_version = 1
        with self.assertRaisesRegex(BoardError, "firmware v2"):
            self.board.indicate("other")
        self.assertEqual(self.requests, [("/health", "1")])

    def test_model_error_does_not_trigger_hardware(self):
        self.prediction = {"label": "plastic", "score": "high"}
        with self.assertRaises(ModelUnavailable):
            self.station.scan("image/jpeg", b"frame")
        self.assertEqual(len(self.requests), 1)

    def test_wrong_acknowledgement_does_not_count_as_success(self):
        self.board_reply = {"material": "glass"}
        with self.assertRaises(BoardError):
            self.board.indicate("metal")
        result = self.station.scan("image/jpeg", b"frame")
        self.assertEqual(result["hardware"], "unconfirmed")

    def test_simulation_has_no_hardware(self):
        result = Station("simulation").scan("application/json", b'{"destination":"plastic"}')
        self.assertEqual(result["hardware"], "disabled")
        self.assertEqual(result["model_source"], "simulation")
        self.assertEqual(self.requests, [])

    def test_read_only_scanner_never_commands_board(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), make_handler(self.station))
        thread = Thread(target=server.serve_forever, kwargs={"poll_interval": 0.01})
        thread.start()
        self.addCleanup(server.server_close)
        self.addCleanup(thread.join)
        self.addCleanup(server.shutdown)
        request = Request(
            f"http://127.0.0.1:{server.server_port}/classify",
            data=b"frame",
            headers={"Host": f"{HOST}:{PORT}", "Content-Type": "image/jpeg", "X-Sortify-Bench": "1"},
        )
        with urlopen(request, timeout=2) as response:
            self.assertEqual(json.load(response), {"destination": "paper", "score": 0.93})
        self.assertEqual(self.requests, [("/predict", "image/jpeg", b"frame")])

    def test_model_label_outside_the_five_categories_is_rejected(self):
        self.prediction = {"label": "cardboard", "score": 0.93}
        with self.assertRaises(ModelUnavailable):
            self.station.scan("image/jpeg", b"frame")
        self.assertEqual(len(self.requests), 1)
