@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 uzi: negative tip (muzzle up) to swing the magwell to his eye, per-hand glove pixels + ndc" --minutes 30 -- node qa/2026-10-29-GB-245/rfocus3b.mjs uzi 0.1,0.25,0.4,0.55,0.7,0.85 qa/2026-10-29-GB-245/grid19.json rfocus12 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus12.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus12.txt"
