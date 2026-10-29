@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 uzi: muzzle-down tip turning the magwell up to his eye, per-hand glove pixels + ndc" --minutes 30 -- node qa/2026-10-29-GB-245/rfocus3b.mjs uzi 0.1,0.25,0.4,0.55,0.7,0.85 qa/2026-10-29-GB-245/grid18.json rfocus11 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus11.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus11.txt"
