## The last 10 s of each CPU-profiled run (ms a frame)
| run | frames in the window | busy (not idle) | idle |
| --- | --- | --- | --- |
| old-1 | 534 | 18.69 | 0.04 |
| new-1 | 503 | 19.83 | 0.05 |
| old-2 | 536 | 18.61 | 0.05 |
| new-2 | 543 | 18.39 | 0.03 |

## Self time by function, everything (mean of two runs, ms a frame, last 10 s)
| function | old | new | new - old |
| --- | --- | --- | --- |
| updateWorldMatrix three.core.js | 0.38 | 0.70 | +0.32 |
| update three.webgpu.js | 0.70 | 0.78 | +0.09 |
| _update three.webgpu.js | 0.15 | 0.23 | +0.07 |
| sceneCull index.html | 0.29 | 0.34 | +0.05 |
| clone objectives.js | 0.07 | 0.11 | +0.04 |
| updateForRender three.webgpu.js | 0.15 | 0.18 | +0.03 |
| structuredClone  | 0.08 | 0.11 | +0.03 |
| multiplyMatrices three.core.js | 0.66 | 0.68 | +0.03 |
| needsRenderUpdate three.webgpu.js | 0.08 | 0.11 | +0.03 |
| updateTrails zombie-ability-runtime.js | 0.01 | 0.04 | +0.02 |
| setBindGroup  | 0.12 | 0.15 | +0.02 |
| get three.webgpu.js | 0.19 | 0.22 | +0.02 |
| ... | | | |
| updateMatrixWorld three.core.js | 2.31 | 2.01 | -0.30 |
| updateByType three.webgpu.js | 0.15 | 0.00 | -0.15 |
| intersectsObject three.core.js | 0.26 | 0.21 | -0.04 |
| (all of them) | 18.65 | 19.11 | +0.46 |

## Under updateZombies (the zombies phase): the function directly below it (mean of two runs, ms a frame, last 10 s)
| function | old | new | new - old |
| --- | --- | --- | --- |
| resolveStaticProps index.html | 0.13 | 0.16 | +0.03 |
| (self) | 0.79 | 0.81 | +0.02 |
| applyFeralClaws feral-motion.js | 0.01 | 0.02 | +0.02 |
| set z three.core.js | 0.03 | 0.04 | +0.01 |
| waterDepthAt index.html | 0.00 | 0.01 | +0.01 |
| applyShamblerMotion shambler-motion.js | 0.09 | 0.10 | +0.01 |
| onRamp index.html | 0.01 | 0.02 | +0.01 |
| seekZombieWindow index.html | 0.02 | 0.03 | +0.01 |
| applySpitterMotion spitter-motion.js | 0.01 | 0.02 | +0.01 |
| kneeOf index.html | 0.00 | 0.01 | +0.01 |
| ... | | | |
| applyZombieFeet zombie-feet.js | 0.09 | 0.07 | -0.03 |
| entityGroundY index.html | 0.06 | 0.05 | -0.02 |
| applyMilitaryPose military-behavior.js | 0.04 | 0.02 | -0.02 |
| (all of them) | 2.30 | 2.30 | -0.00 |

## Under the renderer's render (the r:render phase): the function directly below it (mean of two runs, ms a frame, last 10 s)
| function | old | new | new - old |
| --- | --- | --- | --- |
| _renderScene three.webgpu.js | 8.37 | 8.51 | +0.14 |
| get three.webgpu.js | 0.00 | 0.00 | +0.00 |
| (self) | 0.00 | 0.00 | +0.00 |
| beginRender three.webgpu.js | 0.00 | 0.00 | -0.00 |
| ... | | | |
| beginRender three.webgpu.js | 0.00 | 0.00 | -0.00 |
| (self) | 0.00 | 0.00 | 0.00 |
| get three.webgpu.js | 0.00 | 0.00 | 0.00 |
| (all of them) | 8.38 | 8.51 | +0.14 |
