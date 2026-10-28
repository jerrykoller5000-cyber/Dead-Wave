@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-232 --checks "t215 t95 t304 t148 t292 t75 t69 test page" -- node tools/tests/run-all.mjs t215 t95 t304 t148 t292 t75 t69 --jobs 1 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-232-places\run.log" 2>&1
node crew/crew.mjs slot run grokbot GB-232 --checks "t215 t95 t304 t148 t75 t69 real renderer" -- node tools/realtest.mjs t215 t95 t304 t148 t75 t69 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-232-places\real.log" 2>&1

node crew/crew.mjs slot run grokbot GB-241 --checks "t75 crowd diagnostic x75diag, both renderers" -- cmd /c "node tools/tests/run-all.mjs x75diag --jobs 1 & node tools/realtest.mjs x75diag --all" > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-232-places\diag75.log" 2>&1

