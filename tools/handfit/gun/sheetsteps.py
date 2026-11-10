# the hands on every gun, close: the firing hand from its left and its right (the support arm hidden), the support hand from
# below-left (the firing arm hidden); one shot a step (the page's memory)
import json, sys, re
k14 = json.load(open('/home/claude/fpshot/k14-0.json'))
pi0 = k14[0]['js']
setj = k14[1]['js']   # s-pistol-set
src = open('/home/claude/gs306/game/viewmodel-poses.js').read()
def pt(key, field):
    m = re.search(r'^  ' + key + r': \{[^\n]*?' + field + r': \[([-0-9., ]+)\]', src, re.M) or re.search(r'^  ' + key + r': \{.*?\n(?:.*\n){0,3}?.*?' + field + r': \[([-0-9., ]+)\]', src, re.M)
    return [float(x) for x in m.group(1).split(',')] if m else None
keys = sys.argv[2].split(',')
steps = [{"name": "pi-0", "js": pi0, "wait": 300}]
for k in keys:
    g = pt(k, 'grip') or [0, -0.08, -0.05]; s = pt(k, 'support') or [0, -0.07, 0.3]
    steps.append({"name": f"s-{k}-set", "js": setj.replace("'pistol'", "'" + k + "'"), "wait": 300})
    for nm, at, off, hide in ((f'{k}-gripL', g, [-0.3, 0.04, 0.06], 'l'), (f'{k}-gripR', g, [0.3, 0.04, 0.02], 'l'), (f'{k}-support', s, [-0.26, -0.08, 0.05], 'r')):
        steps.append({"name": nm, "js": f"await __w(6000); return {{ shots: {{ '{nm}': window.__shotG({json.dumps(at)}, {json.dumps(off)}, '{hide}') }} }};", "wait": 300, "noPresent": True})
json.dump(steps, open(sys.argv[1], 'w'))
print(len(steps), 'steps')
