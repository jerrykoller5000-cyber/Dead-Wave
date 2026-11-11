# mktune.py (CD-1 fixes, cloud): the steps to place one hand by V.info.tune and export it; reads /home/claude/fpshot/st3-<gun>.json
# mktune.py <gun> <sd> <init file> <out steps> : setup, take, raise, the hand set by V.info.tune, export (<gun>-<sd>-init.json)
import json, sys
gun, sd, initf, out = sys.argv[1:5]
init = json.load(open(initf)) if initf.endswith('.json') else json.loads(open(initf).read().strip().splitlines()[-1])
s = json.load(open(f'/home/claude/fpshot/st3-{gun}.json'))
eb = open('/home/claude/gs306/tools/handfit/c4/export-block.js').read()
T1 = f"const key='{gun}', sd='{sd}', I = {json.dumps(init)}; const V = vm(); const t = V.info.tune[key] = V.info.tune[key] || {{}}; t[sd === 'r' ? 'poseR' : 'poseL'] = I.pose; t[sd] = {{ basis: I.basis, p: I.p }}; V.retune(); for (let i = 0; i < 50; i++) T.stepFrame(1 / 30); return 1;"
E = f"const key='{gun}', sd='{sd}';\n" + eb + "\nif (__exp && __exp.__file) { const f = {}; for (const [k, val] of Object.entries(__exp.__file)) f[key + '-' + sd + '-init.json'] = val; __exp.__file = f; }\nreturn { ...__exp };"
B = {"name": "B", "js": "for (let i = 0; i < 3; i++) { T.stepFrame(0.0001); await new Promise((r) => requestAnimationFrame(r)); } return 1;", "wait": 6000}
json.dump([s[0], s[1], s[2], {"name": "T1", "js": T1, "wait": 6000}, B, {"name": "E", "js": E, "wait": 3000}], open(out, 'w'))
