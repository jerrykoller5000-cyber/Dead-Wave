@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-228 --checks "t188 on the real renderer after the dip fix" --minutes 30 -- node tools/realtest.mjs t188 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-228\t188.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-228\t188-ran.txt"
