@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-228 --checks "t215 t95 page load + holds/sights t277 t284 t282 t188" --minutes 60 -- node tools/realtest.mjs t215 t95 t277 t284 t282 t188 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-228\tests-real.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-28-GB-228\tests-ran.txt"
