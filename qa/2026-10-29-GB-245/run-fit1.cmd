@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 fit: wrist screen positions over a lift/tip grid" --minutes 45 -- node qa/2026-10-29-GB-245/fit.mjs fit1 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\fit1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-fit1.txt"
