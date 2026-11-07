# qa/2026-11-07-AG-251/build-sheets.py
# Composite contact sheet builder for Task AG-251:
# The first-person look of every gun, his way (D-118).
# 15 weapons (12 single + 3 pairs) in first person at the hip and aimed in daylight.
# Strictly addresses:
# 1. The hands
# 2. What fills the view
# 3. The stock (J9: in ADS stock should not be in frame)
# 4. The sights

import json
import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(".")
OUT_DIR = ROOT / "qa/2026-11-07-AG-251"
REVIEW_DIR = ROOT / "review/AG-251"
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

def draw_header(draw, width, y_start, telemetry):
    draw.rectangle([0, 0, width, y_start], fill="#0f141a")
    
    title_font = get_font(34, bold=True)
    sub_font = get_font(18, bold=True)
    body_font = get_font(14, bold=False)
    
    draw.text((40, 25), "ANTIGRAVITY  ·  AG-251: FIRST-PERSON WEAPONS LOOK (BEFORE SET, D-118)", fill="#ffffff", font=title_font)
    draw.text((40, 75), "Jerry's Seat (RTX 5080 WebGPU Hardware · 1920x1080 Native · Outdoor High Noon Daylight · 20m Silhouette Target)", fill="#4ea8de", font=sub_font)
    
    meta_text = (
        "DECISION D-118 / D-119: Weekend FPS pass before set. 15 weapons evaluated at HIP and AIMED (ADS) across 4 required axes:\n"
        "(1) The hands (grip/fore-end/fingers/wrists/stumps)  ·  (2) What fills the view (screen dominance/line-of-sight blockage)\n"
        "(3) The stock (J9: stock must not be in frame in ADS; J2: fitted against shoulder)  ·  (4) The sights (front post/rear notch/aperture/scope alignment)"
    )
    draw.text((40, 108), meta_text, fill="#a0aec0", font=body_font)
    
    # Legend bar
    draw.rectangle([40, 165, width - 40, 195], fill="#1a232f")
    draw.rectangle([40, 165, 45, 195], fill="#ffd166")
    draw.text((55, 172), "LEGEND: 15 WEAPONS AUDITED AT HIGH NOON  |  COLUMN 1: HIP (REST STANCE)  |  COLUMN 2: AIMED (FULL ADS HOLD AT 20M TARGET)", fill="#e2e8f0", font=get_font(13, bold=True))

