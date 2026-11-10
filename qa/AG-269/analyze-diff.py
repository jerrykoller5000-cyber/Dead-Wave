import os
import json
from PIL import Image

QA_DIR = r"C:\Users\Zero\Desktop\Tiny Trek\qa\AG-269"

def compute_diff(p1, p2, crop_box=None):
    if not (os.path.exists(p1) and os.path.exists(p2)):
        return None
    im1 = Image.open(p1).convert('RGB')
    im2 = Image.open(p2).convert('RGB')
    if crop_box:
        im1 = im1.crop(crop_box)
        im2 = im2.crop(crop_box)
    
    d1 = list(im1.getdata())
    d2 = list(im2.getdata())
    if len(d1) != len(d2):
        return None
    
    total_delta = 0
    max_delta = 0
    for (r1, g1, b1), (r2, g2, b2) in zip(d1, d2):
        delta = (abs(r1 - r2) + abs(g1 - g2) + abs(b1 - b2)) / 3.0
        total_delta += delta
        if delta > max_delta:
            max_delta = delta
            
    mean_delta = total_delta / len(d1)
    return {"mean": mean_delta, "max": max_delta}

def main():
    print("=== AG-269 Frame Difference & Camo Pop Analysis ===")
    
    # 1. Check Walk Steps
    print("\n--- Walk Steps Consecutive Frame Diff (Bottom-Right Arm Area vs Full Frame) ---")
    for i in range(11):
        f1 = os.path.join(QA_DIR, f"ag269-02-walk-step-{i}.png")
        f2 = os.path.join(QA_DIR, f"ag269-02-walk-step-{i+1}.png")
        
        # Test full frame
        full_diff = compute_diff(f1, f2)
        # Test bottom-right arm area (45% to 100% X, 40% to 100% Y)
        arm_diff = compute_diff(f1, f2, crop_box=(int(1920 * 0.45), int(1080 * 0.4), 1920, 1080))
        
        if full_diff and arm_diff:
            print(f"Step {i:2d} -> {i+1:2d} | Full Mean: {full_diff['mean']:5.2f} (Max: {full_diff['max']:3.0f}) | Arm Mean: {arm_diff['mean']:5.2f} (Max: {arm_diff['max']:3.0f})")

    # 2. Check Telemetry
    telemetry_path = os.path.join(QA_DIR, "telemetry.json")
    if os.path.exists(telemetry_path):
        with open(telemetry_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        print(f"\nAudit Timestamp: {data.get('auditTimestamp')}")
        print(f"GPU Renderer: {data.get('gpuRenderer')}")
        
        # Joint audit
        joints = data.get("jointAudit", [])
        print(f"\n--- Sphere Meshes / Elbow Joints Audit ({len(joints)} meshes found) ---")
        for j in joints:
            print(f"Name: {j['name']} | Parent: {j['parentName']} / {j['parentParentName']}")
            print(f"  Visible: {j['visible']} | vmEyeHide: {j['vmEyeHide']} | MatMap: {j['matMap']}")
            print(f"  Scale: {j['scale']}")
            print(f"  World Edge Len: {j['worldEdgeLen']:.5f} m | UV Delta: {j['uvDeltaLen']:.5f}")
            print(f"  Repeats/Metre: {j['repeatsPerMetre']:.2f} repeats/m")
            
        # Wall / Armory meshes
        walls = data.get("wallAudit", [])
        print(f"\n--- Close-Up Armory & Wall Audit ({len(walls)} meshes checked) ---")
        hidden_walls = [w for w in walls if not w['visible']]
        print(f"  Total meshes: {len(walls)} | Hidden/Culled: {len(hidden_walls)}")
        for w in walls[:10]:
            print(f"  Mesh: {w['name']} | Visible: {w['visible']} | Mat: {w['materialName']}")

if __name__ == "__main__":
    main()
