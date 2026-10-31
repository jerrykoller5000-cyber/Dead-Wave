@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 real: pistol mag fit, cans, sights, reload" --minutes 30 -- node tools/realtest.mjs t242 t217 t121 t277 t38 t194 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\real1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-real1.txt"