def draw_row(draw, img_canvas, y_top, w_info, telem_row, img_w, img_h, fonts):
    f_num = fonts['num']
    f_title = fonts['title']
    f_sub = fonts['sub']
    f_tag = fonts['tag']
    f_body = fonts['body']
    f_bold = fonts['bold']

    row_h = 580
    y_bottom = y_top + row_h
    
    # Row background card
    draw.rectangle([30, y_top, img_canvas.width - 30, y_bottom - 20], fill="#161c24", outline="#263140", width=1)
    
    # Left Info Column: x: 45 to 375 (width: 330)
    col_x = 45
    card_top = y_top + 15
    
    # Weapon ID & Title
    draw.rectangle([col_x, card_top, col_x + 50, card_top + 32], fill="#2b6cb0")
    draw.text((col_x + 12, card_top + 6), w_info['id'], fill="#ffffff", font=f_num)
    draw.text((col_x + 60, card_top + 5), w_info['name'], fill="#ffffff", font=f_title)
    
    card_y = card_top + 40
    draw.text((col_x, card_y), w_info['full_spec'], fill="#4ea8de", font=f_sub)
    card_y += 24
    draw.text((col_x, card_y), f"Owner: {w_info['owner']}  ·  Key: {w_info['key']}", fill="#8c9cb0", font=f_tag)
    card_y += 22
    
    # Relevant Jerry Notes badge
    draw.rectangle([col_x, card_y, col_x + 310, card_y + 44], fill="#1f2937", outline="#374151")
    draw.text((col_x + 8, card_y + 5), f"Relevant Jerry Notes: {w_info['jerry_notes']}", fill="#ffd166", font=f_bold)
    draw.text((col_x + 8, card_y + 24), w_info['jerry_desc'], fill="#d1d5db", font=f_tag)
    card_y += 56
    
    # 4 Axes Audit Summary on Left Column
    draw.rectangle([col_x, card_y, col_x + 310, y_bottom - 35], fill="#10151c", outline="#1e2733")
    inner_y = card_y + 8
    
    # 1. Hands
    hands_color = "#e53e3e" if w_info.get('hands_issue') else "#f6ad55"
    draw.text((col_x + 8, inner_y), f"1. THE HANDS ({w_info['hands_status']}):", fill=hands_color, font=f_bold)
    inner_y += 18
    for line in w_info['hands_summary']:
        draw.text((col_x + 8, inner_y), line, fill="#cbd5e0", font=f_body)
        inner_y += 15
    inner_y += 6
    
    # 2. View Fill
    draw.text((col_x + 8, inner_y), "2. WHAT FILLS VIEW:", fill="#63b3ed", font=f_bold)
    inner_y += 18
    for line in w_info['view_summary']:
        draw.text((col_x + 8, inner_y), line, fill="#cbd5e0", font=f_body)
        inner_y += 15
    inner_y += 6

    # 3. Stock
    stock_color = "#e53e3e" if w_info['stock_issue'] else "#48bb78"
    draw.text((col_x + 8, inner_y), f"3. THE STOCK ({w_info['stock_status']}):", fill=stock_color, font=f_bold)
    inner_y += 18
    for line in w_info['stock_summary']:
        draw.text((col_x + 8, inner_y), line, fill="#cbd5e0", font=f_body)
        inner_y += 15
    inner_y += 6

    # 4. Sights
    sights_color = "#e53e3e" if w_info['sights_issue'] else "#48bb78"
    draw.text((col_x + 8, inner_y), f"4. THE SIGHTS ({w_info['sights_status']}):", fill=sights_color, font=f_bold)
    inner_y += 18
    for line in w_info['sights_summary']:
        draw.text((col_x + 8, inner_y), line, fill="#cbd5e0", font=f_body)
        inner_y += 15

    # Center Panel: HIP Screenshot (width: 720, height: 405)
    hip_x = 380
    hip_y = y_top + 45
    hip_path = OUT_DIR / w_info['hip_file']
    if hip_path.exists():
        with Image.open(hip_path) as hip_img:
            thumb = hip_img.resize((img_w, img_h), Image.Resampling.LANCZOS)
            img_canvas.paste(thumb, (hip_x, hip_y))
    
    # HIP Frame header badge
    draw.rectangle([hip_x, y_top + 15, hip_x + img_w, y_top + 45], fill="#1c2530")
    draw.text((hip_x + 12, y_top + 21), f"HIP (REST STANCE)  ·  ads = 0.00  ·  {w_info['name']}", fill="#ffffff", font=f_bold)
    
    # Right Panel: AIMED Screenshot (width: 720, height: 405)
    aim_x = hip_x + img_w + 20
    aim_y = y_top + 45
    aim_path = OUT_DIR / w_info['aim_file']
    if aim_path.exists():
        with Image.open(aim_path) as aim_img:
            thumb = aim_img.resize((img_w, img_h), Image.Resampling.LANCZOS)
            img_canvas.paste(thumb, (aim_x, aim_y))
            
    # AIMED Frame header badge
    draw.rectangle([aim_x, y_top + 15, aim_x + img_w, y_top + 45], fill="#273342")
    draw.text((aim_x + 12, y_top + 21), f"AIMED (FULL ADS)  ·  ads = 1.00  ·  Target @ 20m  ·  {w_info['name']}", fill="#ffffff", font=f_bold)

    # Callouts below screenshots:
    # Hip callout bar
    draw.rectangle([hip_x, hip_y + img_h + 8, hip_x + img_w, y_bottom - 35], fill="#10151c", outline="#202a36")
    draw.text((hip_x + 10, hip_y + img_h + 16), f"HIP FINDINGS: {w_info['hip_callout']}", fill="#e2e8f0", font=f_body)

    # Aim callout bar
    draw.rectangle([aim_x, aim_y + img_h + 8, aim_x + img_w, y_bottom - 35], fill="#10151c", outline="#202a36")
    draw.text((aim_x + 10, aim_y + img_h + 16), f"ADS FINDINGS: {w_info['aim_callout']}", fill="#e2e8f0", font=f_body)

