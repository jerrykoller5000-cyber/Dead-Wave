# cloud: st3-<gun>.json (setup, A1 take, A2 raise) and ex-<gun>.json (st3 + B + export) from g9-steps.json
import json, sys
g9 = json.load(open('/home/claude/gs306/tools/handfit/c4/g9-steps.json'))
setup = g9[0]
for e in g9[1:]:
    key = e['name'][2:]
    js = e['js']
    head, rest = js.split('\n', 1)
    # head: take..raise..; split it into A1 (take) and A2 (raise and settle)
    i = head.index('T.setOtsAimDbg')
    j = head.index('for (let i = 0; i < 240')
    k = head.index('const V = vm();')
    pre = f"const key = '{key}'; const __mi = T.marineIdleDbg && T.marineIdleDbg(); "
    A1 = head[:j] + ' return 1;'
    A2 = pre + head[j:k] + ' return vm().info.raise;'
    exp = pre + head[k:] + '\n' + rest
    st3 = [setup, {"name": "A1", "js": A1, "wait": 4000}, {"name": "A2", "js": A2, "wait": 4000}]
    json.dump(st3, open(f'/home/claude/fpshot/st3-{key}.json', 'w'))
    B = {"name": "B", "js": "for (let i = 0; i < 3; i++) { T.stepFrame(0.0001); await new Promise((r) => requestAnimationFrame(r)); } return 1;", "wait": 6000}
    json.dump(st3 + [B, {"name": "E", "js": exp, "wait": 3000}], open(f'/home/claude/fpshot/ex-{key}.json', 'w'))
print('ok')
