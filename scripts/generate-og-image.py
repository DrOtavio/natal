#!/usr/bin/env python3
"""Create a 1200x630 PNG Open Graph preview with the existing family artwork.

No generated faces or third-party assets: uses our published transparent emblem.
The public image contains no participant names, links or secret tokens.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
original = ROOT / "public" / "logo-natal-familia-oliveira-transparente.webp"
destination = ROOT / "public" / "og-natal-oliveira.png"

W, H = 1200, 630
y, x = np.mgrid[0:H, 0:W]
# Midnight emerald background with ruby and warm-gold ambient light.
v = x / float(W)
rgb = np.empty((H, W, 3), dtype=np.float32)
rgb[:, :, 0] = 6 + 10 * v
rgb[:, :, 1] = 32 + 11 * (1-v)
rgb[:, :, 2] = 23 + 1 * v
for cx, cy, radius, color, strength in [
    (235, 275, 380, (28, 164, 96), 0.33),
    (1060, 110, 420, (121, 22, 45), 0.40),
    (850, 560, 460, (208, 133, 37), 0.13),
]:
    distance = ((x - cx)**2 + (y - cy)**2)/(radius**2)
    alpha = np.exp(-2.4 * distance)[..., None] * strength
    rgb = rgb * (1-alpha) + np.array(color, dtype=np.float32) * alpha
background = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), "RGB").convert("RGBA")

# Gentle golden aura behind logo — composited with the original transparent edges.
glow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
g = ImageDraw.Draw(glow)
g.ellipse((100, 74, 560, 566), fill=(228, 174, 64, 100))
glow = glow.filter(ImageFilter.GaussianBlur(70))
background = Image.alpha_composite(background, glow)

logo = Image.open(original).convert("RGBA")
logo.thumbnail((515, 515), Image.Resampling.LANCZOS)
lx, ly = 55 + (515-logo.width)//2, 58 + (515-logo.height)//2
shadow = Image.new("RGBA", (W, H), (0,0,0,0))
shadow.paste((0, 0, 0, 175), (lx+10, ly+15, lx+logo.width+10, ly+logo.height+15), logo.getchannel('A'))
shadow = shadow.filter(ImageFilter.GaussianBlur(18))
background = Image.alpha_composite(background, shadow)
background.alpha_composite(logo, (lx, ly))

fontpath = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
boldpath = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font_small = ImageFont.truetype(boldpath, 23)
font_large = ImageFont.truetype(boldpath, 59)
font_desc = ImageFont.truetype(fontpath, 27)
d = ImageDraw.Draw(background)
# Fine line connects the scene with the family title.
d.rounded_rectangle((625, 109, 704, 113), radius=2, fill=(248, 199, 89, 235))
d.text((625, 146), "NATAL DA", font=font_small, fill=(247, 218, 151, 255), stroke_width=0)
d.text((618, 214), "FAMÍLIA", font=font_large, fill=(255, 249, 229, 255), stroke_width=0)
d.text((618, 292), "OLIVEIRA", font=font_large, fill=(246, 195, 82, 255), stroke_width=0)
d.rounded_rectangle((624, 397, 1065, 399), radius=1, fill=(226, 179, 86, 125))
d.text((625, 438), "Seu amigo secreto", font=font_desc, fill=(237, 242, 228, 255))
d.text((625, 478), "espera por você!", font=font_desc, fill=(237, 242, 228, 255))

# Subtle sparkles away from faces and text.
for px, py, r in [(1106, 64, 5), (1154, 145, 3), (592, 66, 3), (1112, 556, 3), (593, 582, 3)]:
    d.ellipse((px-r,py-r,px+r,py+r), fill=(249,211,127,210))
    d.line((px-3*r,py,px+3*r,py), fill=(249,211,127,110), width=2)
    d.line((px,py-3*r,px,py+3*r), fill=(249,211,127,110), width=2)

background.convert("RGB").save(destination, "PNG", optimize=True)
with Image.open(destination) as check:
    assert check.size == (1200, 630) and check.mode == "RGB"
print(f"Created OG image: {destination.name}, {destination.stat().st_size} bytes")
