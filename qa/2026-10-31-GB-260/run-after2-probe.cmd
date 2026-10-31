@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-260 --checks "GB-260 after2 probe: magazine and can sizes in the table's mm" --minutes 25 -- node qa/2026-10-31-GB-260/probe2.mjs after2 > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\after2-probe.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-260\ran-after2.txt"