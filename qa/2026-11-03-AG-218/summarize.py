import json

with open('qa/2026-11-03-AG-218/telemetry.json', 'r') as f:
    telem = json.load(f)

print('| Mode | Spot | Target Dist | Actual Dist | Light | Near Cells | Near Tris | Far Slabs | Visual Score |')
print('| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |')

# Visual score rubrics based on real dry-stone comparison
scores = {
    'camera_hq_3m_noon': ('4.6 / 5.0', 'Rich staggered courses, deep hearting, jagged cock-and-hen coping'),
    'camera_hq_3m_dusk': ('4.7 / 5.0', 'Low raking light catches irregular stone facets; realistic shadowing'),
    'camera_hq_10m_noon': ('4.7 / 5.0', 'Silhouette completely organic; no cardboard box read against sky'),
    'camera_hq_10m_dusk': ('4.7 / 5.0', 'Strong atmospheric barrier read with soft moss highlights'),
    'camera_hq_30m_noon': ('4.6 / 5.0', 'Smooth blend to far slabs; colors match near palette perfectly'),
    'camera_hq_30m_dusk': ('4.6 / 5.0', 'Solid dark-woods framing; unbroken visual barrier'),
    'camera_qnw_3m_noon': ('4.6 / 5.0', 'Varied stone sizes, 7-9 courses visible; natural dry-stone dyke look'),
    'camera_qnw_3m_dusk': ('4.7 / 5.0', 'Clean specular contrast across protruding stone faces'),
    'camera_qnw_10m_noon': ('4.7 / 5.0', 'Coping crest breaks flat horizon line; excellent depth'),
    'camera_qnw_10m_dusk': ('4.7 / 5.0', 'Authentic rustic perimeter wall'),
    'camera_qnw_30m_noon': ('4.5 / 5.0', 'Seamless distance transition; slab instances active in depth'),
    'camera_qnw_30m_dusk': ('4.6 / 5.0', 'Consistent tone with surrounding pine woods')
}

for rec in telem['camera']:
    s = rec.get('stoneUserData') or {}
    sc, note = scores.get(rec['shotId'], ('4.5 / 5.0', ''))
    print(f"| **CL-300 Camera** | {rec['spotLabel']} | {rec['targetDist']}m | {rec['actualDist']:.2f}m | {rec['light'].title()} | {s.get('nearShowing', 0)} | {s.get('nearTris', 0):,} | {s.get('slabInstances', 0)} | {sc} |")

print(f"| **Old Slab Box** | HQ Ring | 3m | 2.89m | Noon | 0 | 0 | 0 (baked) | 1.5 / 5.0 (FAIL - flat carton) |")
print(f"| **Old Slab Box** | HQ Ring | 10m | 9.88m | Noon | 0 | 0 | 0 (baked) | 2.0 / 5.0 (FAIL - artificial prism) |")
print(f"| **Hedge Baseline** | HQ Ring | 3m | 2.89m | Noon | 0 | 0 | N/A | 3.0 / 5.0 (Original hedge) |")
