#!/usr/bin/env python3
"""Build the gallery from assets/photos/ (your originals):

  - assets/display/<name>.jpg  watermarked copy, long edge max 2400px (shown when a photo is opened)
  - assets/thumbs/<name>.jpg   watermarked 900px-wide copy (shown in the grid)
  - assets/photos.json         the gallery list, grouped into sections

Folders inside assets/photos/ become titled sections: Kuala_Lumpur/ -> "Kuala Lumpur".
Photos placed directly in assets/photos/ appear first, with no title.
Within a section the newest upload comes first. Sections are ordered by their newest
upload too, unless you list folders in assets/photos/order.txt (one per line, top to
bottom); listed folders come first in that order, the rest follow by newest upload.
A line can also set the title shown on the site:   Kuala_Lumpur = Kuala Lumpur (March 2026)
"Upload time" = the commit that first added the original file.
"""
import hashlib, json, subprocess, time
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFont, ImageOps

# ---- watermark settings (change these, push, and everything is rebuilt) ----
TEXT = "SUJITH K MANDALA"
SIZE = 0.020        # text height as a fraction of image width
SPACING = 0.28      # extra letter spacing, as a fraction of text height
X_POS = 0.64        # horizontal centre of the text, as a fraction of image width (0.5 = middle, higher = further right)
Y_POS = 0.70        # vertical centre of the text, as a fraction of image height (0 = top, 1 = bottom)
OPACITY = 0.15      # 0-1
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
    x = w * X_POS - total / 2
    margin = w * 0.02
    x = max(margin, min(x, w - total - margin))   # keep the text inside the photo
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
settings = f"{TEXT}|{SIZE}|{SPACING}|{X_POS}|{Y_POS}|{OPACITY}|{MAX_EDGE}|{THUMB_W}"
stamp = hashlib.sha1(settings.encode()).hexdigest()
stamp_file = DISPLAY / ".watermark"
rebuild_all = not stamp_file.exists() or stamp_file.read_text().strip() != stamp

files = []
if PHOTOS.exists():
    files = [p for p in PHOTOS.rglob("*")
             if p.is_file() and p.suffix.lower() in EXTS
             and not any(part.startswith(".") for part in p.relative_to(PHOTOS).parts)]

def section_of(p):
    rel = p.relative_to(PHOTOS)
    return rel.parts[0] if len(rel.parts) > 1 else ""

times = {f: added_time(f) for f in files}
groups = {}
for f in files:
    groups.setdefault(section_of(f), []).append(f)

keep = set()

def process(f):
    rel = f.relative_to(PHOTOS)
    disp = DISPLAY / rel.parent / (f.stem + ".jpg")
    thumb = THUMBS / rel.parent / (f.stem + ".jpg")
    key = (disp.relative_to(DISPLAY)).as_posix()
    if rebuild_all or not disp.exists() or not thumb.exists():
        try:
            disp.parent.mkdir(parents=True, exist_ok=True)
            thumb.parent.mkdir(parents=True, exist_ok=True)
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
            print(f"skipping {f}: {e}")
            return None
    keep.add(key)
    return {"src": quote(disp.as_posix()), "thumb": quote(thumb.as_posix())}

def title_of(folder):
    return " ".join(folder.replace("_", " ").split())

sections = []
for folder, members in groups.items():
    members.sort(key=lambda p: (-times[p], p.name.lower()))
    photos = [x for x in (process(f) for f in members) if x]
    if photos:
        sections.append({"folder": folder, "title": title_of(folder),
                         "newest": max(times[f] for f in members), "photos": photos})

# optional manual order and titles: assets/photos/order.txt
#   Kuala_Lumpur                              (just the order)
#   Kuala_Lumpur = Kuala Lumpur (March 2026)  (order + custom title)
def norm(name):
    return " ".join(name.replace("_", " ").split()).lower()

order, custom_titles = [], {}
order_file = PHOTOS / "order.txt"
if order_file.exists():
    for line in order_file.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        name, sep, title = line.partition("=")
        key = norm(name)
        if not key:
            continue
        order.append(key)
        if sep and title.strip():
            custom_titles[key] = " ".join(title.split())

def rank(sec):
    n = norm(sec["folder"])
    return order.index(n) if n in order else len(order)

for sec in sections:
    sec["title"] = custom_titles.get(norm(sec["folder"]), sec["title"])

# loose photos first, then listed folders in your order, then the rest by newest upload
sections.sort(key=lambda s: (s["folder"] != "", rank(s), -s["newest"], s["title"].lower()))

# remove outputs for photos that were deleted
for root in (DISPLAY, THUMBS):
    for p in root.rglob("*.jpg"):
        if p.relative_to(root).as_posix() not in keep:
            p.unlink()
    for d in sorted((d for d in root.rglob("*") if d.is_dir()), reverse=True):
        if not any(d.iterdir()):
            d.rmdir()

stamp_file.write_text(stamp + "\n")
out = {"sections": [{"title": s["title"], "photos": s["photos"]} for s in sections]}
Path("assets/photos.json").write_text(json.dumps(out, indent=2) + "\n")
print(f"{sum(len(s['photos']) for s in sections)} photos in {len(sections)} section(s)")