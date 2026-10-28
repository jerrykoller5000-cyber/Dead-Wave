@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-241 --checks "t69 test page + real" -- cmd /c "node tools/tests/run-all.mjs t69 --jobs 1 & node tools/realtest.mjs t69 --all" > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-241\t69.log" 2>&1

