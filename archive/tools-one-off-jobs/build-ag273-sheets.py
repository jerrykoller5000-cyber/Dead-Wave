# tools/build-ag273-sheets.py - Generates frame strips and contact sheets for AG-273 (CL-326-2 & CL-327)
import os
import sys
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
REVIEW_DIR = os.path.join(ROOT, "review", "CL-326")
QA_DIR = os.path.join(ROOT, "qa", "AG-273")

def get_font(size=14, bold=False):
    try:
        font_name = "arialbd.ttf" if bold else "arial.ttf"
        return ImageFont.truetype(font_name, size)
    except IOError:
        return ImageFont.load_default()

def create_grid(items, cols, out_path, thumb_w=380, thumb_h=214, title="", subtitle=""):
    rows = (len(items) + cols - 1) // cols
    padding = 10
    header_h = 24
    title_h = 52 if (title or subtitle) else 0
    cell_w = thumb_w + padding * 2
    cell_h = thumb_h + padding * 2 + header_h
    
    sheet_w = cols * cell_w
    sheet_h = rows * cell_h + title_h
    
    sheet = Image.new("RGB", (sheet_w, sheet_h), (18, 20, 24))
    draw = ImageDraw.Draw(sheet)
    
    font = get_font(12)
    title_font = get_font(18, bold=True)
    sub_font = get_font(12)
    
    if title:
        draw.text((padding + 8, 8), title, fill=(245, 248, 255), font=title_font)
    if subtitle:
        draw.text((padding + 8, 30), subtitle, fill=(160, 185, 220), font=sub_font)
        
    for idx, item in enumerate(items):
        img_path = item["path"]
        label = item.get("label", "")
        
        r = idx // cols
        c = idx % cols
        x = c * cell_w + padding
        y = title_h + r * cell_h + padding
        
        draw.rectangle([x - 2, y - 2, x + thumb_w + 2, y + thumb_h + header_h + 2], fill=(26, 30, 38), outline=(42, 48, 60))
        draw.text((x + 4, y + 4), label, fill=(215, 225, 240), font=font)
        
        if os.path.exists(img_path):
            try:
                img = Image.open(img_path)
                img = img.resize((thumb_w, thumb_h), Image.Resampling.LANCZOS)
                sheet.paste(img, (x, y + header_h))
            except Exception as e:
                draw.rectangle([x, y + header_h, x + thumb_w, y + header_h + thumb_h], fill=(50, 20, 20))
                draw.text((x + 8, y + header_h + 20), f"Error: {e}", fill=(255, 120, 120), font=font)
        else:
            draw.rectangle([x, y + header_h, x + thumb_w, y + header_h + thumb_h], fill=(35, 38, 46))
            draw.text((x + 8, y + header_h + 20), f"Not Found:\n{os.path.basename(img_path)}", fill=(160, 160, 160), font=font)
            
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    sheet.save(out_path, quality=92)
    print(f"[SHEET] Saved contact sheet: {out_path}")
    
    # Mirror to QA directory
    base = os.path.basename(out_path)
    qa_mirror = os.path.join(QA_DIR, base)
    if out_path != qa_mirror:
        os.makedirs(QA_DIR, exist_ok=True)
        sheet.save(qa_mirror, quality=92)

