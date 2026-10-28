@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-242 --checks "wire after shots, 4 lights" -- cmd /c "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-242\shots.cmd" after > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-242\after.log" 2>&1
node crew/crew.mjs slot run grokbot GB-242 --checks "t13 t215 t95 real + test page" -- cmd /c "node tools/realtest.mjs t13 t215 t95 --all & node tools/tests/run-all.mjs t13 t215 t95 --jobs 1" > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-242\tests.log" 2>&1

