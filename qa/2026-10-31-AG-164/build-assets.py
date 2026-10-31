# qa/2026-10-31-AG-164/build-assets.py
# Generates contact sheet (sheet.jpg), reference cards, and comparison assets.

import os
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
QA_DIR = os.path.join(ROOT, "qa", "2026-10-31-AG-164")
SHOTS_DIR = os.path.join(QA_DIR, "shots")
REF_DIR = os.path.join(QA_DIR, "references")
MANIFEST_PATH = os.path.join(QA_DIR, "shots-manifest.json")

os.makedirs(REF_DIR, exist_ok=True)

BASE_WEAPONS = [
    ("minigun", "Minigun"),
    ("m4", "GW-4 Carbine (M4)"),
    ("ak", "AK Assault Rifle"),
    ("pistol", "M9 Service Pistol"),
    ("uzi", "Wasp SMG (Uzi)"),
    ("shotgun", "Pump Shotgun"),
    ("aa12", "Breacher-12 (AA-12)"),
    ("revolver", "Magnum Revolver"),
    ("sniper", "Sniper Rifle"),
    ("launcher", "Grenade Launcher"),
    ("flamer", "Flamethrower"),
    ("chainsaw", "Chainsaw"),
]

AKIMBO_WEAPONS = [
    ("pistol-akimbo", "Akimbo Pistols"),
    ("uzi-akimbo", "Akimbo Wasps"),
    ("revolver-akimbo", "Akimbo Revolvers"),
]

ALL_WEAPONS = BASE_WEAPONS + AKIMBO_WEAPONS
STATES = [
    ("fp-hip", "1. FP Hip"),
    ("fp-aim", "2. FP Aim (ADS)"),
    ("fp-reload", "3. FP Mid-Reload"),
    ("tp", "4. Third Person"),
]