def main():
    print("[AG-251] Loading telemetry.json...")
    telem_path = OUT_DIR / "telemetry.json"
    if not telem_path.exists():
        print(f"[AG-251] ERROR: {telem_path} does not exist yet.")
        sys.exit(1)
        
    with open(telem_path, "r", encoding="utf-8") as f:
        telemetry = json.load(f)

    # 15 weapon specs and visual review findings
    weapons_data = [
        {
            "id": "01",
            "key": "pistol",
            "name": "Pistol",
            "full_spec": "M9 9mm Semi-Automatic Handgun",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J8 (elbow pop), J10 (muzzle point)",
            "jerry_desc": "Primary sidearm. Low recoil, fast draw.",
            "hip_file": "01-pistol-hip.jpg",
            "aim_file": "01-pistol-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Strong hand grips backstrap firmly.",
                "• Left support hand cups bottom/front.",
                "• Wrists aligned without severe kink.",
                "• No forearm stump visible in frame."
            ],
            "view_summary": [
                "• Sits clean in lower-right quadrant.",
                "• Forward downrange sightline open.",
                "• Screen fill ~12% at hip, ~18% at ADS."
            ],
            "stock_status": "N/A (HANDGUN)",
            "stock_issue": False,
            "stock_summary": [
                "• Handgun chassis: no shoulder stock.",
                "• Zero stock obstruction in hip or ADS."
            ],
            "sights_status": "ALIGNED",
            "sights_issue": False,
            "sights_summary": [
                "• Rear square notch & front blade post.",
                "• Blade centered squarely on 20m target.",
                "• Clear, unobstructed sightline."
            ],
            "hip_callout": "Weapon rests low-right; thumbs forward; slight right cant; good peripheral awareness.",
            "aim_callout": "Front post aligns with rear notch on bullseye; slide sits flat; no hammer intrusion."
        },
        {
            "id": "02",
            "key": "revolver",
            "name": "Revolver",
            "full_spec": ".44 Magnum Double-Action Revolver",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J13 (hammer in way), J57 (front post)",
            "jerry_desc": "Heavy caliber revolver. High punch.",
            "hip_file": "02-revolver-hip.jpg",
            "aim_file": "02-revolver-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Both hands wrapped on large grip.",
                "• Thumbs stacked forward along cylinder.",
                "• Left wrist steady under heavy frame.",
                "• Forearm loft extends below frame edge."
            ],
            "view_summary": [
                "• Prominent heavy barrel and cylinder.",
                "• ADS occupies lower center-right.",
                "• Excellent target visibility over top strap."
            ],
            "stock_status": "N/A (HANDGUN)",
            "stock_issue": False,
            "stock_summary": [
                "• Handgun chassis: no shoulder stock.",
                "• Frame ends at grip spur; clear of view."
            ],
            "sights_status": "ALIGNED (POST-FIX)",
            "sights_issue": False,
            "sights_summary": [
                "• GP-20014 lowered idle hammer 6.3 mm.",
                "• Red-ramp front post stands above rear notch.",
                "• Bullseye visible over front ramp."
            ],
            "hip_callout": "Heavy barrel held forward; cylinder reads clearly; right hand seated high on spur.",
            "aim_callout": "Hammer stays under rear notch channel; front red-ramp post frames 20m bullseye."
        },
        {
            "id": "03",
            "key": "uzi",
            "name": "Wasp SMG",
            "full_spec": "9mm Compact Submachine Gun (Micro-Uzi)",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J3 (left hand grip wrong), J11 (akimbo angle)",
            "jerry_desc": "High fire-rate close quarters SMG.",
            "hip_file": "03-uzi-hip.jpg",
            "aim_file": "03-uzi-aimed.jpg",
            "hands_status": "J3 GRIP FLAW",
            "hands_issue": True,
            "hands_summary": [
                "• Right hand on pistol grip / trigger.",
                "• Left hand c-gripping through receiver side!",
                "• J3 FLAG: Left hand should hold fore-end,",
                "  not grip through side (GB-294 task)."
            ],
            "view_summary": [
                "• Square receiver sits high and forward.",
                "• Extended 32-rd mag extends from grip.",
                "• Slight upward cant on receiver body."
            ],
            "stock_status": "FOLDED (CLEAR)",
            "stock_issue": False,
            "stock_summary": [
                "• Wire stock folded over top/side receiver.",
                "• Does NOT extend rearward into view in ADS."
            ],
            "sights_status": "HIGH PROFILE",
            "sights_issue": False,
            "sights_summary": [
                "• Protective sight ears frame front post.",
                "• Front post tip touches 20m center ring.",
                "• Cocking handle slot visible below notch."
            ],
            "hip_callout": "J3 visible: Left hand wrapped over left receiver wall rather than forward handguard.",
            "aim_callout": "Sight ears frame target; front post on target; left hand knuckles close to sight plane."
        },
        {
            "id": "04",
            "key": "m4",
            "name": "GW-4 Carbine",
            "full_spec": "5.56mm NATO Tactical Assault Carbine (M4)",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J9 (stock in ADS frame), J14 (floating parts)",
            "jerry_desc": "Standard military issue assault rifle.",
            "hip_file": "04-m4-hip.jpg",
            "aim_file": "04-m4-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand on pistol grip with finger straight.",
                "• Left hand on textured forward handguard.",
                "• Natural athletic carbine stance.",
                "• Forearm loft seamless into sleeve cuff."
            ],
            "view_summary": [
                "• Carried diagonal across right lower view.",
                "• Carry handle / rail sits above bore axis.",
                "• Moderate view obstruction (~25% in ADS)."
            ],
            "stock_status": "PASS (HIDDEN IN ADS)",
            "stock_issue": False,
            "stock_summary": [
                "• Buffer tube and stock in fpStock group.",
                "• viewmodel.js:760 hides stock in ADS.",
                "• J9 check: Stock is NOT in frame in ADS!"
            ],
            "sights_status": "RING & POST",
            "sights_issue": False,
            "sights_summary": [
                "• Circular rear aperture with F-marked post.",
                "• Front sight post tip on target silhouette.",
                "• Protective front ears clearly outlined."
            ],
            "hip_callout": "Classic ready-low hip pose; magwell and ejection port clearly visible.",
            "aim_callout": "J9 verified: Buffer tube and collapsible stock are cleanly hidden outside ADS frame!"
        },
        {
            "id": "05",
            "key": "ak",
            "name": "KR-7 Rifle",
            "full_spec": "7.62x39mm Selective-Fire Assault Rifle (AK)",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J9 (stock in ADS), J14 (rivets attached)",
            "jerry_desc": "Rugged Soviet pattern battle rifle.",
            "hip_file": "05-ak-hip.jpg",
            "aim_file": "05-ak-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand firmly wrapped on wood grip.",
                "• Left hand under curved lower handguard.",
                "• Fingers securely wrapped below gas tube.",
                "• Solid grip hold with zero joint gap."
            ],
            "view_summary": [
                "• Distinctive curved banana magazine.",
                "• Heavy receiver cover and selector lever.",
                "• Sits broad and heavy on right side."
            ],
            "stock_status": "PASS (HIDDEN IN ADS)",
            "stock_issue": False,
            "stock_summary": [
                "• Wood buttstock is part of fpStock group.",
                "• viewmodel.js:760 hides stock in ADS.",
                "• J9 check: Stock is NOT in frame in ADS!"
            ],
            "sights_status": "TANGENT NOTCH",
            "sights_issue": False,
            "sights_summary": [
                "• Rear tangent open notch over gas block post.",
                "• Hooded front post aligns with target chest.",
                "• Downrange target plate fully visible."
            ],
            "hip_callout": "Curved magazine arcs forward; wood grain visible on forearm and handguard.",
            "aim_callout": "J9 verified: Wooden buttstock comb is hidden in ADS; tangent notch aligns on target."
        },
        {
            "id": "06",
            "key": "shotgun",
            "name": "Shotgun",
            "full_spec": "12-Gauge Pump-Action Shotgun (Remington 870)",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J9 (stock in ADS), J13 (reload animations)",
            "jerry_desc": "High burst damage close-range shotgun.",
            "hip_file": "06-shotgun-hip.jpg",
            "aim_file": "06-shotgun-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand on semi-pistol grip stock wrist.",
                "• Left hand forward on ribbed pump slide.",
                "• Full thumb wrap around pump fore-end.",
                "• Forearm loft extends cleanly below screen."
            ],
            "view_summary": [
                "• Long tubular receiver and barrel rib.",
                "• Moderate profile; low visual clutter.",
                "• Target landscape remains 75% clear."
            ],
            "stock_status": "PASS (HIDDEN IN ADS)",
            "stock_issue": False,
            "stock_summary": [
                "• Fixed wood buttstock in fpStock group.",
                "• viewmodel.js:760 hides stock in ADS.",
                "• J9 check: Stock is NOT in frame in ADS!"
            ],
            "sights_status": "BRASS BEAD",
            "sights_issue": False,
            "sights_summary": [
                "• Flat ventilated receiver top rib.",
                "• Brass bead sight centered on 20m target.",
                "• Clean, simple line-of-sight."
            ],
            "hip_callout": "Pump slide ribbed pattern clear; right wrist relaxed; barrel points downrange.",
            "aim_callout": "J9 verified: Wood buttstock hidden; brass bead sits squarely on target bullseye."
        },
        {
            "id": "07",
            "key": "aa12",
            "name": "Breacher-12",
            "full_spec": "12-Gauge Full-Auto Combat Shotgun (AA-12)",
            "owner": "Grokbot (GB-259) / Claude (hands)",
            "jerry_notes": "J20 (sights aligned), J9 (stock in ADS)",
            "jerry_desc": "Drum-fed automatic combat shotgun.",
            "hip_file": "07-aa12-hip.jpg",
            "aim_file": "07-aa12-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand on lower pistol grip.",
                "• Left hand supporting underside fore-end.",
                "• Fingers clear of huge 20-round drum.",
                "• Forearms enter from corners correctly."
            ],
            "view_summary": [
                "• Massive composite receiver and drum.",
                "• Fills substantial lower-right quadrant.",
                "• Screen fill ~32% at hip, ~38% at ADS."
            ],
            "stock_status": "PASS (FLUSH CHASSIS)",
            "stock_issue": False,
            "stock_summary": [
                "• Straight-line composite buttstock housing.",
                "• Straight recoil path; zero ADS obstruction."
            ],
            "sights_status": "ALIGNED (GB-259)",
            "sights_issue": False,
            "sights_summary": [
                "• GB-259 carry-handle aperture ring centered.",
                "• Hooded front post tip aligns at y=0.168.",
                "• Bullseye framed squarely inside circle."
            ],
            "hip_callout": "Drum magazine dominates lower chassis; carry handle sits tall; rugged polymer look.",
            "aim_callout": "GB-259 fix holds: Circular carry-handle aperture frames front post and target bullseye."
        },
        {
            "id": "08",
            "key": "sniper",
            "name": "Sniper Rifle",
            "full_spec": ".308 Bolt-Action Precision Sniper Rifle",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J9 (stock in ADS), J7 (scope transition)",
            "jerry_desc": "Long-range precision tactical rifle.",
            "hip_file": "08-sniper-hip.jpg",
            "aim_file": "08-sniper-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand on contoured thumbhole grip.",
                "• Left hand resting under flat benchrest fore-end.",
                "• In ADS: Full-screen optical scope activates,",
                "  hiding 3P arms and viewmodel correctly."
            ],
            "view_summary": [
                "• Long fluted heavy barrel and large optic.",
                "• At hip: large optic turret visible.",
                "• In ADS: Full-screen precision mil-dot scope!"
            ],
            "stock_status": "PASS (HIDDEN IN ADS)",
            "stock_issue": False,
            "stock_summary": [
                "• Full optical scope overlay (ads >= 0.82)",
                "  masks entire 3D viewmodel out of view.",
                "• Zero stock in frame in full ADS."
            ],
            "sights_status": "OPTICAL SCOPE OVERLAY",
            "sights_issue": False,
            "sights_summary": [
                "• Precision crosshair reticle with mil-dots.",
                "• Dark vignette scope ring with range marks.",
                "• Center crosshair locked onto 20m bullseye."
            ],
            "hip_callout": "Optic bells and windage/elevation turrets visible; heavy free-float barrel.",
            "aim_callout": "Full 8x telescopic optic view engaged; crisp black crosshair on bullseye center."
        },
        {
            "id": "09",
            "key": "launcher",
            "name": "Grenade Launcher",
            "full_spec": "40mm Standalone Rotary/Break-Open Launcher",
            "owner": "Grokbot (GB-293) / ChatGPT (GP-20037)",
            "jerry_notes": "J2 (stock against shoulder), J4 (grip), J16 (leaf)",
            "jerry_desc": "Jerry's primary weapon. 40mm explosive shells.",
            "hip_file": "09-launcher-hip.jpg",
            "aim_file": "09-launcher-aimed.jpg",
            "hands_status": "GOOD (J4 VERIFIED)",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand around rear pistol grip (J4 verified).",
                "• Left hand on textured forward fore-grip.",
                "• Hands well aligned on heavy tube chassis.",
                "• Zero severed stump artifacts."
            ],
            "view_summary": [
                "• Enormous 40mm cylinder and launcher barrel.",
                "• Dominates lower right quadrant.",
                "• High visual presence on Jerry's screen."
            ],
            "stock_status": "PASS (TUCKED/HIDDEN)",
            "stock_issue": False,
            "stock_summary": [
                "• viewmodel.js:760 keeps stock hidden.",
                "• GP-20037 stock clone tucked behind eye.",
                "• Zero stock intrusion into ADS sight picture!"
            ],
            "sights_status": "LEAF SIGHT",
            "sights_issue": False,
            "sights_summary": [
                "• Folding leaf ladder sight with range notches.",
                "• GP-20033 opened leaf center channel.",
                "• Front post tip visible through 25m notch."
            ],
            "hip_callout": "Massive 40mm bore visible; right hand firmly on pistol grip; clean forward profile.",
            "aim_callout": "J2/J9 verified: Stock hidden behind camera plane; leaf sight cleanly frames 20m target."
        },
        {
            "id": "10",
            "key": "flamer",
            "name": "Flamethrower",
            "full_spec": "Pressurized Napalm Projector System",
            "owner": "Grokbot (gun) / Claude (hands) / ChatGPT",
            "jerry_notes": "J12 (cans empty too fast), J59 (shake)",
            "jerry_desc": "Continuous incendiary area denial projector.",
            "hip_file": "10-flamer-hip.jpg",
            "aim_file": "10-flamer-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand on rear spade / pistol grip.",
                "• Left hand forward on insulated heat shield.",
                "• Gloves hold dual grip controls firmly.",
                "• Full forearm loft into sleeve cuff."
            ],
            "view_summary": [
                "• Twin fuel tanks and heavy projector shroud.",
                "• Pilot light igniter wand at muzzle.",
                "• Occupies lower third of the screen."
            ],
            "stock_status": "N/A (BULLPUP)",
            "stock_issue": False,
            "stock_summary": [
                "• Bullpup projector chassis: no rear stock.",
                "• Fuel line runs downward; view clear."
            ],
            "sights_status": "POINT-SHOOT SIGHTS",
            "sights_issue": False,
            "sights_summary": [
                "• Open notch sight bracket over heat barrel.",
                "• Pilot igniter flame tip gives forward bore line.",
                "• ADS brings nozzle closer to center screen."
            ],
            "hip_callout": "Twin fuel cylinders and braided hose visible; pilot igniter active at nozzle tip.",
            "aim_callout": "Heavy nozzle raised into lower-center line; pilot wand aligned with 20m target base."
        },
        {
            "id": "11",
            "key": "chainsaw",
            "name": "Chainsaw",
            "full_spec": "Gasoline-Powered Heavy Forestry Chainsaw",
            "owner": "Grokbot (GB-292) / Claude (hands)",
            "jerry_notes": "J1 (left on handle, right on trigger), J60",
            "jerry_desc": "Close melee destruction tool.",
            "hip_file": "11-chainsaw-hip.jpg",
            "aim_file": "11-chainsaw-aimed.jpg",
            "hands_status": "GOOD (GB-292 J1 FIX)",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand on rear throttle trigger grip.",
                "• Left hand on wrap-around top/side handle.",
                "• GB-292 updated poses to resolve J1.",
                "• Hands firmly planted on tool controls."
            ],
            "view_summary": [
                "• Long cutting guide bar and spiked bumper dogs.",
                "• Heavy engine housing and pull-cord cowl.",
                "• Centered low with bar angling upward."
            ],
            "stock_status": "N/A (TOOL)",
            "stock_issue": False,
            "stock_summary": [
                "• Power tool chassis: no shoulder stock.",
                "• Zero stock obstruction."
            ],
            "sights_status": "GUIDE BAR LINE",
            "sights_issue": False,
            "sights_summary": [
                "• No optical or iron sights on a chainsaw.",
                "• Guide bar tip serves as cutting point.",
                "• ADS raises cutter bar straight ahead."
            ],
            "hip_callout": "Cutter chain teeth and guide bar angle upward; pull-start handle visible at left.",
            "aim_callout": "Bar brought up into center thrust pose; chain loop aimed at target center."
        },
        {
            "id": "12",
            "key": "minigun",
            "name": "Rotary Gun",
            "full_spec": "7.62mm 6-Barrel Gatling Rotary Machine Gun",
            "owner": "Grokbot (gun) / Claude (hands)",
            "jerry_notes": "J61 (support hand under gun, not through)",
            "jerry_desc": "High-velocity multi-barrel heavy weapon.",
            "hip_file": "12-minigun-hip.jpg",
            "aim_file": "12-minigun-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Right hand on top rear spade grip trigger.",
                "• Left hand on forward carrying handle.",
                "• Poses prevent support hand clipping barrel.",
                "• Muscular heavy carrying posture."
            ],
            "view_summary": [
                "• 6 rotating barrel cluster and drive motor.",
                "• Massive weapon bulk fills lower right (~40%).",
                "• Powerful heavy weapon silhouette."
            ],
            "stock_status": "N/A (HEAVY)",
            "stock_issue": False,
            "stock_summary": [
                "• Vehicle / hip-carried weapon: no buttstock.",
                "• Rear motor assembly remains tucked."
            ],
            "sights_status": "BORE AXIS",
            "sights_issue": False,
            "sights_summary": [
                "• Heavy suppressive weapon: no iron sights.",
                "• Aimed pose tightens barrel axis toward target.",
                "• Central rotor clamp points at bullseye."
            ],
            "hip_callout": "6-barrel cluster angled down; battery motor casing and drive gear clearly visible.",
            "aim_callout": "Barrels raised to horizontal; muzzle cluster centered on target plate."
        },
        {
            "id": "13",
            "key": "pistol-pair",
            "name": "Pistol Pair",
            "full_spec": "Dual-Wielded M9 9mm Handguns (Akimbo)",
            "owner": "Claude (CL-301) / Grokbot (guns)",
            "jerry_notes": "CL-301 (pair mirror hold), J10",
            "jerry_desc": "Dual sidearms. High mobility and rate of fire.",
            "hip_file": "13-pistol-pair-hip.jpg",
            "aim_file": "13-pistol-pair-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Both hands independent on their own grip.",
                "• Right hand right gun, left hand left gun.",
                "• Straight wrists coming up from lower corners.",
                "• Balanced, mirrored combat stance."
            ],
            "view_summary": [
                "• Dual pistols framing left and right sides.",
                "• Central corridor between guns remains open.",
                "• Screen fill balanced ~22% total."
            ],
            "stock_status": "N/A (HANDGUNS)",
            "stock_issue": False,
            "stock_summary": [
                "• Handgun chassis: no stocks.",
                "• Zero rear intrusion."
            ],
            "sights_status": "DUAL HIP / BRING-UP",
            "sights_issue": False,
            "sights_summary": [
                "• Akimbo has no ADS down iron sights.",
                "• Right-click brings both guns in and up (am.in/up).",
                "• Both slides point parallel at target plate."
            ],
            "hip_callout": "Mirrored pistol pair held low at hip; slides angled inward slightly toward center.",
            "aim_callout": "Right-click brings both guns inward and upward; clean view corridor between barrels."
        },
        {
            "id": "14",
            "key": "uzi-pair",
            "name": "Wasp Pair",
            "full_spec": "Dual-Wielded Wasp 9mm SMGs (Akimbo)",
            "owner": "Claude (CL-301) / Grokbot (guns)",
            "jerry_notes": "J11 (Wasp akimbo angled inward too much: redo)",
            "jerry_desc": "Dual submachine guns. Extreme bullet hose.",
            "hip_file": "14-uzi-pair-hip.jpg",
            "aim_file": "14-uzi-pair-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Both hands on independent SMG pistol grips.",
                "• Left and right forearms enter from corners.",
                "• Fingers wrapped on triggers.",
                "• Solid two-handed dual hold."
            ],
            "view_summary": [
                "• Dual boxy SMG receivers with extended mags.",
                "• High screen presence on both flanks.",
                "• J11 FLAG: Angle between receivers is steep."
            ],
            "stock_status": "FOLDED (CLEAR)",
            "stock_issue": False,
            "stock_summary": [
                "• Wire stocks folded flush against receivers.",
                "• No rear stock intrusion."
            ],
            "sights_status": "CONVERGENT AIM (J11)",
            "sights_issue": True,
            "sights_summary": [
                "• J11 FLAG: Barrels canted inward sharply",
                "  (yaw=0.40 rad = ~23 degrees cant!).",
                "• Grokbot GB-294 task to straighten aim angle."
            ],
            "hip_callout": "J11 visible: Twin Wasp SMGs canted inwards with extended sticks crossing sightline.",
            "aim_callout": "J11 confirmed: Barrels angle toward each other rather than parallel forward downrange."
        },
        {
            "id": "15",
            "key": "revolver-pair",
            "name": "Revolver Pair",
            "full_spec": "Dual-Wielded .44 Magnum Revolvers (Akimbo)",
            "owner": "Claude (CL-301) / Grokbot (guns)",
            "jerry_notes": "CL-301 (revolver akimbo poses)",
            "jerry_desc": "Dual heavy hand cannons. Devastating close fire.",
            "hip_file": "15-revolver-pair-hip.jpg",
            "aim_file": "15-revolver-pair-aimed.jpg",
            "hands_status": "GOOD",
            "hands_issue": False,
            "hands_summary": [
                "• Strong one-handed hold on each revolver grip.",
                "• Right hand and left hand symmetrically posed.",
                "• Wrist joints stable under simulated mass.",
                "• Forearms enter from screen boundaries."
            ],
            "view_summary": [
                "• Twin .44 Magnum cylinders and heavy barrels.",
                "• Impressive firepower presence.",
                "• Clear view corridor maintained down middle."
            ],
            "stock_status": "N/A (HANDGUNS)",
            "stock_issue": False,
            "stock_summary": [
                "• Handgun chassis: no stocks.",
                "• Zero rear stock obstruction."
            ],
            "sights_status": "DUAL FOCUS",
            "sights_issue": False,
            "sights_summary": [
                "• Both front sight red ramps clearly visible.",
                "• Muzzles point forward along parallel tracks.",
                "• Target plate squarely framed between guns."
            ],
            "hip_callout": "Heavy twin revolvers held at waist height; massive cylinders frame lower view.",
            "aim_callout": "Both revolvers raised into ready position; muzzles converge cleanly on 20m target."
        }
    ]

    total_w = 1920
    row_h = 580
    header_h = 210
    footer_h = 120
    total_h = header_h + len(weapons_data) * row_h + footer_h
    
    thumb_w = 720
    thumb_h = 405

    print(f"[AG-251] Creating master composite image: {total_w} x {total_h} px...")
    master_img = Image.new("RGB", (total_w, total_h), "#0c1015")
    draw = ImageDraw.Draw(master_img)

    fonts = {
        'num': get_font(20, bold=True),
        'title': get_font(22, bold=True),
        'sub': get_font(15, bold=True),
        'tag': get_font(13, bold=False),
        'bold': get_font(13, bold=True),
        'body': get_font(12, bold=False)
    }

    draw_header(draw, total_w, header_h, telemetry)

    cur_y = header_h + 10
    for w in weapons_data:
        print(f"[AG-251] Drawing row {w['id']}: {w['name']}...")
        telem_row = telemetry['guns'].get(f"{w['id']}_{w['key']}{'_pair' if '-pair' in w['key'] else ''}", {})
        draw_row(draw, master_img, cur_y, w, telem_row, thumb_w, thumb_h, fonts)
        cur_y += row_h

    # Footer
    footer_y = cur_y + 10
    draw.rectangle([0, footer_y, total_w, total_h], fill="#0f141a")
    f_foot = get_font(14, bold=True)
    draw.text((40, footer_y + 25), "GRAVE SHIFT CREW · AG-251 COMPLETE AUDIT SHEET (D-118/D-119) · GENERATED ON JERRY'S PC (RTX 5080)", fill="#4ea8de", font=f_foot)
    draw.text((40, footer_y + 55), "Report and raw telemetry: qa/2026-11-07-AG-251/telemetry.json · Handoff: handoffs/2026-11-07-antigravity-AG-251.md", fill="#a0aec0", font=get_font(13, bold=False))

    master_path = OUT_DIR / "all-guns-fps-sheet.jpg"
    review_path = REVIEW_DIR / "all-guns-fps-sheet.jpg"
    
    print(f"[AG-251] Saving high-quality composite JPEG to {master_path}...")
    master_img.save(master_path, format="JPEG", quality=92, optimize=True)
    
    print(f"[AG-251] Mirroring composite JPEG to {review_path}...")
    master_img.save(review_path, format="JPEG", quality=92, optimize=True)
    
    print("[AG-251] Contact sheet build complete!")

if __name__ == "__main__":
    main()
