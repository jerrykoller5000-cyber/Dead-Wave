@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-231 --checks "t282 real renderer (close-out)" -- node tools/realtest.mjs t282 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-231\t282.log" 2>&1

