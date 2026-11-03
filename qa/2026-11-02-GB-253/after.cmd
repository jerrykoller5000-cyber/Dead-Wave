@echo off
cd /d "C:\Users\Zero\Desktop\Tiny Trek"
if not exist C:\Users\Zero\Desktop\dw-gb253-after mkdir C:\Users\Zero\Desktop\dw-gb253-after
set CHROME_ARGS=--no-sandbox
set CHROME_JS_FLAGS=--log-code --log-deopt --logfile=C:/Users/Zero/Desktop/dw-gb253-after/v8.log
node tools/bench.mjs --night 20 --gfx high --seconds 150 --eval qa/2026-11-02-GB-253/keys-probe.js
set CHROME_JS_FLAGS=
node tools/bench.mjs --night 20 --gfx high --seconds 30 --prof --alloc
echo === TESTPAGE
node tools/tests/run-all.mjs t0 t100 t106 t107 t108 t109 t110 t111 t112 t114 t116 t117 t119 t126 t128 t129 t130 t131 t137 t139 t14 t143 t147 t148 t15 t155 t156 t160 t162 t164 t168 t170 t171 t173 t174 t177 t178 t182 t19 t196 t198 t202 t204 t205 t209 t210 t211 t213 t222 t23 t24 t245 t247 t248 t249 t253 t256 t263 t264 t265 t267 t268 t27 t270 t274 t275 t276 t278 t28 t282 t300 t31 t320 t322 t325 t326 t33 t34 t36 t37 t40 t43 t48 t53 t54 t59 t60 t61 t63 t69 t70 t71 t72 t73 t74 t75 t76 t77 t78 t8 t80 t83 t85 t90 t91 t93 t96 t97 t98 t99 tcl275a tcl275b tinspect t215 t95 --jobs 1 --all-fails
echo === REAL
node tools/realtest.mjs t71 t74 t75 t76 t77 t78 t83 t85 t98 t108 t109 t139 t143 t148 t215 t95
echo === SMOKE
node tools/smoke-real.mjs
