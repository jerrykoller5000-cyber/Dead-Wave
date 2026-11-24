import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.getcwd()
BEFORE = os.path.join(ROOT, 'qa', 'AG-410', 'before')
AFTER = os.path.join(ROOT, 'qa', 'AG-410', 'after')
OUT = os.path.join(ROOT, 'review', 'AG-410')
os.makedirs(OUT, exist_ok=True)

SHEETS = [
    ('ba-1.jpg', 'AG-410 Sidearms & Longarms (1/5)', [
        ('01-pistol.png', 'Tactical Pistol'),
        ('02-revolver.png', 'Heavy Revolver (Blued & Walnut)'),
        ('03-uzi.png', 'Wasp-9 SMG (Suppressed)'),
        ('04-m4.png', 'GW-4 Carbine (Factory)'),
        ('05-m4-camo.png', 'GW-4 Carbine (Multicam + PBR)'),
        ('06-ak-wood.png', 'KR-7 Assault Rifle (Birch Wood)'),
    ]),
    ('ba-2.jpg', 'AG-410 Shotguns, Sniper & Heavy (2/5)', [
        ('07-shotgun.png', '12ga Pump Shotgun'),
        ('08-aa12.png', 'Breacher Auto-Shotgun'),
        ('09-sniper.png', 'Precision Sniper Rifle'),
        ('10-minigun.png', 'M134 Rotary Minigun'),
        ('11-launcher.png', '40mm Rotary Grenade Launcher'),
        ('12-flamer.png', 'Dual-Tank Flamethrower'),
    ]),
    ('ba-3.jpg', 'AG-410 Chainsaw & Melee Weapons (3/5)', [
        ('13-chainsaw.png', 'Combat Chainsaw'),
        ('14-knife.png', 'Combat Knife'),
        ('15-machete.png', 'Combat Machete'),
        ('16-katana.png', 'Crimson Katana'),
        ('17-katana-sheathed.png', 'Sheathed Katana'),
    ]),
    ('ba-4.jpg', 'AG-410 Emplaced & Thrown Weapons (4/5)', [
        ('18-m240.png', 'Watchman M240 HMG'),
        ('19-mortar.png', '81mm Field Mortar'),
        ('20-mortar-round.png', 'M29A1 81mm Mortar Round'),
        ('21-frag-grenade.png', 'M67 Frag Grenade'),
        ('22-holy-grenade.png', 'Holy Hand Grenade'),
    ]),
    ('ba-5.jpg', 'AG-410 First-Person Four-Light Gameplay (5/5)', [
        ('23-fp-m4-noon.png', '1P GW-4 Carbine · Noon'),
        ('24-fp-ak-noon.png', '1P KR-7 Birch Wood · Noon'),
        ('25-fp-revolver-overcast.png', '1P Revolver · Overcast'),
        ('26-fp-flamer-dusk.png', '1P Flamethrower · Dusk'),
        ('27-fp-pistol-night.png', '1P Tactical Pistol · Night + Light'),
        ('28-fp-m4-camo-dusk.png', '1P GW-4 Multicam · Dusk'),
    ]),
]

def load_font(size):
    for p in ['C:/Windows/Fonts/consola.ttf', 'C:/Windows/Fonts/arial.ttf']:
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()

FONT_H = load_font(22)
FONT_L = load_font(16)

TW, TH = 720, 405
PAD, HDR, ROW_HDR = 12, 44, 24

for fname, title, items in SHEETS:
    rows = len(items)
    W = PAD * 3 + TW * 2
    H = HDR + rows * (ROW_HDR + TH + PAD) + PAD
    canvas = Image.new('RGB', (W, H), (18, 20, 24))
    draw = ImageDraw.Draw(canvas)
    draw.text((PAD, 10), f'{title}   |   LEFT: BEFORE   |   RIGHT: AFTER', fill=(235, 240, 248), font=FONT_H)
    for r, (img_name, label) in enumerate(items):
        y = HDR + r * (ROW_HDR + TH + PAD)
        draw.text((PAD, y + 2), f'BEFORE · {label}', fill=(185, 195, 210), font=FONT_L)
        draw.text((PAD * 2 + TW, y + 2), f'AFTER · {label}', fill=(160, 235, 180), font=FONT_L)
        for ci, base in enumerate([BEFORE, AFTER]):
            p = os.path.join(base, img_name)
            x = PAD + ci * (TW + PAD)
            if os.path.exists(p):
                im = Image.open(p).convert('RGB').resize((TW, TH), Image.LANCZOS)
                canvas.paste(im, (x, y + ROW_HDR))
            else:
                draw.rectangle([x, y + ROW_HDR, x + TW, y + ROW_HDR + TH], outline=(90, 40, 40), width=2)
                draw.text((x + 20, y + ROW_HDR + 20), f'MISSING: {p}', fill=(240, 120, 120), font=FONT_L)
    out_path = os.path.join(OUT, fname)
    canvas.save(out_path, 'JPEG', quality=91)
    print('saved', out_path)
