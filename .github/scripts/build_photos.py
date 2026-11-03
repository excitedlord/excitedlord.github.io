#!/usr/bin/env python3
"""Scan assets/photos/, make thumbnails, and write assets/photos.json
with the newest upload first (by the commit that first added each file)."""
import json, subprocess, time
from pathlib import Path
from urllib.parse import quote

PHOTOS = Path("assets/photos")
THUMBS = Path("assets/thumbs")
EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"}

def added_time(path):
    out = subprocess.run(
        ["git", "log", "--diff-filter=A", "--format=%ct", "--", str(path)],
        capture_output=True, text=True).stdout.split()
    return int(out[-1]) if out else int(time.time())

def make_thumb(src):
    dst = THUMBS / (src.stem + ".jpg")
    if dst.exists():
        return dst
    THUMBS.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(
        ["convert", f"{src}[0]", "-auto-orient", "-resize", "900x>",
         "-quality", "80", str(dst)], capture_output=True)
    return dst if r.returncode == 0 and dst.exists() else None

files = [p for p in PHOTOS.iterdir() if p.suffix.lower() in EXTS] if PHOTOS.exists() else []
files.sort(key=lambda p: (-added_time(p), p.name.lower()))

items = []
for f in files:
    t = make_thumb(f)
    items.append({"src": quote(f.as_posix()), "thumb": quote(t.as_posix()) if t else quote(f.as_posix())})

Path("assets/photos.json").write_text(json.dumps(items, indent=2) + "\n")
print(f"{len(items)} photos listed")
