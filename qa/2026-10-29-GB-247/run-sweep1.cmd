@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-247 --checks "GB-247 sweep 1: launcher and uzi support-hand framing, per-hand glove pixels over the reload" --minutes 90 -- cmd /c "node qa/2026-10-29-GB-247/rfocus2d.mjs launcher 0.1,0.18,0.25,0.33,0.4,0.48,0.55,0.62,0.7,0.85 qa/2026-10-29-GB-247/gridL1.json sweepL1 && node qa/2026-10-29-GB-247/rfocus2d.mjs uzi 0.1,0.18,0.25,0.33,0.4,0.48,0.55,0.62,0.7,0.85 qa/2026-10-29-GB-247/gridU1.json sweepU1" > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-247\sweep1.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-247\ran-sweep1.txt"
