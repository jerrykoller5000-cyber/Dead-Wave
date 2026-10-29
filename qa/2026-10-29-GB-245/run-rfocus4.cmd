@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 candidate setting on every long gun: reload tilt off, cant 0.40/0.50, per-hand pixels" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2.mjs m4,ak,aa12,shotgun,sniper,launcher,uzi 0.2,0.35,0.5,0.65,0.8 qa/2026-10-29-GB-245/grid10.json rfocus4 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\rfocus4.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-rfocus4.txt"