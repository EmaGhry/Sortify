from http.client import HTTPConnection, HTTPException
import json
from socket import create_connection
from urllib.parse import urlencode, urlsplit

from .model import DESTINATIONS


DEFAULT_ESP_URL = "http://192.168.4.1"
MATERIAL_ALIASES = {
    "sticla": "glass",
    "pet": "plastic",
    "pet/plastic": "plastic",
    "hartie": "paper",
    "carton": "paper",
    "hartie/carton": "paper",
    "altele": "other",
}


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
        try:
            with create_connection((self.host, self.port or 80), timeout=2):
                pass
        except OSError as exc:
            raise BoardError("Nu pot ajunge la ESP32. Verifică rețeaua Wi-Fi și adresa plăcii.") from exc

    def indicate(self, destination: str):
        if destination not in DESTINATIONS:
            raise ValueError("Invalid destination")
        if self._request("/sort?" + urlencode({"type": destination})) != {"material": destination}:
            raise BoardError("ESP32 did not confirm the requested material.")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Testeaza interactiv destinatiile ESP32, fara sarcina pe servo.")
    parser.add_argument("--url", default=DEFAULT_ESP_URL, help="ESP32 HTTP base URL")
    args = parser.parse_args()
    try:
        board = Board(args.url)
    except ValueError as exc:
        parser.exit(1, f"{exc}\n")

    choices = ", ".join(DESTINATIONS)
    print(f"Alege materialul ({choices}). Merg si sticla, PET, hartie, carton si altele.")
    print("Apasa Ctrl+C pentru oprire.")
    try:
        while True:
            command = input("Material > ").strip().casefold().translate(str.maketrans("ăâ", "aa"))
            command = command.replace(" ", "")
            if not command:
                continue
            destination = MATERIAL_ALIASES.get(command, command)
            if destination not in DESTINATIONS:
                print(f"Material necunoscut. Alege dintre {choices}.")
                continue
            try:
                board.indicate(destination)
            except BoardError as exc:
                print(f"Eroare ESP32: {exc}")
                continue
            print(f"ESP32 a confirmat {destination}. Verifica LED-ul si pozitia servo-ului.")
    except (KeyboardInterrupt, EOFError):
        print()


if __name__ == "__main__":
    main()
