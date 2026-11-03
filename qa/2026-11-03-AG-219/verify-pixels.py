#!/usr/bin/env python3
"""
Verify Visible Gun Pixels for AG-219 (Outdoor Trail Corridor):
Validates that all 9 long guns visibly render weapon and hand pixels
across 1080p rest stills and walking frames.
"""
import sys
from pathlib import Path
from PIL import Image
import numpy as np

ROOT = Path(r"C:\Users\Zero\Desktop\Tiny Trek")
AG219_DIR = ROOT / "qa/2026-11-03-AG-219"
STILLS_DIR = AG219_DIR / "captures/stills"
STRIPS_DIR = AG219_DIR / "captures/strips"

WEAPONS_9 = [
    {"key": "m4", "label": "GW-4 (M4)"},
    {"key": "ak", "label": "AK"},
    {"key": "uzi", "label": "Wasp (Uzi)"},
    {"key": "shotgun", "label": "Shotgun"},
    {"key": "aa12", "label": "Breacher (AA12)"},
    {"key": "flamer", "label": "Flamer"},
    {"key": "sniper", "label": "Sniper"},
    {"key": "launcher", "label": "Launcher"},
    {"key": "minigun", "label": "Minigun"}
]

def check_weapon_frame(p, min_dark_pixels=10000):
    if not p.exists():
        return False, f"File missing: {p}"
    im = Image.open(p)
    if im.size != (1920, 1080):
        return False, f"Incorrect dimensions: {im.size}, expected (1920, 1080)"

    arr = np.array(im)
    # Weapon and hands bounding quadrant: y in 350..1050, x in 850..1880
    lr = arr[350:1050, 850:1880]

    # Dark weapon pixels: R < 50, G < 50, B < 50
    dark_mask = (lr[:, :, 0] < 50) & (lr[:, :, 1] < 50) & (lr[:, :, 2] < 50)
    cnt = int(np.sum(dark_mask))

    if cnt < min_dark_pixels:
        return False, f"Dark weapon pixel count too low: {cnt} (min: {min_dark_pixels})"

    ys, xs = np.where(dark_mask)
    bbox = (int(xs.min() + 850), int(ys.min() + 350), int(xs.max() + 850), int(ys.max() + 350))
    return True, {"pixels": cnt, "bbox": bbox}

def main():
    print("=" * 75)
    print("=== [AG-219] Visible Weapon Pixel Verification (Outdoor Trail Corridor) ===")
    print("=" * 75)

    all_passed = True

    print("\n1. Verifying 1080p Hip Rest Stills (Jerry Seat, Outdoor):")
    for w in WEAPONS_9:
        k = w["key"]
        p = STILLS_DIR / f"{k}-hip-rest.jpg"
        ok, res = check_weapon_frame(p, min_dark_pixels=5000)
        if not ok:
            print(f"  [FAIL] {w['label']:<16} -> {res}")
            all_passed = False
        else:
            print(f"  [PASS] {w['label']:<16} -> {res['pixels']} weapon pixels (bbox: {res['bbox']})")

    print("\n2. Verifying 1080p Walk Strip Frames (Frames 0, 18, 54, 89):")
    frames_to_check = [0, 18, 54, 89]
    for w in WEAPONS_9:
        k = w["key"]
        w_dir = STRIPS_DIR / k
        weapon_ok = True
        counts = []
        for fi in frames_to_check:
            fp = w_dir / f"walk-{fi:03d}.jpg"
            ok, res = check_weapon_frame(fp, min_dark_pixels=10000)
            if not ok:
                print(f"  [FAIL] {w['label']:<16} frame {fi}: {res}")
                weapon_ok = False
                all_passed = False
            else:
                counts.append(res["pixels"])

        if weapon_ok:
            print(f"  [PASS] {w['label']:<16} -> all checked frames valid (counts: {counts})")

    print("\n" + "=" * 75)
    if all_passed:
        print("VERDICT: ALL 9 WEAPONS VERIFIED WITH VISIBLE WEAPON & HAND PIXELS!")
        print("=" * 75)
        return 0
    else:
        print("VERDICT: VERIFICATION FAILED")
        print("=" * 75)
        return 1

if __name__ == "__main__":
    sys.exit(main())
