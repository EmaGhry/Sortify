import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
import unittest

from station.__main__ import Station
from station.esp_link import Board, BoardError
from station.model import HttpClassifier, ModelUnavailable


class StationTransportTests(unittest.TestCase):
    def setUp(self):
        self.requests = []
        self.prediction = {"label": "cardboard", "score": 0.93}
        self.board_reply = None
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

    def test_below_threshold_uses_white_led_command(self):
        self.prediction = {"label": "glass", "score": 0.4}
        result = self.station.scan("image/jpeg", b"frame")
        self.assertEqual(result["destination"], "reject")
        self.assertEqual(self.requests[-1], ("/sort?type=other", "1"))

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
