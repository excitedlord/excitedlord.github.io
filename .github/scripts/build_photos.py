#!/usr/bin/env python3
"""Build the gallery from assets/photos/ (your originals):

  - assets/display/<name>.jpg  watermarked copy, long edge max 2400px (shown when a photo is opened)
  - assets/thumbs/<name>.jpg   watermarked 900px-wide copy (shown in the grid)
  - assets/photos.json         list of the above, newest upload first

"Upload time" = the commit that first added the original file.
"""
import hashlib, json, subprocess, time
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFont, ImageOps

# ---- watermark settings (change these, push, and everything is rebuilt) ----
TEXT = "SUJITH K MANDALA"
SIZE = 0.030        # text height as a fraction of image width
SPACING = 0.28      # extra letter spacing, as a fraction of text height
Y_POS = 0.70        # vertical centre of the text, as a fraction of image height (0 = top, 1 = bottom)
OPACITY = 0.62      # 0-1
# -----------------------------------------------------------------------------

PHOTOS = Path("assets/photos")
DISPLAY = Path("assets/display")
THUMBS = Path("assets/thumbs")
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}
MAX_EDGE = 2400
THUMB_W = 900
FONTS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
]

def load_font(px):
    for f in FONTS:
        try:
            return ImageFont.truetype(f, px)
        except OSError:
            pass
    return ImageFont.load_default(px)

def watermark(im):
    w, h = im.size
    px = max(12, round(w * SIZE))
    font = load_font(px)
    gap = px * SPACING
    widths = [font.getlength(c) for c in TEXT]
    total = sum(widths) + gap * (len(TEXT) - 1)
    x = (w - total) / 2
    y = h * Y_POS - px / 2
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    shadow = max(1, round(px * 0.06))
    cx = x
    for ch, cw in zip(TEXT, widths):
        d.text((cx + shadow, y + shadow), ch, font=font, fill=(0, 0, 0, round(255 * OPACITY * 0.55)))
        d.text((cx, y), ch, font=font, fill=(255, 255, 255, round(255 * OPACITY)))
        cx += cw + gap
    return Image.alpha_composite(im.convert("RGBA"), layer).convert("RGB")

def added_time(path):
    out = subprocess.run(
        ["git", "log", "--diff-filter=A", "--format=%ct", "--", str(path)],
        capture_output=True, text=True).stdout.split()
    return int(out[-1]) if out else int(time.time())

DISPLAY.mkdir(parents=True, exist_ok=True)
THUMBS.mkdir(parents=True, exist_ok=True)

# Rebuild everything if the watermark settings changed
settings = f"{TEXT}|{SIZE}|{SPACING}|{Y_POS}|{OPACITY}|{MAX_EDGE}|{THUMB_W}"
stamp = hashlib.sha1(settings.encode()).hexdigest()
stamp_file = DISPLAY / ".watermark"
rebuild_all = not stamp_file.exists() or stamp_file.read_text().strip() != stamp

files = [p for p in PHOTOS.iterdir() if p.suffix.lower() in EXTS] if PHOTOS.exists() else []
files.sort(key=lambda p: (-added_time(p), p.name.lower()))

items, keep = [], set()
for f in files:
    disp, thumb = DISPLAY / (f.stem + ".jpg"), THUMBS / (f.stem + ".jpg")
    keep.add(disp.name)
    if rebuild_all or not disp.exists() or not thumb.exists():
        try:
            im = ImageOps.exif_transpose(Image.open(f))
            if getattr(im, "n_frames", 1) > 1:
                im.seek(0)
            if im.mode in ("RGBA", "LA", "P"):
                im = im.convert("RGBA")
                bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
                im = Image.alpha_composite(bg, im)
            im = im.convert("RGB")
            im.thumbnail((MAX_EDGE, MAX_EDGE), Image.LANCZOS)
            im = watermark(im)
            im.save(disp, "JPEG", quality=86, optimize=True, progressive=True)
            t = im.copy()
            t.thumbnail((THUMB_W, THUMB_W * 4), Image.LANCZOS)
            t.save(thumb, "JPEG", quality=80, optimize=True, progressive=True)
        except Exception as e:
            print(f"skipping {f.name}: {e}")
            keep.discard(disp.name)
            continue
    items.append({"src": quote(disp.as_posix()), "thumb": quote(thumb.as_posix())})

# remove outputs for photos that were deleted
for folder in (DISPLAY, THUMBS):
    for p in folder.glob("*.jpg"):
        if p.name not in keep:
            p.unlink()

stamp_file.write_text(stamp + "\n")
Path("assets/photos.json").write_text(json.dumps(items, indent=2) + "\n")
print(f"{len(items)} photos listed")
