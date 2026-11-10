# merge apply results (STEP a-<gun>-<r|l> {... apply: {final, iters}}) into game/viewmodel-fit.js, keeping every other hand
import json, sys, re, subprocess
F = '/home/claude/gs306/game/viewmodel-fit.js'
cur = json.loads(subprocess.check_output(['node', '-e', f"import('{F}').then(m=>console.log(JSON.stringify(m.VM_FIT)))"]))
for log in sys.argv[1:]:
    for line in open(log, errors='replace'):
        m = re.match(r'^STEP a-(\w+)-([rl]) (\{.*\})\s*$', line)
        if not m: continue
        A = json.loads(m.group(3)).get('apply')
        if not A: continue
        it = A['iters'][-1]; ok = it[0] <= 0.5 and it[1] <= 0.01
        print(m.group(1), m.group(2), 'iters', A['iters'], 'ok' if ok else 'NOT CONVERGED')
        if ok or __import__('os').environ.get('ALL') == '1': cur.setdefault(m.group(1), {})[m.group(2)] = A['final']
src = open(F).read(); head = src[:src.index('export const VM_FIT')]
body = 'export const VM_FIT = Object.freeze({\n' + ',\n'.join(f"  {k}: {{ " + ', '.join(f"{sd}: {json.dumps(v, separators=(', ', ': '))}" for sd, v in sorted(cur[k].items())) + ' }' for k in sorted(cur)) + '\n});\n'
open(F, 'w').write(head + body)
