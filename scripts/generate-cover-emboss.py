"""Generates public/brand/rise-crew-emblem-emboss.png, a blind-embossed RISE CREW symbol for the
cobalt passport cover: raised relief lit from the upper left (white highlight, deep shadow) with a
faint pressed fill. The silhouette comes from the official master, "RISE-CREW 로고/RISE CREW.pdf".

Requires: poppler (pdftocairo) and Pillow.
Run: python3 scripts/generate-cover-emboss.py ["path/to/RISE CREW.pdf"]
"""
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

SOURCE = Path(sys.argv[1] if len(sys.argv) > 1 else "RISE-CREW 로고/RISE CREW.pdf")
OUT = Path("public/brand/rise-crew-emblem-emboss.png")
HEIGHT = 480  # output height in px; the cover shows it at up to ~120 CSS px (4x density)
PAD = 24
SHADOW = (0, 30, 74)  # deep cobalt shade for the lower-right slopes

with tempfile.TemporaryDirectory() as tmp:
    # The symbol occupies x 419..1493, y 1385..2527 of the 4000-pt artboard; render it at 108 dpi.
    base = Path(tmp) / "symbol"
    subprocess.run(
        ["pdftocairo", "-png", "-r", "108", "-singlefile",
         "-x", "598", "-y", "2047", "-W", "1672", "-H", "1773", str(SOURCE), str(base)],
        check=True,
    )
    rendered = Image.open(f"{base}.png").convert("RGB")

# Silhouette: any inked pixel of the logo symbol.
mask = rendered.convert("L").point(lambda v: 255 if v < 215 else 0)
scale = HEIGHT / mask.height
mask = mask.resize((round(mask.width * scale), HEIGHT), Image.LANCZOS)
canvas = Image.new("L", (mask.width + PAD * 2, mask.height + PAD * 2), 0)
canvas.paste(mask, (PAD, PAD))
mask = canvas

height_map = mask.filter(ImageFilter.GaussianBlur(5))
upper_left = ImageChops.offset(height_map, 3, 3)    # value at p = height at p - (3, 3)
lower_right = ImageChops.offset(height_map, -3, -3)  # value at p = height at p + (3, 3)
highlight = ImageChops.subtract(lower_right, upper_left).point(lambda v: min(255, v * 4))
shadow = ImageChops.subtract(upper_left, lower_right).point(lambda v: min(255, v * 4))
pressed = mask.filter(ImageFilter.GaussianBlur(1)).point(lambda v: v * 22 // 255)

out = Image.new("RGBA", mask.size, (0, 0, 0, 0))
out.paste(Image.new("RGBA", mask.size, (255, 255, 255, 255)), (0, 0), pressed)
out.paste(Image.new("RGBA", mask.size, (*SHADOW, 255)), (0, 0), shadow.point(lambda v: v * 200 // 255))
out.paste(Image.new("RGBA", mask.size, (255, 255, 255, 255)), (0, 0), highlight.point(lambda v: v * 170 // 255))
OUT.parent.mkdir(parents=True, exist_ok=True)
out.save(OUT, optimize=True)
print(f"wrote {OUT} {out.size}")
