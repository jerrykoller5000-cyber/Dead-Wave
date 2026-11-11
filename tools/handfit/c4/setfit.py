# setfit.py '<gun>' '<r|l>' '<json {basis, p, pose}>' : one hand of VM_FIT set (cloud copy), every other hand kept
import json, sys, subprocess
F = '/home/claude/gs306/game/viewmodel-fit.js'
cur = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
cur.setdefault(sys.argv[1], {})[sys.argv[2]] = json.loads(sys.argv[3])
src = open(F).read(); head = src[:src.index('export const VM_FIT')]
body = 'export const VM_FIT = Object.freeze({\n' + ',\n'.join(f"  {k}: {{ " + ', '.join(f"{sd}: {json.dumps(v, separators=(', ', ': '))}" for sd, v in sorted(cur[k].items())) + ' }' for k in sorted(cur)) + '\n});\n'
open(F, 'w').write(head + body)
