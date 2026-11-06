"""Download the pinned external demo model to the ignored models directory."""

from hashlib import sha256
from urllib.request import urlopen

from .model import DEFAULT_MODEL


REVISION = "a30c36c6b181ac0d2eb387bbd4f6d4a5b88ee078"
URL = f"https://huggingface.co/SriramRokkam/wastewise-garbage-cls/resolve/{REVISION}/wastewise-yolo.onnx"
CHECKSUM = "2b46d491091dbc0ed98a0f1eaee7fe5739c8fd3eb5bd5935396c3b2712e1f7a6"
SIZE = 5_809_886


def main():
    if DEFAULT_MODEL.is_file() and sha256(DEFAULT_MODEL.read_bytes()).hexdigest() == CHECKSUM:
        print(f"Model verified: {DEFAULT_MODEL}")
        return

    with urlopen(URL, timeout=30) as response:
        model = response.read(SIZE + 1)
    if len(model) != SIZE or sha256(model).hexdigest() != CHECKSUM:
        raise SystemExit("Unexpected model checksum. No model file was written.")
    DEFAULT_MODEL.parent.mkdir(parents=True, exist_ok=True)
    temporary = DEFAULT_MODEL.with_suffix(".download")
    temporary.write_bytes(model)
    temporary.replace(DEFAULT_MODEL)
    print(f"Model downloaded and verified: {DEFAULT_MODEL}")


if __name__ == "__main__":
    main()
