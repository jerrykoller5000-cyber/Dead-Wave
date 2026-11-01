@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 can probe v2: the four corrected can sizes in the table's mm" --minutes 25 -- node qa/2026-10-31-GB-260/probe2.mjs after5 > "qa\2026-10-31-GB-260\after5-probe.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 real renderer v2: the cans, six checks" --minutes 40 -- node tools/realtest.mjs t121 t217 t242 t277 t38 t194 > "qa\2026-10-31-GB-260\real7.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 test page v2: the cans, six checks" --minutes 40 -- node tools/tests/run-all.mjs t121 t217 t242 t277 t38 t194 --jobs 1 --agent grokbot --task GB-260 > "qa\2026-10-31-GB-260\page8.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 can shots v2" --minutes 30 -- node tools/gunsheet.mjs gun-m4 gun-ak gun-pistol gun-uzi --out qa\2026-10-31-GB-260\cans-after2 > "qa\2026-10-31-GB-260\gunsheet-after2.log" 2>&1
echo DONE >> "qa\2026-10-31-GB-260\ran-cans2.txt"
