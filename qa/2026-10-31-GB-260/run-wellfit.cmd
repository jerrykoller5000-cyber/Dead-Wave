@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 wells: each magazine's cross-section against its well's opening" --minutes 15 -- node qa/2026-10-31-GB-260/wellfit.mjs > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\wellfit.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-wellfit.txt"