import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = r"C:\Users\Zero\Desktop\Tiny Trek"
GP_DIR = os.path.join(ROOT, "review", "GP-20021")
AG225_DIR = os.path.join(ROOT, "qa", "2026-11-03-AG-225", "stills")
REF_DIR = os.path.join(ROOT, "review", "weapon-photos", "AG-Weapons")
OUT_DIR = os.path.join(ROOT, "qa", "2026-11-03-AG-227")

WEAPONS = [
    {
        "key": "launcher",
        "name": "Launcher",
        "ref": os.path.join(REF_DIR, "Launcher", "launcher-refined-v3.jpg"),
        # Receiver focus crop box in 1080p: [x1, y1, x2, y2]
        "crop": (1100, 520, 1650, 950)
    },
    {
        "key": "aa12",
        "name": "Breacher-12 (AA-12)",
        "ref": os.path.join(REF_DIR, "AA-12", "aa12-refined-v2.jpg"),
        "crop": (1100, 500, 1680, 950)
    },
    {
        "key": "flamer",
        "name": "Flamer",
        "ref": os.path.join(REF_DIR, "Flamer", "flamer-refined-v2.jpg"),
        "crop": (1100, 480, 1650, 930)
    },
    {
        "key": "shotgun",
        "name": "Shotgun",
        "ref": os.path.join(REF_DIR, "Shotgun", "shotgun-refined-v2.jpg"),
        "crop": (1100, 500, 1650, 920)
    }
]

LIGHTS = ["noon", "overcast", "dusk", "night"]

def compute_metrics(img_arr, crop_box):
    x1, y1, x2, y2 = crop_box
    crop = img_arr[y1:y2, x1:x2].astype(np.float32)
    # Luminance formula: 0.299*R + 0.587*G + 0.114*B
    lum = 0.299 * crop[:, :, 0] + 0.587 * crop[:, :, 1] + 0.114 * crop[:, :, 2]
    
    # We want to measure the gun pixels specifically (darker/structured objects against background)
    # Background in woods trail is sky/trees or terrain, but in receiver area gun occupies significant area
    mean_lum = float(np.mean(lum))
    median_lum = float(np.median(lum))
    p10 = float(np.percentile(lum, 10))
    p90 = float(np.percentile(lum, 90))
    contrast_ratio = float((p90 - p10) / (p90 + p10 + 1e-5))
    
    # Sobel gradient approximation for edge energy
    gx = np.abs(lum[:, 1:] - lum[:, :-1])
    gy = np.abs(lum[1:, :] - lum[:-1, :])
    edge_energy = float(np.mean(gx) + np.mean(gy))
    
    return {
        "mean_lum": round(mean_lum, 2),
        "median_lum": round(median_lum, 2),
        "p10": round(p10, 2),
        "p90": round(p90, 2),
        "contrast_ratio": round(contrast_ratio, 4),
        "edge_energy": round(edge_energy, 3)
    }

telemetry = {
    "evaluation": "AG-227 GP-20021 Material & Contrast Audit",
    "date": "2026-11-03",
    "author": "Antigravity (Gemini 4 Argon High)",
    "weapons": {}
}

for w in WEAPONS:
    w_key = w["key"]
    telemetry["weapons"][w_key] = {"lights": {}}
    for light in LIGHTS:
        gp_path = os.path.join(GP_DIR, f"{w_key}-{light}.jpg")
        ag_path = os.path.join(AG225_DIR, f"{w_key}-hip-{light}.jpg")
        
        gp_img = Image.open(gp_path).convert("RGB")
        ag_img = Image.open(ag_path).convert("RGB")
        
        gp_arr = np.array(gp_img)
        ag_arr = np.array(ag_img)
        
        gp_met = compute_metrics(gp_arr, w["crop"])
        ag_met = compute_metrics(ag_arr, w["crop"])
        
        lift_ratio = round(gp_met["mean_lum"] / (ag_met["mean_lum"] + 1e-5), 3)
        edge_ratio = round(gp_met["edge_energy"] / (ag_met["edge_energy"] + 1e-5), 3)
        
        telemetry["weapons"][w_key]["lights"][light] = {
            "gp20021": gp_met,
            "ag225_baseline": ag_met,
            "lum_lift_ratio": lift_ratio,
            "edge_energy_ratio": edge_ratio
        }

with open(os.path.join(OUT_DIR, "telemetry.json"), "w") as f:
    json.dump(telemetry, f, indent=2)

print("Telemetry calculated and saved successfully.")
