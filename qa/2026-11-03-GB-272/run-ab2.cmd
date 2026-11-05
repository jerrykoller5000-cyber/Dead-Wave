@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
set D=C:\Users\Zero\Desktop\dw-gb272
if not exist %D%\live2 mkdir %D%\live2
set B=qa\2026-11-03-GB-272\bench-ab.mjs
set CHROME_ARGS=--no-sandbox
echo === DEOPT live2
set BENCH_PAGE=index.html
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb272/live2/v8.log
node %B% --night 20 --gfx high --seconds 150
set CHROME_JS_FLAGS=
echo === ALLOC live2-1
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC nozs-3
set BENCH_PAGE=nozs-index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC live2-2
set BENCH_PAGE=index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC nozs-4
set BENCH_PAGE=nozs-index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === DONE
