@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-253 --checks "real t80 rerun (corner-graze spider)" --minutes 10 -- node tools/realtest.mjs t80 > qa\2026-11-02-GB-253\run7.log 2>&1
