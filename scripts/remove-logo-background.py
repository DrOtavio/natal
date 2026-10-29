#!/usr/bin/env python3
"""Remove only the outside near-black background of the existing family logo.

Keeps the original faces, lettering, colors, interior dark details, and shape.
Requires: Pillow, numpy, opencv-python-headless.
"""
from pathlib import Path
import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
source = ROOT / "public/logo-natal-familia-oliveira.webp"
destination = ROOT / "public/logo-natal-familia-oliveira-transparente.webp"

rgb = np.asarray(Image.open(source).convert("RGB"), dtype=np.uint8)
height, width = rgb.shape[:2]

# Identify near-black pixels connected to the canvas border only.
# Black details *inside* the logo are deliberately retained.
dark = (rgb.max(axis=2) <= 26).astype(np.uint8)
_, connected = cv2.connectedComponents(dark, connectivity=8)
border_ids = np.unique(np.concatenate(
    [connected[0, :], connected[-1, :], connected[:, 0], connected[:, -1]]
))
border_ids = border_ids[border_ids != 0]
outside = np.isin(connected, border_ids)

alpha = (~outside).astype(np.uint8) * 255
# Feather less than one pixel to prevent a black fringe on the green hero.
alpha = cv2.GaussianBlur(alpha, (0, 0), sigmaX=0.75)
result = Image.fromarray(np.dstack([rgb, alpha]), mode="RGBA")
result.save(destination, format="WEBP", quality=94, method=6)

with Image.open(destination) as verify:
    assert verify.mode == "RGBA", "Output must preserve alpha"
    assert verify.getpixel((0, 0))[3] < 8, "Corner must be transparent"
    assert verify.getpixel((width // 2, height // 2))[3] > 245, "Logo must stay visible"
print(f"Transparent family logo created: {width}x{height}")
