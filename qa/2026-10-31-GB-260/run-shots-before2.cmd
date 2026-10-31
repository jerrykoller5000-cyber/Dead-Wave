@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 before2 shots: pistol and GW-4 magazines as they were" --minutes 25 -- node qa/2026-10-31-GB-260/shots2.mjs before2 pistol,m4 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\shots-before2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-shots-before2.txt"