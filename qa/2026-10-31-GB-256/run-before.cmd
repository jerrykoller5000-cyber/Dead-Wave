@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-256 --checks "GB-256 before: third-person hold shake, frame-stepped, still/zoom/cursor moving, 5 guns" --minutes 30 -- node qa/2026-10-31-GB-256/probe.mjs before m4,pistol > "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-256\before.log" 2>&1
echo DONE >> "C:\Users\Zero\Desktop\Tiny Trek\qa\2026-10-31-GB-256\ran-before.txt"
