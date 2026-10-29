@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-233 --checks "t215 t95 page load + holds/sights t277 t284 t282" --minutes 60 -- node tools/realtest.mjs t215 t95 t277 t284 t282 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-233\tests.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-233\ran.txt"
