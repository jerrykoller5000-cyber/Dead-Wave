@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-228 --checks "before shots: each gun reload from his eyes + mount peaks" --minutes 45 -- node "qa/2026-10-28-GB-228/shots.mjs" before > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-228\before.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-228\ran-before.txt"
