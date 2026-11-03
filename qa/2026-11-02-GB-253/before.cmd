@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
if not exist C:\Users\Zero\Desktop\dw-gb253-before mkdir C:\Users\Zero\Desktop\dw-gb253-before
set CHROME_ARGS=--no-sandbox
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb253-before/v8.log
node tools/bench.mjs --night 20 --gfx high --seconds 150 --eval qa/2026-11-02-GB-253/keys-probe.js
set CHROME_JS_FLAGS=
node tools/bench.mjs --night 20 --gfx high --seconds 30 --prof --alloc
