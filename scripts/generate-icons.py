from __future__ import annotations

import struct
import zlib
from pathlib import Path


def chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_png(path: Path, size: int) -> None:
    rows = bytearray()
    for y in range(size):
        rows.append(0)
        for x in range(size):
            margin = max(2, size // 12)
            inset = max(3, size // 5)
            inside = margin <= x < size - margin and margin <= y < size - margin
            bar = inset <= x < size - inset and (size // 3) <= y < (size // 3 + max(2, size // 8))
            stem = (size // 2 - max(1, size // 16)) <= x < (size // 2 + max(1, size // 16)) and inset <= y < size - inset
            if not inside:
                rows.extend((15, 23, 42))
            elif bar or stem:
                rows.extend((255, 255, 255))
            else:
                rows.extend((15, 118, 110))

    raw = bytes(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    icons = Path("icons")
    icons.mkdir(exist_ok=True)
    for size in (16, 48, 128):
        write_png(icons / f"icon{size}.png", size)


if __name__ == "__main__":
    main()
