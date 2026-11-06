from pathlib import Path
from tempfile import TemporaryDirectory
from unittest import TestCase
from unittest.mock import Mock

from station.__main__ import Station
from station.history import History
from station.model import Prediction


class HistoryTests(TestCase):
    def test_live_results_survive_restart_and_simulation_is_excluded(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "station.sqlite3"
            history = History(path)
            classifier = Mock()
            classifier.predict.return_value = Prediction("metal", "metal", 0.96)
            Station("preview", classifier, history=history).scan("image/jpeg", b"frame")
            Station("simulation", history=history).scan("application/json", b'{"destination":"plastic"}')
            snapshot = History(path).snapshot()
            self.assertEqual(snapshot["summary"]["total"], 1)
            self.assertEqual(snapshot["summary"]["previews"], 1)
            self.assertEqual(snapshot["events"][0]["destination"], "metal")
            self.assertEqual(snapshot["events"][0]["hardware"], "disabled")
