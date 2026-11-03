@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
node crew/crew.mjs slot run grokbot GB-253 --checks "GB-253+spider fix on live index.html: t80 x5, zombie tests, real t215 t95 t74 t80, smoke (no file copies)" --minutes 60 -- cmd /c qa\2026-11-02-GB-253\run6-live.cmd > qa\2026-11-02-GB-253\run6.log 2>&1
