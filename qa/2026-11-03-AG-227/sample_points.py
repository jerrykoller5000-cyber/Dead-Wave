import os
import json
import numpy as np
from PIL import Image

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
GP_DIR = os.path.join(ROOT, "review", "GP-20021")
AG225_DIR = os.path.join(ROOT, "qa", "2026-11-03-AG-225", "stills")

# Let's inspect specific sample points on the receiver, barrel, furniture, and edge bevels
# for each weapon in Noon and Dusk to give ChatGPT precise, actionable numbers and feedback!

points = {
    "launcher": {
        # pixel coordinates in 1920x1080 frame
        "receiver_flat": (1350, 750),
        "receiver_bevel_edge": (1380, 680),
        "furniture_grip": (1290, 800),
        "barrel_tube": (1250, 620)
    },
    "aa12": {
        "receiver_main_plate": (1380, 720),
        "receiver_bevel_edge": (1420, 650),
        "drum_mag": (1280, 820),
        "barrel_sight": (1320, 580)
    },
    "flamer": {
        "receiver_casing": (1360, 720),
        "valve_housing": (1260, 680),
        "nozzle_assembly": (1280, 560),
        "fuel_tank": (1450, 800)
    },
    "shotgun": {
        "receiver_side_plate": (1360, 700),
        "receiver_bevel_edge": (1380, 630),
        "forend_pump": (1280, 620),
        "barrel": (1320, 540)
    }
}

results = {}

for w_key, pts in points.items():
    results[w_key] = {}
    for light in ["noon", "dusk"]:
        gp_img = np.array(Image.open(os.path.join(GP_DIR, f"{w_key}-{light}.jpg")).convert("RGB"))
        ag_img = np.array(Image.open(os.path.join(AG225_DIR, f"{w_key}-hip-{light}.jpg")).convert("RGB"))
        
        results[w_key][light] = {}
        for pt_name, (x, y) in pts.items():
            gp_color = gp_img[y-2:y+3, x-2:x+3].mean(axis=(0, 1)).astype(int).tolist()
            ag_color = ag_img[y-2:y+3, x-2:x+3].mean(axis=(0, 1)).astype(int).tolist()
            
            # luminance
            gp_lum = round(0.299*gp_color[0] + 0.587*gp_color[1] + 0.114*gp_color[2], 1)
            ag_lum = round(0.299*ag_color[0] + 0.587*ag_color[1] + 0.114*ag_color[2], 1)
            
            results[w_key][light][pt_name] = {
                "coords": [x, y],
                "gp_rgb": gp_color,
                "ag_rgb": ag_color,
                "gp_lum": gp_lum,
                "ag_lum": ag_lum,
                "delta_lum": round(gp_lum - ag_lum, 1)
            }

print(json.dumps(results, indent=2))
