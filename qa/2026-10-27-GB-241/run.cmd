@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-241 --checks "t75 x3 t69 t215 t95 t98 t92 real renderer" -- node tools/realtest.mjs t75 t69 t215 t95 t98 t92 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-241\real1.log" 2>&1
node crew/crew.mjs slot run grokbot GB-241 --checks "t75 repeats + test page" -- node tools/realtest.mjs t75 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-241\real2.log" 2>&1
node crew/crew.mjs slot run grokbot GB-241 --checks "t75 repeat 3" -- node tools/realtest.mjs t75 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-241\real3.log" 2>&1
node crew/crew.mjs slot run grokbot GB-241 --checks "test page t75 t69 t215 t95 t98 t92" -- node tools/tests/run-all.mjs t75 t69 t215 t95 t98 t92 --jobs 1 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-241\page.log" 2>&1

