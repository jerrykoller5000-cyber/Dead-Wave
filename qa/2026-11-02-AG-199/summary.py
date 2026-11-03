import json

with open(r'C:\Users\Zero\Desktop\Tiny Trek\qa\2026-11-02-AG-199\ag199-telemetry.json') as f:
    d = json.load(f)

print(f"Backend: {d['backend']}")
for w in d['weapons']:
    shots = d[w]['shots']
    print(f"\n=== {w.upper()} ===")
    min_dist = min(s['near']['closest'] for s in shots.values() if s.get('near') and s['near']['closest'] != float('inf'))
    hip = shots['1-hip']
    ads = shots['2-ads']
    print(f"  Min near-plane distance: {min_dist*100:.1f} cm (buffer > {min_dist*100 - 1.0:.1f} cm)")
    print(f"  Hip forearm angles: R={hip['forearm']['r']['ang']} deg, L={hip['forearm']['l']['ang']} deg")
    print(f"  Hip elbow NDC Y: R={hip['forearm']['r']['ey']}, L={hip['forearm']['l']['ey']}")
    print(f"  ADS forearm angles: R={ads['forearm']['r']['ang']} deg, L={ads['forearm']['l']['ang']} deg")
    print(f"  ADS elbow NDC Y: R={ads['forearm']['r']['ey']}, L={ads['forearm']['l']['ey']}")
    print(f"  Stock visible in view: {ads['stockVisibleInView']}")
    print(f"  ADS root visible: {ads['visible']}")
    max_sock = max(max(s['sockErr']['r'], s['sockErr']['l']) for s in shots.values())
    max_wrist_r = max(s['wrist']['r'] for s in shots.values())
    max_wrist_l = max(s['wrist']['l'] for s in shots.values())
    print(f"  Max socket error: {max_sock:.2e} m")
    print(f"  Max wrist bends: R={max_wrist_r:.3f} rad, L={max_wrist_l:.3f} rad (max allowed: 0.870 rad)")
    print(f"  Reload finished: {d[w]['reloadCycle'].get('finished')}")
    # Check reload beats
    for beat_name in ['4-reload-2', '5-reload-45', '6-reload-7', '7-reload-9']:
        b = shots[beat_name]
        print(f"    {beat_name}: place={b['handPlace']}, mag={b['magState']}, shell={b.get('hasShell')}, near={b['near']['closest']*100:.1f} cm")
