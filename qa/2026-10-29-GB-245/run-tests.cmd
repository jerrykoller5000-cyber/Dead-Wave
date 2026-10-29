@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 rule 13: t222 t225 t228 t246 t277 on the real renderer" --minutes 90 -- node tools/realtest.mjs t222 t225 t228 t246 t277 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\tests.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-tests.txt"