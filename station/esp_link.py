from http.client import HTTPConnection, HTTPException
import json
from urllib.parse import urlencode, urlsplit

from .model import DESTINATIONS


DEFAULT_ESP_URL = "http://192.168.4.1"


class BoardError(RuntimeError):
    pass


class Board:
    def __init__(self, url: str):
        address = urlsplit(url)
        if (
            address.scheme != "http" or not address.hostname or address.username is not None
            or address.path not in ("", "/") or address.query or address.fragment
        ):
            raise ValueError("Use the ESP32 HTTP base URL, for example http://192.168.4.1.")
        self.host = address.hostname
        self.port = address.port

    def _request(self, path):
        connection = HTTPConnection(self.host, self.port, timeout=2)
        try:
            connection.request("GET", path, headers={"X-Sortify-Bench": "1", "Cache-Control": "no-store"})
            response = connection.getresponse()
            data = response.read(1025)
            if response.status != 200 or len(data) > 1024:
                raise BoardError(f"ESP32 rejected the request (HTTP {response.status}).")
            return json.loads(data)
        except (OSError, HTTPException, ValueError) as exc:
            raise BoardError("No valid ESP32 response. Check the Wi-Fi and verify the pointer before retrying.") from exc
        finally:
            connection.close()

    def check(self):
        if self._request("/health") != {"station": "sortify-bench", "version": 1}:
            raise BoardError("The device did not report the expected Sortify firmware.")

    def indicate(self, destination: str):
        if destination not in DESTINATIONS:
            raise ValueError("Invalid destination")
        material = "other" if destination == "reject" else destination
        if self._request("/sort?" + urlencode({"type": material})) != {"material": material}:
            raise BoardError("ESP32 did not confirm the requested material.")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Confirm each ESP32 destination with the servo unloaded.")
    parser.add_argument("--url", default=DEFAULT_ESP_URL, help="ESP32 HTTP base URL")
    args = parser.parse_args()
    try:
        board = Board(args.url)
        board.check()
        for destination in DESTINATIONS:
            input(f"Press Enter to indicate {destination} (Ctrl+C to stop): ")
            board.indicate(destination)
            print(f"ESP32 acknowledged {destination}. Check the LED and pointer visually.")
    except (ValueError, BoardError) as exc:
        parser.exit(1, f"{exc}\n")
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
