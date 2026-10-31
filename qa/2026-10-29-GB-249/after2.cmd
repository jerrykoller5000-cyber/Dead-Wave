@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-249 --checks "GB-249 after 2: t93 with the skin's bindMatrixInverse refreshed (real renderer)" --minutes 20 -- node tools/realtest.mjs t93 --all > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\after-t93-run2.log" 2>&1
echo DONE > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-29-GB-249\after2.done"
