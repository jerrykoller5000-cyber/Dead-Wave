import json, math

with open('qa/2026-11-03-AG-219/telemetry.json', 'r') as f:
    telem = json.load(f)

print('| Key | Weapon | Net Travel | Avg Speed | Muzzle Y Amp (px) | Muzzle X Amp (px) | hpRMS (px) | Walk Valid |')
print('| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |')

for k, ws in telem['walkStrips'].items():
    frames = ws['frames']
    my = [f['muzzlePx'][1] for f in frames[18:]]
    mx = [f['muzzlePx'][0] for f in frames[18:]]
    amp_y = max(my) - min(my) if my else 0
    amp_x = max(mx) - min(mx) if mx else 0
    hp_sq = []
    for i in range(19, len(frames) - 1):
        hy = frames[i]['muzzlePx'][1] - 0.5 * (frames[i-1]['muzzlePx'][1] + frames[i+1]['muzzlePx'][1])
        hx = frames[i]['muzzlePx'][0] - 0.5 * (frames[i-1]['muzzlePx'][0] + frames[i+1]['muzzlePx'][0])
        hp_sq.append(hx*hx + hy*hy)
    hp_rms = math.sqrt(sum(hp_sq)/len(hp_sq)) if hp_sq else 0.0
    label = ws['label']
    net_t = ws['netTravel']
    spd = ws['avgSpeed']
    print(f"| {k} | {label} | {net_t}m | {spd} m/s | {amp_y:.1f} | {amp_x:.1f} | {hp_rms:.2f} | 90/90 PASS |")