def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def create_reference_cards():
    """Generates shipped shooter visual reference specification cards."""
    print("Generating reference comparison assets...")

    ref_categories = [
        {
            "id": "ref-rifles",
            "title": "Reference Baseline: Assault Rifles (M4 / AK)",
            "benchmark": "Call of Duty: Modern Warfare / CS2 / Battlefield",
            "bullets": [
                "Placement: Lower-right quadrant (NDC X: 0.25 to 0.65, Y: -0.75 to -0.15). Gun tilts 6-8 deg inward.",
                "Hands: Left support hand wraps handguard (C-clamp or base cup). Right hand wraps pistol grip; trigger finger indexed.",
                "Wrists: Straight forearm-to-wrist angle (15 deg natural tilt); NO extreme 90 deg breaks or detached floating cuffs.",
                "ADS / FOV: Rear sight aperture and front post perfectly centered (NDC 0,0). Eye relief prevents receiver clipping.",
                "Reload: Magazine pulled downward in view space; fresh mag inserted with palm slap on bolt release. Nothing clips camera."
            ]
        },
        {
            "id": "ref-sidearms",
            "title": "Reference Baseline: Sidearms & SMGs (Pistol / Revolver / Wasp)",
            "benchmark": "Call of Duty / CS2 / Left 4 Dead",
            "bullets": [
                "Placement: Center-right low ready; compact profile leaving center screen open for crosshairs.",
                "Hands: Modern thumbs-forward two-handed combat grip. Support palm fills grip panel; thumbs index forward.",
                "Wrists: Locked isometric triangle between shoulders and gun; wrists rigid and aligned with recoil axis.",
                "ADS / Sights: 3-dot combat sights aligned on horizontal center. Revolver hammer cocked back or clear of sight channel (J13).",
                "Reload: Slide locks back; mag ejected; fresh mag inserted into magwell without clipping player camera (J5)."
            ]
        },
        {
            "id": "ref-shotguns",
            "title": "Reference Baseline: Shotguns (Pump Shotgun / Breacher-12 AA-12)",
            "benchmark": "Killing Floor 2 / MW2 AA-12 / Left 4 Dead",
            "bullets": [
                "Placement: Sturdy lower-right placement; massive receiver kept below lower third horizon line.",
                "Hands: Support hand on pump slide (pump) or lower foregrip (AA-12); right hand on contoured pistol grip.",
                "Wrists: Absorptive combat bend; wrists absorb vertical impulse without shaking entire screen uncontrollably (J20).",
                "ADS: Elevated bead or top rail ghost-ring sight centered; clean sight picture without obstructive top geometry.",
                "Reload: Individual shell insertion into loading gate (pump) or heavy drum rocking cleanly into well (AA-12)."
            ]
        },
        {
            "id": "ref-heavy",
            "title": "Reference Baseline: Heavy Weapons (Minigun / Launcher / Flamer)",
            "benchmark": "Team Fortress 2 / Doom / Killing Floor 2",
            "bullets": [
                "Placement: Minigun underslung low-center; Launcher shoulder-tucked; Flamer twin-grip wand in lower-right.",
                "Hands: Dual spade handles or carry bar gripped firmly; both hands fully snapped to authored sockets (J18).",
                "Wrists: Forearms aligned with heavy carry frame; natural tension lines in gloves.",
                "Sights & Arc: Launcher features leaf/ladder sight for trajectory arc (J16); Minigun features stable braced hip stance.",
                "Handling: Smooth recoil impulse; flamer does not produce violent disorienting screen shakes (J19)."
            ]
        },
        {
            "id": "ref-akimbo",
            "title": "Reference Baseline: Akimbo / Dual Wield (Pistols / Wasps / Revolvers)",
            "benchmark": "MW2 Dual Pistols / CS2 Dual Berettas / Halo 2",
            "bullets": [
                "Placement: Symmetrical framing in lower left and lower right quadrants, converging inward toward central reticle (J6).",
                "Hands: Full twin hand models visible at all pitch angles; guns remain securely locked in hands when pitching down (J6).",
                "Wrists: Symmetrical combat cant (10-15 deg inward); both wrists visible and grounded to forearm geometry.",
                "Aim / Zoom: Dual weapons brace slightly inward; dedicated dual-wield contracted crosshair replaces single dot (J6).",
                "Reload: Synchronized or alternating magazine swap in view space; magazines track clean authored reload arcs."
            ]
        }
    ]

    for card in ref_categories:
        W, H = 1200, 675
        img = Image.new("RGB", (W, H), (18, 22, 28))
        draw = ImageDraw.Draw(img)

        # Header background
        draw.rectangle([(0, 0), (W, 90)], fill=(28, 36, 48))
        draw.line([(0, 90), (W, 90)], fill=(64, 150, 255), width=3)

        title_font = get_font(28)
        sub_font = get_font(18)
        body_font = get_font(20)
        footer_font = get_font(16)

        draw.text((30, 20), card["title"], font=title_font, fill=(245, 245, 250))
        draw.text((30, 56), f"Benchmark Standard: {card['benchmark']}", font=sub_font, fill=(130, 190, 255))

        y = 125
        for b in card["bullets"]:
            key, val = b.split(":", 1)
            draw.ellipse([(35, y + 6), (47, y + 18)], fill=(64, 150, 255))
            draw.text((60, y), key + ":", font=body_font, fill=(255, 210, 74))
            
            # Wrap text if long
            wrapped_text = val.strip()
            draw.text((260, y), wrapped_text, font=body_font, fill=(230, 235, 240))
            y += 85

        # Footer notes
        draw.rectangle([(0, H - 60), (W, H)], fill=(24, 28, 36))
        draw.line([(0, H - 60), (W, H - 60)], fill=(45, 55, 70), width=1)
        draw.text((30, H - 42), "Grave Shift 1.2 Baseline Standards (D-89 / D-101 / Jerry J3-J25) -> Authored for CL-281 Viewmodel Revamp", font=footer_font, fill=(160, 175, 195))

        out_path = os.path.join(REF_DIR, f"{card['id']}.png")
        img.save(out_path, "PNG")
        print(f"  Reference card saved: {out_path}")

