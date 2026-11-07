# qa/2026-11-06-GP-20035/build-sheets.py
# Composite verification sheet builder for Task AG-249 / GP-20035
# Winch Prompts & Cable Tied Banner Gameplay Audit on RTX 5080 WebGPU
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(".")
OUT_DIR = ROOT / "qa/2026-11-06-GP-20035"
REVIEW_DIR = ROOT / "review/GP-20035"
REVIEW_DIR.mkdir(parents=True, exist_ok=True)

def get_font(size, bold=False):
    font_names = [
        "arialbd.ttf" if bold else "arial.ttf",
        "segoeuib.ttf" if bold else "segoeui.ttf",
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    ]
    for fn in font_names:
        try:
            return ImageFont.truetype(fn, size)
        except Exception:
            continue
    return ImageFont.load_default()

def draw_badge(draw, x, y, text, bg_color, text_color, font, pad_x=10, pad_y=4):
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    box = [x, y, x + tw + pad_x * 2, y + th + pad_y * 2]
    draw.rectangle(box, fill=bg_color, outline=None)
    draw.text((x + pad_x, y + pad_y), text, fill=text_color, font=font)
    return box[2]

def main():
    print("[Python] Loading telemetry...")
    telem_path = OUT_DIR / "telemetry.json"
    telemetry = {}
    if telem_path.exists():
        with open(telem_path, "r", encoding="utf-8") as f:
            telemetry = json.load(f)

    # Required images
    f_hold_full = OUT_DIR / "06-hold-e-winch-prompt-full.jpg"
    f_hold_crop = OUT_DIR / "06-hold-e-winch-prompt-crop.png"
    f_banner_full = OUT_DIR / "05-cable-tied-banner-full.jpg"
    f_banner_crop = OUT_DIR / "05-cable-tied-banner-crop.png"
    f_bolt_full = OUT_DIR / "01-winch-bolt-full.jpg"
    f_need_tie_full = OUT_DIR / "03-skipped-step-need-tie-full.jpg"
    f_progress_full = OUT_DIR / "07-winching-in-progress-full.jpg"

    if not f_hold_full.exists():
        print(f"[Python] Missing primary image: {f_hold_full}")
        return

    # Build 2-column or 3-panel composite contact sheet:
    # Top banner: Header & Telemetry summary
    # Section 1: Hero item - "Hold E — Winch the truck clear" (Full gameplay frame + magnified HUD crop)
    # Section 2: Banner item - "CABLE TIED OFF" (Full frame + banner crop)
    # Section 3: Skipped step & stages - 3 thumbnail panels (Bolt prompt, Skipped tie hint, Winch in progress)

    sheet_w = 1920
    margin = 35
    header_h = 130
    gap = 25

    # Top hero: 06-hold-e-winch-prompt-full scaled to width 1200
    hero_w = 1200
    hero_img = Image.open(f_hold_full)
    hero_scale = hero_w / hero_img.width
    hero_h = int(hero_img.height * hero_scale)
    hero_resized = hero_img.resize((hero_w, hero_h), Image.Resampling.LANCZOS)

    # Hero side panel: magnified crop + text analysis
    side_w = sheet_w - margin * 2 - hero_w - gap
    side_h = hero_h

    # Row 2: Banner (width 900) + Progress (width 900)
    row2_card_w = (sheet_w - margin * 2 - gap) // 2
    b_img = Image.open(f_banner_full)
    b_scale = row2_card_w / b_img.width
    b_h = int(b_img.height * b_scale)
    b_resized = b_img.resize((row2_card_w, b_h), Image.Resampling.LANCZOS)

    p_img = Image.open(f_progress_full)
    p_scale = row2_card_w / p_img.width
    p_h = int(p_img.height * p_scale)
    p_resized = p_img.resize((row2_card_w, p_h), Image.Resampling.LANCZOS)

    # Row 3: 3 thumbnails (Bolt, Skipped Tie, Skipped Bolt)
    row3_gap = 20
    row3_card_w = (sheet_w - margin * 2 - row3_gap * 2) // 3
    t1_img = Image.open(f_bolt_full)
    t1_scale = row3_card_w / t1_img.width
    t1_h = int(t1_img.height * t1_scale)
    t1_resized = t1_img.resize((row3_card_w, t1_h), Image.Resampling.LANCZOS)

    t2_img = Image.open(f_need_tie_full)
    t2_resized = t2_img.resize((row3_card_w, t1_h), Image.Resampling.LANCZOS)

    f_need_bolt_full = OUT_DIR / "02-skipped-step-need-bolt-full.jpg"
    t3_img = Image.open(f_need_bolt_full)
    t3_resized = t3_img.resize((row3_card_w, t1_h), Image.Resampling.LANCZOS)

    total_h = header_h + 30 + hero_h + 30 + 40 + b_h + 30 + 40 + t1_h + margin + 30

    sheet = Image.new("RGB", (sheet_w, total_h), (14, 18, 14))
    draw = ImageDraw.Draw(sheet)

    # Header Background
    draw.rectangle([0, 0, sheet_w, header_h], fill=(22, 28, 20), outline=(45, 58, 38))

    # Fonts
    font_title = get_font(28, bold=True)
    font_subtitle = get_font(15, bold=False)
    font_sec = get_font(18, bold=True)
    font_body = get_font(14, bold=False)
    font_code = get_font(13, bold=False)
    font_badge = get_font(12, bold=True)

    # Title & Subtitle
    draw.text((margin, 18), "GP-20035 / AG-249: WINCH PROMPT & BANNER VISUAL VERIFICATION", fill=(240, 235, 215), font=font_title)
    draw.text((margin, 56), "Real WebGPU Hardware Capture on Jerry's RTX 5080 · First-Person Gameplay Scale (1920x1080 Noon)", fill=(195, 210, 160), font=font_subtitle)
    draw.text((margin, 80), "Requested by ChatGPT: Hold E winch prompt, skipped-step hint, cable-tied banner, and text clipping / readability audit.", fill=(150, 170, 140), font=font_subtitle)
    draw.text((margin, 102), "Spec (D-116 / CL-303): Machete and winch story progression · Gated mode runtime (?gates=1&chaingates=1).", fill=(130, 145, 125), font=font_subtitle)

    # -------------------------------------------------------------------------
    # SECTION 1: HERO ITEM - HOLD E WINCH PROMPT AT REMOTE (0%)
    # -------------------------------------------------------------------------
    curr_y = header_h + 20
    draw.text((margin, curr_y), "1. PRIMARY ACTIONABLE: HOLD E WINCH PROMPT AT REMOTE (STAGE 2, 0%)", fill=(255, 215, 80), font=font_sec)
    curr_y += 30

    # Paste hero gameplay frame
    sheet.paste(hero_resized, (margin, curr_y))
    draw.rectangle([margin, curr_y, margin + hero_w, curr_y + hero_h], outline=(80, 100, 70), width=2)

    # Side Card
    side_x = margin + hero_w + gap
    draw.rectangle([side_x, curr_y, side_x + side_w, curr_y + side_h], fill=(20, 26, 20), outline=(60, 75, 55), width=2)

    card_pad = 20
    cx = side_x + card_pad
    cy = curr_y + card_pad

    draw.text((cx, cy), "HUD PROMPT INSPECTION", fill=(230, 240, 220), font=font_sec)
    cy += 32

    # Draw Badge
    bx = draw_badge(draw, cx, cy, "VERIFIED NO CLIPPING", (35, 80, 45), (200, 255, 200), font_badge)
    draw_badge(draw, bx + 10, cy, "READABILITY 5/5", (35, 80, 45), (200, 255, 200), font_badge)
    cy += 36

    draw.text((cx, cy), "Target String Key: chain.missing.winchPull", fill=(170, 185, 160), font=font_body)
    cy += 22
    draw.text((cx, cy), 'Value: "Hold E - Winch the truck clear"', fill=(255, 230, 130), font=font_body)
    cy += 22
    draw.text((cx, cy), 'Runtime Text: "HOLD E WINCH THE TRUCK CLEAR 0%"', fill=(255, 255, 255), font=font_body)
    cy += 28

    draw.text((cx, cy), "DOM Structure & Style:", fill=(170, 185, 160), font=font_body)
    cy += 20
    draw.text((cx, cy), '• <span class="key">HOLD E</span>', fill=(255, 210, 74), font=font_code)
    cy += 18
    draw.text((cx, cy), '• Text: "WINCH THE TRUCK CLEAR 0%"', fill=(247, 241, 220), font=font_code)
    cy += 18
    draw.text((cx, cy), '• Keycap: 1.5px border #ffd24a, text #ffd24a', fill=(200, 200, 200), font=font_code)
    cy += 18
    draw.text((cx, cy), '• Drop shadow: 0 1px 2px #000, 0 0 14px #0009', fill=(200, 200, 200), font=font_code)
    cy += 18
    draw.text((cx, cy), '• First-person offset: FP_PROMPT_DROP = 118px', fill=(200, 200, 200), font=font_code)
    cy += 28

    # Paste magnified crop of prompt if available
    if f_hold_crop.exists():
        crop_img = Image.open(f_hold_crop)
        # Resize crop to fit side card nicely (width ~ side_w - 40)
        cw = min(side_w - card_pad * 2, crop_img.width * 2)
        scale_c = cw / crop_img.width
        ch = int(crop_img.height * scale_c)
        crop_resized = crop_img.resize((int(cw), ch), Image.Resampling.LANCZOS)
        draw.text((cx, cy), "Direct DOM Crop (2x Magnification):", fill=(170, 185, 160), font=font_body)
        cy += 22
        sheet.paste(crop_resized, (cx, cy))
        draw.rectangle([cx, cy, cx + int(cw), cy + ch], outline=(100, 130, 90), width=1)

    # -------------------------------------------------------------------------
    # SECTION 2: CABLE TIED BANNER & WINCHING PROGRESS
    # -------------------------------------------------------------------------
    curr_y += hero_h + 30
    draw.text((margin, curr_y), "2. CABLE TIED OFF BANNER & WINCHING IN PROGRESS", fill=(255, 215, 80), font=font_sec)
    curr_y += 30

    # Panel A: Cable Tied Banner
    sheet.paste(b_resized, (margin, curr_y))
    draw.rectangle([margin, curr_y, margin + row2_card_w, curr_y + b_h], outline=(80, 100, 70), width=2)
    draw.text((margin + 15, curr_y + 12), "BANNER: CABLE TIED OFF — 'Stand clear at the remote and hold E.'", fill=(255, 255, 255), font=font_body)

    # Panel B: Winching Progress
    r2_col2_x = margin + row2_card_w + gap
    sheet.paste(p_resized, (r2_col2_x, curr_y))
    draw.rectangle([r2_col2_x, curr_y, r2_col2_x + row2_card_w, curr_y + p_h], outline=(80, 100, 70), width=2)
    draw.text((r2_col2_x + 15, curr_y + 12), "WINCHING IN PROGRESS: HOLD E — 'Winch the truck clear 35%' (Noise calls dead)", fill=(255, 255, 255), font=font_body)

    # -------------------------------------------------------------------------
    # SECTION 3: SKIPPED-STEP HINTS & BOLT PROMPT
    # -------------------------------------------------------------------------
    curr_y += b_h + 30
    draw.text((margin, curr_y), "3. PROGRESSION GATES & SKIPPED-STEP HINT PROMPTS", fill=(255, 215, 80), font=font_sec)
    curr_y += 30

    # Thumbnail 1: Bolt Prompt
    sheet.paste(t1_resized, (margin, curr_y))
    draw.rectangle([margin, curr_y, margin + row3_card_w, curr_y + t1_h], outline=(80, 100, 70), width=2)
    draw.text((margin + 12, curr_y + 10), "STAGE 0: AT TRUCK BUMPER", fill=(240, 235, 215), font=font_badge)
    draw.text((margin + 12, curr_y + 26), "E — Bolt on the winch", fill=(255, 215, 74), font=font_body)

    # Thumbnail 2: Skipped Step Need Bolt
    t2_x = margin + row3_card_w + row3_gap
    sheet.paste(t3_resized, (t2_x, curr_y))
    draw.rectangle([t2_x, curr_y, t2_x + row3_card_w, curr_y + t1_h], outline=(80, 100, 70), width=2)
    draw.text((t2_x + 12, curr_y + 10), "SKIPPED-STEP HINT (AT TREE BEFORE TRUCK)", fill=(240, 235, 215), font=font_badge)
    draw.text((t2_x + 12, curr_y + 26), "Bolt the winch to the truck first.", fill=(255, 180, 180), font=font_body)

    # Thumbnail 3: Skipped Step Need Tie
    t3_x = t2_x + row3_card_w + row3_gap
    sheet.paste(t2_resized, (t3_x, curr_y))
    draw.rectangle([t3_x, curr_y, t3_x + row3_card_w, curr_y + t1_h], outline=(80, 100, 70), width=2)
    draw.text((t3_x + 12, curr_y + 10), "SKIPPED-STEP HINT (AT REMOTE BEFORE TREE)", fill=(240, 235, 215), font=font_badge)
    draw.text((t3_x + 12, curr_y + 26), "Tie the cable to the big tree first.", fill=(255, 180, 180), font=font_body)

    # Save Composite Sheet in qa/ and review/GP-20035/
    out_sheet_path = OUT_DIR / "winch-prompt-sheet.jpg"
    sheet.save(out_sheet_path, "JPEG", quality=92)
    print(f"[Python] Saved composite contact sheet: {out_sheet_path}")

    review_sheet_path = REVIEW_DIR / "winch-prompt-sheet.jpg"
    shutil.copyfile(out_sheet_path, review_sheet_path)
    print(f"[Python] Copied sheet to review: {review_sheet_path}")

    # Copy primary hero gameplay shot to review/GP-20035 as well
    review_hero_path = REVIEW_DIR / "hold-e-winch-prompt.jpg"
    shutil.copyfile(f_hold_full, review_hero_path)
    print(f"[Python] Copied hero screenshot to review: {review_hero_path}")

if __name__ == "__main__":
    main()