def build_all():
    print("[BUILD-SHEETS] Assembling review strips and master sheet...")
    
    # -------------------------------------------------------------
    # 1. Revolver Reload Strip
    # -------------------------------------------------------------
    rev_items = [
        {"path": os.path.join(REVIEW_DIR, "revolver-00-ready.png"), "label": "00: Hip Ready (2 Live / 4 Fired)"},
        {"path": os.path.join(REVIEW_DIR, "revolver-01-cylinder-crane-open.png"), "label": "01: Crane & Cylinder Swung Open"},
        {"path": os.path.join(REVIEW_DIR, "revolver-02-cases-ejecting.png"), "label": "02: 4 Fired Cases Slide & Drop"},
        {"path": os.path.join(REVIEW_DIR, "revolver-03-live-into-palm.png"), "label": "03: 2 Live Rounds Catch in Palm"},
        {"path": os.path.join(REVIEW_DIR, "revolver-04-palm-to-pouch.png"), "label": "04: Palm Carries Live to Pouch"},
        {"path": os.path.join(REVIEW_DIR, "revolver-05-speedloader-approaching.png"), "label": "05: Speedloader in Palm Approaches"},
        {"path": os.path.join(REVIEW_DIR, "revolver-06-speedloader-seating.png"), "label": "06: 6 Fresh Rounds Seated Home"},
        {"path": os.path.join(REVIEW_DIR, "revolver-07-speedloader-clearing.png"), "label": "07: Speedloader Clears Cylinder"},
        {"path": os.path.join(REVIEW_DIR, "revolver-08-cylinder-closing-crane.png"), "label": "08: Cylinder Swings Shut on Crane"},
        {"path": os.path.join(REVIEW_DIR, "revolver-09-locked-ready.png"), "label": "09: Cylinder Locked & Ready at Hip"}
    ]
    create_grid(rev_items, cols=5, out_path=os.path.join(REVIEW_DIR, "strip-01-revolver-reload.jpg"),
                title="AG-273 / CL-326: Revolver Reload on RTX 5080 (J78)",
                subtitle="Fire 4, Reload: 4 Cases Drop, 2 Live into Palm, 6-Round Loader In, Crane Articulation")

    # -------------------------------------------------------------
    # 2. Launcher Reload Strip
    # -------------------------------------------------------------
    launcher_items = [
        # 1-round
        {"path": os.path.join(REVIEW_DIR, "launcher-1rnd-01-drum-open.png"), "label": "1-Rnd: Drum Open to Empty Chamber"},
        {"path": os.path.join(REVIEW_DIR, "launcher-1rnd-02-trip1-inserting.png"), "label": "1-Rnd: Trip 1 Grenade Inserted"},
        {"path": os.path.join(REVIEW_DIR, "launcher-1rnd-03-seated.png"), "label": "1-Rnd: Grenade Seated Home"},
        {"path": os.path.join(REVIEW_DIR, "launcher-1rnd-04-winder-turned.png"), "label": "1-Rnd: Winding Key Turned"},
        {"path": os.path.join(REVIEW_DIR, "launcher-1rnd-05-drum-closed.png"), "label": "1-Rnd: Drum Closed (1 Round Replaced)"},
        # 2-round
        {"path": os.path.join(REVIEW_DIR, "launcher-2rnd-01-drum-open.png"), "label": "2-Rnd: Drum Open to Empty Chamber"},
        {"path": os.path.join(REVIEW_DIR, "launcher-2rnd-02-trip1-inserting.png"), "label": "2-Rnd: Trip 1/2 First Grenade In"},
        {"path": os.path.join(REVIEW_DIR, "launcher-2rnd-03-trip2-inserting.png"), "label": "2-Rnd: Trip 2/2 Second Grenade In"},
        {"path": os.path.join(REVIEW_DIR, "launcher-2rnd-04-winder.png"), "label": "2-Rnd: Winding Key Turned"},
        {"path": os.path.join(REVIEW_DIR, "launcher-2rnd-05-closed.png"), "label": "2-Rnd: Drum Closed (2 Rounds Replaced)"},
        # 6-round empty
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-01-drum-empty-open.png"), "label": "6-Rnd: Drum Open (6 Empty Chambers)"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-02-trip1.png"), "label": "6-Rnd: Trip 1/6 Loaded"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-03-trip2.png"), "label": "6-Rnd: Trip 2/6 Loaded"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-04-trip3.png"), "label": "6-Rnd: Trip 3/6 Loaded"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-05-trip4.png"), "label": "6-Rnd: Trip 4/6 Loaded"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-06-trip5.png"), "label": "6-Rnd: Trip 5/6 Loaded"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-07-trip6.png"), "label": "6-Rnd: Trip 6/6 Loaded"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-08-winder.png"), "label": "6-Rnd: Winding Key Turned"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-09-closed.png"), "label": "6-Rnd: Drum Closed Full"}
    ]
    create_grid(launcher_items, cols=5, out_path=os.path.join(REVIEW_DIR, "strip-02-launcher-reload.jpg"),
                title="AG-273 / CL-326: M32A1 Launcher Reload on RTX 5080 (J80)",
                subtitle="Fire 1, 2, 6: Exactly One Trip Per Missing Round into Chamber at the Hand")

    # -------------------------------------------------------------
    # 3. Breacher Empty Reload Strip
    # -------------------------------------------------------------
    breacher_items = [
        {"path": os.path.join(REVIEW_DIR, "breacher-01-drum-drop.png"), "label": "01: Spent Drum Dropped"},
        {"path": os.path.join(REVIEW_DIR, "breacher-02-drum-from-pouch.png"), "label": "02: Fresh Drum from Pouch"},
        {"path": os.path.join(REVIEW_DIR, "breacher-03-drum-seated.png"), "label": "03: Drum Seated into Well"},
        {"path": os.path.join(REVIEW_DIR, "breacher-04-hand-to-charging-handle.png"), "label": "04: Hand Approaches Handle"},
        {"path": os.path.join(REVIEW_DIR, "breacher-05-handle-hooked.png"), "label": "05: Fingers Hook Handle Knob"},
        {"path": os.path.join(REVIEW_DIR, "breacher-06-handle-pulled-back.png"), "label": "06: Handle Racked Back (11 cm Stroke)"},
        {"path": os.path.join(REVIEW_DIR, "breacher-07-handle-released-flying.png"), "label": "07: Handle Released, Snaps Forward"},
        {"path": os.path.join(REVIEW_DIR, "breacher-08-hand-to-forend.png"), "label": "08: Hand Returns to Forend"},
        {"path": os.path.join(REVIEW_DIR, "breacher-09-ready.png"), "label": "09: Breacher-12 Ready at Hip"}
    ]
    create_grid(breacher_items, cols=5, out_path=os.path.join(REVIEW_DIR, "strip-03-breacher-empty-reload.jpg"),
                title="AG-273 / CL-326: Breacher-12 Empty Reload on RTX 5080 (J77)",
                subtitle="Hand Hooks Separate Charging Handle, Pulls Rearward along Receiver Slot, Lets it Fly")

    # -------------------------------------------------------------
    # 4. Flamer and Rotary Gun Reloads Strip
    # -------------------------------------------------------------
    heavies_items = [
        # Flamer
        {"path": os.path.join(REVIEW_DIR, "flamer-01-roll-ready.png"), "label": "Flamer 01: Gun Rolled Top-Right"},
        {"path": os.path.join(REVIEW_DIR, "flamer-02-hand-cups-tank.png"), "label": "Flamer 02: Support Hand Cups Tank"},
        {"path": os.path.join(REVIEW_DIR, "flamer-03-tank-detached.png"), "label": "Flamer 03: Tank Detached to Pouch"},
        {"path": os.path.join(REVIEW_DIR, "flamer-04-new-tank-arriving.png"), "label": "Flamer 04: Fresh Tank in Palm"},
        {"path": os.path.join(REVIEW_DIR, "flamer-05-tank-seated.png"), "label": "Flamer 05: Tank Seated on Gun"},
        {"path": os.path.join(REVIEW_DIR, "flamer-06-hand-release.png"), "label": "Flamer 06: Hand Releases Tank"},
        {"path": os.path.join(REVIEW_DIR, "flamer-07-ready.png"), "label": "Flamer 07: Flamer Rolled to Ready"},
        # Rotary
        {"path": os.path.join(REVIEW_DIR, "rotary-01-roll-box-up.png"), "label": "Minigun 01: Gun Rolled Top-Left"},
        {"path": os.path.join(REVIEW_DIR, "rotary-02-hand-cups-box.png"), "label": "Minigun 02: Hand Cups Ammo Box"},
        {"path": os.path.join(REVIEW_DIR, "rotary-03-box-detached.png"), "label": "Minigun 03: Box Lowered to Pouch"},
        {"path": os.path.join(REVIEW_DIR, "rotary-04-new-box-arriving.png"), "label": "Minigun 04: Fresh Box in Palm"},
        {"path": os.path.join(REVIEW_DIR, "rotary-05-box-seated.png"), "label": "Minigun 05: Box Locked into Feeder"},
        {"path": os.path.join(REVIEW_DIR, "rotary-06-hand-to-peg.png"), "label": "Minigun 06: Hand to Side Peg"},
        {"path": os.path.join(REVIEW_DIR, "rotary-07-ready.png"), "label": "Minigun 07: Minigun Ready"}
    ]
    create_grid(heavies_items, cols=7, out_path=os.path.join(REVIEW_DIR, "strip-04-heavies-reloads.jpg"),
                title="AG-273 / CL-326: Heavy Weapon Reloads on RTX 5080 (J81, J83)",
                subtitle="Flamer Tank and Rotary Ammo Box Seen Rolling into View, Coming Off, and Seating Fresh")

    # -------------------------------------------------------------
    # 5. Chainsaw Draw and Pull-Start Strip
    # -------------------------------------------------------------
    saw_items = [
        # 1P
        {"path": os.path.join(REVIEW_DIR, "saw-1p-01-draw-reach.png"), "label": "1P 01: Reach to Starter Handle"},
        {"path": os.path.join(REVIEW_DIR, "saw-1p-02-starter-grasped.png"), "label": "1P 02: T-Handle Grasped"},
        {"path": os.path.join(REVIEW_DIR, "saw-1p-03-cord-pulled.png"), "label": "1P 03: Starter Cord Pulled"},
        {"path": os.path.join(REVIEW_DIR, "saw-1p-04-full-pull.png"), "label": "1P 04: Peak Cord Extension"},
        {"path": os.path.join(REVIEW_DIR, "saw-1p-05-cord-retracting.png"), "label": "1P 05: Cord Retracting"},
        {"path": os.path.join(REVIEW_DIR, "saw-1p-06-hand-returning.png"), "label": "1P 06: Hand Returns to Throttle"},
        {"path": os.path.join(REVIEW_DIR, "saw-1p-07-running-ready.png"), "label": "1P 07: Running Ready (Hoop Support)"},
        # 3P
        {"path": os.path.join(REVIEW_DIR, "saw-3p-01-draw.png"), "label": "3P 01: Saw Drawn"},
        {"path": os.path.join(REVIEW_DIR, "saw-3p-02-cord-extended.png"), "label": "3P 02: 35 cm Shoulder Pull"},
        {"path": os.path.join(REVIEW_DIR, "saw-3p-03-cord-retract.png"), "label": "3P 03: Cord Retracting"},
        {"path": os.path.join(REVIEW_DIR, "saw-3p-04-running.png"), "label": "3P 04: Saw Running"}
    ]
    create_grid(saw_items, cols=6, out_path=os.path.join(REVIEW_DIR, "strip-05-chainsaw-draw-pullstart.jpg"),
                title="AG-273 / CL-326: Chainsaw Draw & Pull-Start on RTX 5080 (J82, D-128)",
                subtitle="First-Person & Third-Person Starter Pull Motion; Support Hand on Hoop's Left Upright")

    # -------------------------------------------------------------
    # 6. View Swap Hand-Over Strip (GW-4 and Pistol)
    # -------------------------------------------------------------
    swap_items = [
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-in-01-across-left.png"), "label": "GW-4 In 01: Crosses from Left"},
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-in-02-crossing.png"), "label": "GW-4 In 02: Dip & Crossing"},
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-in-03-hand-taking-grip.png"), "label": "GW-4 In 03: Right Hand Closes Grip"},
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-in-04-settled.png"), "label": "GW-4 In 04: Settled at Ready"},
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-out-01-starting.png"), "label": "GW-4 Out 01: Beginning Out Pass"},
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-out-02-crossing-left.png"), "label": "GW-4 Out 02: Crossing to Left Hand"},
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-out-03-passed-left.png"), "label": "GW-4 Out 03: Passed Left Before Cut"},
        {"path": os.path.join(REVIEW_DIR, "swap-pistol-in-01-across-left.png"), "label": "Pistol In 01: Enters Left"},
        {"path": os.path.join(REVIEW_DIR, "swap-pistol-in-02-crossing.png"), "label": "Pistol In 02: Dip Crossing"},
        {"path": os.path.join(REVIEW_DIR, "swap-pistol-in-03-hand-taking-grip.png"), "label": "Pistol In 03: Taking Grip"},
        {"path": os.path.join(REVIEW_DIR, "swap-pistol-in-04-settled.png"), "label": "Pistol In 04: Settled Ready"}
    ]
    create_grid(swap_items, cols=4, out_path=os.path.join(REVIEW_DIR, "strip-06-view-swap-handover.jpg"),
                title="AG-273 / CL-328: View Swap Hand-Over on RTX 5080 (D-125)",
                subtitle="The 5 Key View Transition Hand-Over: GW-4 and Pistol In and Out Sequences")

    # -------------------------------------------------------------
    # 7. Lasers and Lights at Night Strip
    # -------------------------------------------------------------
    laser_items = [
        {"path": os.path.join(REVIEW_DIR, "laser-night-01-akimbo-wasp-two-beams.png"), "label": "Akimbo Wasp: Both Beams Visible"},
        {"path": os.path.join(REVIEW_DIR, "laser-night-02-akimbo-pistol-two-beams.png"), "label": "Akimbo Pistol: Both Beams Visible"},
        {"path": os.path.join(REVIEW_DIR, "laser-night-03-fast-turn-pre.png"), "label": "Fast Turn: Pre-Turn Beam Alignment"},
        {"path": os.path.join(REVIEW_DIR, "laser-night-04-fast-turn-mid.png"), "label": "Fast Turn: Mid-Turn (Zero Lag)"},
        {"path": os.path.join(REVIEW_DIR, "laser-night-05-fast-turn-post.png"), "label": "Fast Turn: Post-Turn Settled"},
        {"path": os.path.join(REVIEW_DIR, "light-night-06-reload-mag-drop.png"), "label": "Light Reload 01: Cone Follows Mag Drop Tilt"},
        {"path": os.path.join(REVIEW_DIR, "light-night-07-reload-pouch.png"), "label": "Light Reload 02: Cone Tracks Pouch Motion"},
        {"path": os.path.join(REVIEW_DIR, "light-night-08-reload-mag-seat.png"), "label": "Light Reload 03: Cone Rises with Mag Seat"},
        {"path": os.path.join(REVIEW_DIR, "light-night-09-reload-ready.png"), "label": "Light Reload 04: Cone Restores to Forward Line"}
    ]
    create_grid(laser_items, cols=3, out_path=os.path.join(REVIEW_DIR, "strip-07-lasers-lights-night.jpg"),
                title="AG-273 / CL-327: Lasers & Lights at Night on RTX 5080 (J73-J75, J86, J87)",
                subtitle="Dual Beams on Akimbo Pairs, Fast Turn Zero Origin Lag, Dynamic Flashlight Cone in Reload")

    # -------------------------------------------------------------
    # 8. Brass Burst Strip
    # -------------------------------------------------------------
    brass_items = [
        {"path": os.path.join(REVIEW_DIR, "brass-burst-shot-01.png"), "label": "Burst Shot 01: Casing Ejecting from Port"},
        {"path": os.path.join(REVIEW_DIR, "brass-burst-shot-02.png"), "label": "Burst Shot 02: In-Flight Tumbling Brass"},
        {"path": os.path.join(REVIEW_DIR, "brass-burst-shot-03.png"), "label": "Burst Shot 03: Second Casing Leaves Port"},
        {"path": os.path.join(REVIEW_DIR, "brass-burst-shot-04.png"), "label": "Burst Shot 04: Dual Airborne Cases"},
        {"path": os.path.join(REVIEW_DIR, "brass-burst-shot-05.png"), "label": "Burst Shot 05: Natural Ejection Trajectory"},
        {"path": os.path.join(REVIEW_DIR, "brass-burst-shot-06.png"), "label": "Burst Shot 06: Burst Stream Clear"}
    ]
    create_grid(brass_items, cols=3, out_path=os.path.join(REVIEW_DIR, "strip-08-brass-burst.jpg"),
                title="AG-273 / CL-326: View Gun Brass Ejection Burst on RTX 5080",
                subtitle="Every Shell Casing Leaves the Visible View Gun Port (viewCasingPoint)")

    # -------------------------------------------------------------
    # 9. Master Review Composite Sheet
    # -------------------------------------------------------------
    master_items = [
        {"path": os.path.join(REVIEW_DIR, "revolver-03-live-into-palm.png"), "label": "1. Revolver: 2 Live Rounds in Palm (4 Cases Dropped)"},
        {"path": os.path.join(REVIEW_DIR, "launcher-6rnd-04-trip3.png"), "label": "2. Launcher: 1 Trip Per Missing Round (Chamber at Hand)"},
        {"path": os.path.join(REVIEW_DIR, "breacher-06-handle-pulled-back.png"), "label": "3. Breacher: Charging Handle Hooked & Pulled"},
        {"path": os.path.join(REVIEW_DIR, "flamer-03-tank-detached.png"), "label": "4. Flamer & Minigun: Tank / Box Rolled Off and On"},
        {"path": os.path.join(REVIEW_DIR, "saw-1p-04-full-pull.png"), "label": "5. Chainsaw: Pull-Start in 1P & 3P (Left Hand on Hoop)"},
        {"path": os.path.join(REVIEW_DIR, "swap-gw4-in-03-hand-taking-grip.png"), "label": "6. View Swap: The 5 Key Hand-Over (GW-4 & Pistol)"},
        {"path": os.path.join(REVIEW_DIR, "laser-night-01-akimbo-wasp-two-beams.png"), "label": "7. Lasers & Lights: Dual Beams, 0 Lag, Light in Reload"},
        {"path": os.path.join(REVIEW_DIR, "brass-burst-shot-02.png"), "label": "8. Brass Ejection: Directly from View Gun's Port"}
    ]
    create_grid(master_items, cols=4, out_path=os.path.join(REVIEW_DIR, "cl326-cl327-master-review-sheet.jpg"),
                thumb_w=440, thumb_h=248,
                title="AG-273: Master Visual Verification on RTX 5080 (CL-326 Part 2 & CL-327)",
                subtitle="Jerry's Order J93 (D-126): 8 First-Person Kinematic & Weapon Fixes Verified on Hardware")

    print("[BUILD-SHEETS] All 9 contact sheets generated successfully.")

if __name__ == "__main__":
    build_all()
