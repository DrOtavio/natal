#!/usr/bin/env python3
"""Create a WhatsApp preview using ONLY the original Oliveira family emblem.

No added text, new people, drawing, slogans, ornaments, or photo edits.
The existing transparent logo is placed unchanged (apart from resizing)
on a plain dark-green Open Graph canvas, which avoids an unwanted black box.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
original = ROOT / "public" / "logo-natal-familia-oliveira-transparente.webp"
destination = ROOT / "public" / "og-logo-familia-oliveira.png"

width, height = 1200, 630
canvas = Image.new("RGBA", (width, height), (8, 37, 25, 255))
logo = Image.open(original).convert("RGBA")
logo.thumbnail((614, 614), Image.Resampling.LANCZOS)
position = ((width - logo.width) // 2, (height - logo.height) // 2)
canvas.alpha_composite(logo, position)

canvas.convert("RGB").save(destination, "PNG", optimize=True)
with Image.open(destination) as check:
    assert check.size == (width, height)
    assert check.mode == "RGB"
    assert check.getpixel((0, 0)) == (8, 37, 25)
print(f"Only family logo in Open Graph image: {destination.name}")
