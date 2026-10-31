@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 after3 probe: magazine sizes in the table's mm, GW-4 widened" --minutes 25 -- node qa/2026-10-31-GB-260/probe2.mjs after3 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\after3-probe.log" 2>&1
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 after2 shots: pistol and GW-4 magazines, both views" --minutes 25 -- node qa/2026-10-31-GB-260/shots2.mjs after2 pistol,m4 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\shots-after2.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-after3.txt"