def build_contact_sheet():
    """Builds the comprehensive 60-image contact sheet (sheet.jpg)."""
    print("Building 60-image contact sheet (sheet.jpg)...")
    tile_w = 400
    tile_h = 225
    header_h = 50
    row_label_w = 180

    cols = len(STATES) # 4
    rows = len(ALL_WEAPONS) # 15

    total_w = row_label_w + cols * tile_w
    total_h = header_h + rows * tile_h

    sheet = Image.new("RGB", (total_w, total_h), (12, 14, 18))
    draw = ImageDraw.Draw(sheet)

    title_font = get_font(20)
    label_font = get_font(16)
    tile_font = get_font(13)

    # Draw Column Headers
    draw.rectangle([(0, 0), (total_w, header_h)], fill=(22, 28, 36))
    draw.line([(0, header_h), (total_w, header_h)], fill=(64, 150, 255), width=2)
    draw.text((15, 14), "WEAPON / LOADOUT", font=title_font, fill=(160, 180, 210))

    for c_idx, (_, col_name) in enumerate(STATES):
        cx = row_label_w + c_idx * tile_w
        draw.line([(cx, 0), (cx, total_h)], fill=(35, 42, 54), width=1)
        draw.text((cx + 15, 14), col_name, font=title_font, fill=(255, 215, 80))

    # Draw Each Row
    for r_idx, (w_key, w_name) in enumerate(ALL_WEAPONS):
        ry = header_h + r_idx * tile_h
        # Row separator line
        draw.line([(0, ry), (total_w, ry)], fill=(35, 42, 54), width=1)
        
        # Row label background
        draw.rectangle([(0, ry), (row_label_w, ry + tile_h)], fill=(18, 22, 28) if r_idx % 2 == 0 else (15, 18, 24))
        draw.text((15, ry + tile_h // 2 - 12), w_name, font=label_font, fill=(235, 240, 245))

        for c_idx, (s_key, _) in enumerate(STATES):
            cx = row_label_w + c_idx * tile_w
            shot_filename = f"{w_key}-{s_key}.png"
            shot_path = os.path.join(SHOTS_DIR, shot_filename)

            if os.path.exists(shot_path):
                try:
                    with Image.open(shot_path) as tile_img:
                        tile_resized = tile_img.resize((tile_w, tile_h), Image.Resampling.LANCZOS)
                        sheet.paste(tile_resized, (cx, ry))
                except Exception as e:
                    draw.rectangle([(cx, ry), (cx + tile_w, ry + tile_h)], fill=(60, 20, 20))
                    draw.text((cx + 10, ry + 10), f"ERR: {e}", font=tile_font, fill=(255, 100, 100))
            else:
                draw.rectangle([(cx, ry), (cx + tile_w, ry + tile_h)], fill=(30, 30, 30))
                draw.text((cx + 10, ry + 10), "MISSING", font=tile_font, fill=(255, 80, 80))

            # Tile border
            draw.rectangle([(cx, ry), (cx + tile_w, ry + tile_h)], outline=(25, 30, 40), width=1)
            # Caption badge
            badge_h = 22
            draw.rectangle([(cx, ry + tile_h - badge_h), (cx + tile_w, ry + tile_h)], fill=(0, 0, 0, 190))
            draw.text((cx + 8, ry + tile_h - badge_h + 3), f"{w_name} [{s_key}]", font=tile_font, fill=(220, 225, 230))

    out_sheet_path = os.path.join(QA_DIR, "sheet.jpg")
    sheet.save(out_sheet_path, "JPEG", quality=88)
    print(f"Contact sheet saved: {out_sheet_path} ({os.path.getsize(out_sheet_path):,} bytes, {total_w}x{total_h})")

if __name__ == "__main__":
    create_reference_cards()
    build_contact_sheet()
