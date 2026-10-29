@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 uzi offset landed (patch11-13): t215 t95 page load + t222 t225 t228 t246 t277 t284 on the real renderer" --minutes 120 -- node tools/realtest.mjs t215 t95 t222 t225 t228 t246 t277 t284 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\uzi-tests.log" 2>&1
node crew/crew.mjs slot run grokbot GB-245 --checks "GB-245 uzi offset after-numbers: uzi/pistol/revolver per-hand glove pixels, landed constant" --minutes 40 -- node qa/2026-10-29-GB-245/rfocus2.mjs uzi,pistol,revolver 0.1,0.25,0.4,0.55,0.7,0.85 qa/2026-10-29-GB-245/landeduzi.json uzi-landed > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\uzi-px.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-245\ran-uzi.txt"
