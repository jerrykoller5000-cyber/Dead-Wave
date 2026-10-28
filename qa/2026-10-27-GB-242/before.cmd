@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-242 --checks "wire before shots, 4 lights" -- cmd /c "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-242\shots.cmd" before > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-242\before.log" 2>&1

