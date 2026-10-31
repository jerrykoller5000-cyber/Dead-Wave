@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-247 --checks "GB-247 launcher entry landed (patch1): t215 t95 page load + t222 t225 t228 t246 t277 t284 on the real renderer" --minutes 120 -- node tools/realtest.mjs t215 t95 t222 t225 t228 t246 t277 t284 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-247\landed-tests.log" 2>&1
node crew/crew.mjs slot run grokbot GB-247 --checks "GB-247 after-numbers: launcher and uzi per-hand glove px, landed table" --minutes 40 -- node qa/2026-10-29-GB-247/rfocus2c.mjs launcher,uzi 0.1,0.18,0.25,0.33,0.4,0.48,0.55,0.62,0.7,0.85 qa/2026-10-29-GB-247/landed.json landed > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-247\landed-px.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-247\ran-landed.txt"
