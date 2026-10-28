@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-241 --checks "t75 crowd diagnostic" -- node tools/realtest.mjs x75diag --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-241\diag.log" 2>&1

