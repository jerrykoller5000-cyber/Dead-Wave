@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
set D=C:\Users\Zero\Desktop\dw-gb272
if not exist %D%\dbl3 mkdir %D%\dbl3
if not exist %D%\pre3 mkdir %D%\pre3
if not exist %D%\dbl4 mkdir %D%\dbl4
set B=qa\2026-11-03-GB-272\bench-ab.mjs
set CHROME_ARGS=--no-sandbox
echo === DEOPT dbl3 (index.html, 0.5-first)
set BENCH_PAGE=index.html
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb272/dbl3/v8.log
node %B% --night 20 --gfx high --seconds 150
echo === DEOPT pre3 (predbl-index.html, before the edit)
set BENCH_PAGE=predbl-index.html
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb272/pre3/v8.log
node %B% --night 20 --gfx high --seconds 150
echo === DEOPT dbl4 (index.html, 0.5-first)
set BENCH_PAGE=index.html
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb272/dbl4/v8.log
node %B% --night 20 --gfx high --seconds 150
set CHROME_JS_FLAGS=
echo === ALLOC dbl-1
set BENCH_PAGE=index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC pre-1
set BENCH_PAGE=predbl-index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC dbl-2
set BENCH_PAGE=index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC pre-2
set BENCH_PAGE=predbl-index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC dbl-3
set BENCH_PAGE=index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === ALLOC pre-3
set BENCH_PAGE=predbl-index.html
node %B% --night 20 --gfx high --seconds 30 --prof --alloc
echo === DONE