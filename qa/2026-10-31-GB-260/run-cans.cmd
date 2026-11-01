@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
copy /Y "qa\2026-10-31-GB-260\index.before-cans.html" ".tmp-gb260-cans-before.html" > nul
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 can probe: the four new can sizes in the table's mm" --minutes 25 -- node qa/2026-10-31-GB-260/probe2.mjs after4 > "qa\2026-10-31-GB-260\after4-probe.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 real renderer: the cans, six checks" --minutes 40 -- node tools/realtest.mjs t121 t217 t242 t277 t38 t194 > "qa\2026-10-31-GB-260\real6.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 test page: the cans, six checks" --minutes 40 -- node tools/tests/run-all.mjs t121 t217 t242 t277 t38 t194 --jobs 1 --agent grokbot --task GB-260 > "qa\2026-10-31-GB-260\page7.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 can shots before" --minutes 30 -- node tools/gunsheet.mjs gun-m4 gun-ak gun-pistol gun-uzi gun-sniper gun-shotgun --page .tmp-gb260-cans-before.html --out qa\2026-10-31-GB-260\cans-before > "qa\2026-10-31-GB-260\gunsheet-before.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 can shots after" --minutes 30 -- node tools/gunsheet.mjs gun-m4 gun-ak gun-pistol gun-uzi gun-sniper gun-shotgun --out qa\2026-10-31-GB-260\cans-after > "qa\2026-10-31-GB-260\gunsheet-after.log" 2>&1
del /Q ".tmp-gb260-cans-before.html" > nul 2>&1
echo DONE >> "qa\2026-10-31-GB-260\ran-cans.txt"
