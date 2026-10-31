## Runs (the CPU profiler is on at 0.5 ms: slower than the plain runs, the same in both builds)
| run | fps | 1% low | tick | spikes (>25 ms) | spikeCauses |
| --- | --- | --- | --- | --- | --- |
| old-1 | 54.5 | 39.6 | 16.09 | 8 | {"spikes":8,"pipelines":0,"builds":0,"uploads":1,"sunShadow":0,"gc":1,"code":6} |
| new-1 | 51.7 | 40.5 | 16.86 | 4 | {"spikes":4,"pipelines":0,"builds":0,"uploads":1,"sunShadow":0,"gc":1,"code":2} |
| old-2 | 54.9 | 41.6 | 15.93 | 2 | {"spikes":2,"pipelines":0,"builds":0,"uploads":0,"sunShadow":0,"gc":1,"code":1} |
| new-2 | 55.9 | 40.8 | 16.09 | 7 | {"spikes":7,"pipelines":0,"builds":0,"uploads":0,"sunShadow":0,"gc":0,"code":7} |

## Self time a frame, mean of the two runs (ms): the functions that grew or shrank most, new against old
| function | old | new | new - old |
| --- | --- | --- | --- |
| updateWorldMatrix three.core.js | 0.41 | 0.49 | +0.08 |
| update three.webgpu.js | 0.57 | 0.64 | +0.07 |
| multiplyMatrices three.core.js | 0.64 | 0.70 | +0.06 |
| _update three.webgpu.js | 0.15 | 0.19 | +0.04 |
| sceneCull index.html | 0.29 | 0.33 | +0.04 |
| (program)  | 0.94 | 0.98 | +0.04 |
| animateFlame zombie-ability-visuals.js | 0.02 | 0.05 | +0.03 |
| writeBuffer  | 0.61 | 0.64 | +0.03 |
| updateForRender three.webgpu.js | 0.14 | 0.16 | +0.03 |
| clone objectives.js | 0.06 | 0.09 | +0.02 |
| structuredClone  | 0.09 | 0.11 | +0.02 |
| updateZombieAbilityVisuals zombie-ability-visuals.js | 0.01 | 0.03 | +0.02 |
| ... | | | |
| updateByType three.webgpu.js | 0.12 | 0.00 | -0.12 |
| intersectsObject three.core.js | 0.25 | 0.21 | -0.03 |
| platformHeightAt index.html | 0.03 | 0.00 | -0.03 |
| has three.webgpu.js | 0.02 | 0.00 | -0.02 |
| bend marine-cloth.js | 0.40 | 0.38 | -0.02 |

## new-1: each spike frame, the top self-time functions in it, and the same frame number in old-1
| frame | ms | top functions in the frame (ms self) | same frame in old: ms, top functions |
| --- | --- | --- | --- |
| 1 | 28.4 (wall 29.4) |  | 17.1 ms:  |
| 1255 | 29.4 (wall 30.2) | multiplyMatrices three.core.js 4.0; updateMatrixWorld three.core.js 3.0; _renderObjects three.webgpu.js 2.1; updateZombies index.html 2.0; sceneCull index.html 1.3 | 19.3 ms: updateMatrixWorld three.core.js 2.4; tick index.html 2.2; _projectObject three.webgpu.js 2.0 |
| 1630 | 29.7 (wall 30.5) | updateMatrixWorld three.core.js 5.5; tick index.html 2.1; _projectObject three.webgpu.js 2.1; updateWorldMatrix three.core.js 2.1; updateLowHp index.html 1.4 | 17.9 ms: has three.webgpu.js 2.4; multiplyMatrices three.core.js 2.4; updateMatrixWorld three.core.js 2.3 |
| 1677 | 26.9 (wall 27.8) | (program)  2.1; updateWorldMatrix three.core.js 2.0; updateMatrixWorld three.core.js 2.0; updateZombies index.html 2.0; _projectObject three.webgpu.js 2.0 | 26.6 ms: updateMatrixWorld three.core.js 4.2; _projectObject three.webgpu.js 3.3; setBindGroup  1.5 |

## new-2: each spike frame, the top self-time functions in it, and the same frame number in old-2
| frame | ms | top functions in the frame (ms self) | same frame in old: ms, top functions |
| --- | --- | --- | --- |
| 496 | 26.4 (wall 27.2) | update three.webgpu.js 4.0; updateFlowFieldOn index.html 3.2; tick index.html 2.2; _renderObjectDirect three.webgpu.js 2.1; updateMatrixWorld three.core.js 2.0 | 16.4 ms: updateMatrixWorld three.core.js 2.0; writeBuffer  2.0; (program)  1.5 |
| 497 | 28.0 (wall 29.3) | _projectObject three.webgpu.js 3.4; multiplyMatrices three.core.js 2.3; updateZombies index.html 2.2; needsRenderUpdate three.webgpu.js 2.1; updateMatrixWorld three.core.js 2.0 | 16.2 ms: updateMatrixWorld three.core.js 3.8; _projectObject three.webgpu.js 2.0; writeBuffer  2.0 |
| 963 | 25.1 (wall 26.3) | update three.webgpu.js 2.1; _projectObject three.webgpu.js 2.0; multiplyMatrices three.core.js 2.0; draw three.webgpu.js 1.1; updateWorldMatrix three.core.js 1.1 | 16.7 ms: renderFrame index.html 2.0; updateTreeSway index.html 1.2; _renderScene three.webgpu.js 1.1 |
| 966 | 25.4 (wall 26.1) | updateMatrixWorld three.core.js 3.1; (program)  2.5; writeBuffer  2.2; equals three.webgpu.js 2.0; tick index.html 2.0 | 16.8 ms: tick index.html 2.2; _projectObject three.webgpu.js 2.0; updateMatrixWorld three.core.js 2.0 |
| 1273 | 25.4 (wall 26.2) | updateMatrixWorld three.core.js 4.1; _projectObject three.webgpu.js 3.2; updateZombies index.html 2.1; _renderObjectDirect three.webgpu.js 1.2; (anonymous) three.webgpu.js 1.1 | 13.2 ms: updateMatrixWorld three.core.js 4.1; _projectObject three.webgpu.js 2.1; sceneCull index.html 1.1 |
| 1380 | 27.9 (wall 29.4) | updateMatrixWorld three.core.js 4.2; _renderObjectDirect three.webgpu.js 4.1; _projectObject three.webgpu.js 2.1; updateWorldMatrix three.core.js 2.0; updateZombies index.html 2.0 | 17.8 ms: (program)  2.3; updateMatrixWorld three.core.js 2.1; _projectObject three.webgpu.js 2.0 |
| 1614 | 25.5 (wall 26.7) | updateMatrixWorld three.core.js 5.1; writeBuffer  2.2; _renderObjectDirect three.webgpu.js 2.1; renderFrame index.html 2.1; fogCullKeeps index.html 1.3 | 15.2 ms: update three.webgpu.js 3.3; updateMatrixWorld three.core.js 2.0; _needsRenderUpdate three.webgpu.js 1.3 |
