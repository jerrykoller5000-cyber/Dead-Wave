@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-232 --checks "t304 t215 t95 t75 real renderer rerun" -- node tools/realtest.mjs t304 t215 t95 t75 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-27-GB-232-places\real2.log" 2>&1

