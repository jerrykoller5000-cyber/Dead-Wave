@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 real: the pistol mag fit and the six cans again after the GW-4 change" --minutes 30 -- node tools/realtest.mjs t242 t217 t121 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\real3.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-real3.txt"