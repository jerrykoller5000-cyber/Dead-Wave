@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 real: t242 t217 t277 t38 t194 t121 on the final mag sizes" --minutes 35 -- node tools/realtest.mjs t242 t217 t121 t277 t38 t194 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\real5.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 final probe: magazine sizes in the table's mm" --minutes 25 -- node qa/2026-10-31-GB-260/probe2.mjs final > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\final-probe.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-real5.txt"