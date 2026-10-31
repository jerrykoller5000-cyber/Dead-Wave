@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 before: magazine and suppressor sizes, builder and visual mm" --minutes 25 -- node qa/2026-10-31-GB-260/probe.mjs after > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\after-probe.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-after.txt"