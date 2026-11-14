import json,sys
d=json.load(open(sys.argv[1]))
for k,v in d.items():
  for kk,r in v.items():
    if 'thigh' in kk and 'leg<' in kk: continue   # the thigh holster's gun in its molded holster vs the trouser (hidden; thigh stations unchanged)
    print(f"{k:16s} {kk:44s} n={r['n']:5d} {r['mm']:5.1f}mm {r['at'][3] if len(r['at'])>3 else ''}")
