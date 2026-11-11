# cloud (CD-1 fixes 4): ex6-<gun>.json from ex4-<gun>.json (run mkst3.py, mkst4.py first): the gun taken directly (the old take
# cycled through every gun and the page crashed at the raise on the heavier tree) and the raise stepped in 40-frame chunks
import json, glob
for f in glob.glob('/home/claude/fpshot/ex4-*.json'):
    s = json.load(open(f)); a = s[1]['js']; key = f.split('ex4-')[1][:-5]; pre = "const key = '%s'; " % key
    s[1]['js'] = a.replace('await __take(key)', "if (T.isUnarmed && T.isUnarmed()) T.toggleHolster(); T.setWeapon(T.WEAPON_ORDER.indexOf(key)); await __w(2500); if (T.getCurrentWeapon() !== key) await __take(key)")
    A = [{"name": "A2" + c, "js": pre + "for (let i = 0; i < 40 && !(vm().info.active && vm().info.key === key && vm().info.raise > 0.999); i++) T.stepFrame(1/60); await __w(1500); return vm().info.raise;", "wait": 2500} for c in 'abcdef']
    A.append({"name": "A2g", "js": pre + "for (let i = 0; i < 45; i++) T.stepFrame(1/60); await __w(1500); return vm().info.raise;", "wait": 2500})
    A.append({"name": "A2h", "js": pre + "const __mi = T.marineIdleDbg && T.marineIdleDbg(); for (let i = 0; i < 45; i++) T.stepFrame(1/60); __mi && __mi.reset && __mi.reset(); T.stepFrame(1/60); return vm().info.raise;", "wait": 4000})
    json.dump(s[:2] + A + s[3:], open(f.replace('/ex4-', '/ex6-'), 'w'))
print('ok')
