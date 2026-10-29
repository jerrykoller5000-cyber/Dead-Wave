@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 part 2 landed (patch14, rifle side/tip): t215 t95 page load + t222 t225 t228 t246 t277 t284 on the real renderer" --minutes 120 -- node tools/realtest.mjs t215 t95 t222 t225 t228 t246 t277 t284 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\p14-tests.log" 2>&1
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 part 2 after-numbers: m4/ak/aa12 per-hand glove px, landed table" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2c.mjs m4,ak,aa12 0.1,0.16,0.25,0.4,0.48,0.55,0.62,0.7,0.85 qa/2026-10-29-GB-245/landeduzi.json p14 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\p14-px.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-p14.txt"
