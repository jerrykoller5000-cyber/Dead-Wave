V8 log: 181 s of code events, 4289 deoptimizations; the CPU profile is 1800 frames of night 20; V8's TurboFan limit is 61,440 bytes of bytecode.

## The frame path: time, size, the tier reached, the deoptimizations
| function | file | ms a frame (with callees) | bytecode | highest tier | made: Maglev / TurboFan / OSR | first TurboFan at | deopts in the log | top reasons |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| update | three.webgpu.js | 15.96 | 138 | TurboFan | 44 / 20 / 0 | 7 s | 24 | wrong map 16; dependent prototype chain changed 4 |
| tick | index.html | 15.90 | 55995 | Maglev | 4 / 0 / 0 | never | 4 | not a Smi 1; Insufficient type feedback for generic named access 1 |
| renderFrame | index.html | 10.19 | 278 | Maglev | 3 / 0 / 0 | never | 2 | dependent prototype chain changed 1; dependent field type constness changed 1 |
| render | three.webgpu.js | 7.48 | 52 | Maglev | 3 / 0 / 0 | never | 0 |  |
| _renderScene | three.webgpu.js | 7.48 | 2085 | TurboFan | 3 / 1 / 0 | 50 s | 2 | dependent field representation changed 1; dependent prototype chain changed 1 |
| _renderObjects | three.webgpu.js | 7.37 | 118 | TurboFan | 1 / 1 / 1 | 10 s | 0 |  |
| renderObject | three.webgpu.js | 7.36 | 515 | TurboFan | 9 / 3 / 0 | 11 s | 10 | wrong map 7; (unknown) 2 |
| _renderObjectDirect | three.webgpu.js | 7.36 | 251 | TurboFan | 4 / 3 / 0 | 11 s | 6 | wrong map 2; (unknown) 2 |
| updateBefore | three.webgpu.js | 7.29 | 155 | TurboFan | 5 / 2 / 0 | 9 s | 2 | Insufficient type feedback for generic named access 1; dependent prototype chain changed 1 |
| updateBeforeNode | three.webgpu.js | 7.28 | 224 | TurboFan | 3 / 1 / 0 | 11 s | 2 | Insufficient type feedback for generic named access 1; wrong map 1 |
| updateForRender | three.webgpu.js | 2.75 | 38 | TurboFan | 6 / 3 / 0 | 7 s | 2 | dependent prototype chain changed 2 |
| updateMatrixWorld | three.core.js | 2.54 | 148 | TurboFan | 13 / 5 / 0 | 9 s | 11 | wrong map 7; dependent prototype chain changed 2 |
| updateSceneMatrices | index.html | 1.90 | 405 | TurboFan | 6 / 6 / 11 | 9 s | 16 | prepare for on stack replacement (OSR) 10; wrong map 4 |
| updateZombies | index.html | 1.64 | 39712 | TurboFan | 62 / 2 / 0 | 81 s | 76 | wrong map 25; dependent prototype chain changed 15 |
| _projectObject | three.webgpu.js | 1.49 | 759 | TurboFan | 23 / 12 / 0 | 8 s | 62 | (unknown) 40; wrong map 15 |
| _updateBindings | three.webgpu.js | 1.11 | 130 | TurboFan | 1 / 1 / 0 | 9 s | 0 |  |
| _update | three.webgpu.js | 1.02 | 662 | TurboFan | 9 / 5 / 0 | 8 s | 7 | wrong map 6; dependent prototype chain changed 1 |
| updateBefore | BloomNode.js | 0.90 | 389 | TurboFan | 1 / 1 / 0 | 110 s | 0 |  |
| updateWorldAnimations | index.html | 0.78 | 801 | Maglev | 4 / 0 / 0 | never | 4 | not a Smi 1; dependent field type constness changed 1 |
| updateNode | three.webgpu.js | 0.75 | 224 | TurboFan | 2 / 1 / 0 | 6 s | 1 | wrong call target 1 |
| multiplyMatrices | three.core.js | 0.70 | 914 | TurboFan | 2 / 2 / 0 | 4 s | 1 | wrong map 1 |
| draw | three.webgpu.js | 0.65 | 1319 | TurboFan | 20 / 16 / 0 | 11 s | 6 | wrong map 3; Insufficient type feedback for generic named access 1 |
| _renderTransparents | three.webgpu.js | 0.64 | 477 | Maglev | 1 / 0 / 0 | never | 0 |  |
| updateWorldMatrix | three.core.js | 0.61 | 169 | TurboFan | 7 / 5 / 0 | 4 s | 11 | (unknown) 6; wrong map 5 |
| update | zombie-ability-runtime.js | 0.60 | 392 | TurboFan | 4 / 2 / 0 | 83 s | 3 | wrong map 2; dependent field type constness changed 1 |
| get | three.webgpu.js | 0.60 | 756 | TurboFan | 18 / 10 / 0 | 6 s | 10 | wrong map 6; Insufficient type feedback for generic named access 2 |
| holdWeapon | index.html | 0.52 | 16029 | Maglev | 3 / 0 / 0 | never | 3 | dependent prototype chain changed 1; (unknown) 1 |
| updateActor | zombie-ability-runtime.js | 0.51 | 1736 | TurboFan | 15 / 2 / 0 | 97 s | 14 | dependent prototype chain changed 7; wrong map 6 |
| updateAttributes | three.webgpu.js | 0.49 | 278 | TurboFan | 4 / 2 / 0 | 9 s | 3 | wrong map 2; Insufficient type feedback for generic named access 1 |
| updateMarinePose | index.html | 0.47 | 39797 | Maglev | 4 / 0 / 0 | never | 3 | Insufficient type feedback for generic named access 2; dependent prototype chain changed 1 |
| updateZombieAbilityVisuals | zombie-ability-visuals.js | 0.43 | 2453 | TurboFan | 6 / 2 / 0 | 44 s | 5 | wrong map 1; Insufficient type feedback for call 1 |
| apply | marine-turn.js | 0.39 | 5995 | Maglev | 4 / 0 / 0 | never | 1 | dependent field type constness changed 1 |
| bend | marine-cloth.js | 0.39 | 1658 | TurboFan | 2 / 3 / 6 | 6 s | 5 | Insufficient type feedback for generic named access 2; wrong map 2 |
| updateBinding | three.webgpu.js | 0.39 | 17 | Maglev | 4 / 0 / 0 | never | 2 | dependent prototype chain changed 2 |
| get needsUpdate | three.webgpu.js | 0.38 | 25 | Maglev | 1 / 0 / 0 | never | 0 |  |
| updateAttribute | three.webgpu.js | 0.37 | 212 | TurboFan | 12 / 7 / 0 | 9 s | 9 | wrong map 4; dependent prototype chain changed 4 |
| getDynamicCacheKey | three.webgpu.js | 0.36 | 105 | TurboFan | 5 / 2 / 0 | 11 s | 4 | wrong map 4 |
| sceneCull | index.html | 0.33 | 1186 | TurboFan | 6 / 4 / 3 | 18 s | 6 | wrong map 4; Insufficient type feedback for call 1 |
| holdHand | index.html | 0.32 | 1228 | TurboFan | 2 / 1 / 0 | 114 s | 1 | dependent prototype chain changed 1 |
| getCacheKey | three.webgpu.js | 0.31 | 351 | TurboFan | 7 / 3 / 0 | 11 s | 3 | wrong map 2; Insufficient type feedback for generic named access 1 |
| getForRender | three.webgpu.js | 0.31 | 215 | TurboFan | 14 / 7 / 0 | 9 s | 12 | wrong map 5; dependent prototype chain changed 4 |
| getCacheKey$1 | three.webgpu.js | 0.29 | 247 | TurboFan | 1 / 1 / 0 | 15 s | 0 |  |

## The game's own functions on the frame path that never reached TurboFan in the run
| function | file | ms a frame | bytecode | % of the 61,440 limit | highest tier | Maglev code made | deopts |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tick | index.html | 15.90 | 55995 | 91 % | Maglev | 4 | 4 |
| renderFrame | index.html | 10.19 | 278 | 0 % | Maglev | 3 | 2 |
| updateWorldAnimations | index.html | 0.78 | 801 | 1 % | Maglev | 4 | 4 |
| holdWeapon | index.html | 0.52 | 16029 | 26 % | Maglev | 3 | 3 |
| updateMarinePose | index.html | 0.47 | 39797 | 65 % | Maglev | 4 | 3 |
| apply | marine-turn.js | 0.39 | 5995 | 10 % | Maglev | 4 | 1 |

## Every function over 30,000 bytes of bytecode (the limit is 61,440): in the game's scripts, from V8
| bytecode | function | file | hot? (ms a frame) |
| --- | --- | --- | --- |
| 64507 | makeHouse | index.html | not in the profile |
| 57188 | tick | index.html | 15.90 |
| 46184 | makeZombieMesh | index.html | not in the profile |
| 45733 | applyZombieConcept | studio/zombie-concepts.js | not in the profile |
| 41815 | decoratePiece | index.html | not in the profile |
| 41226 | updateMarinePose | index.html | 0.47 |
| 41120 | updateZombies | index.html | 1.64 |
| 40761 | buildTrapperYardParts | game/trapper-path.js | not in the profile |
| 38670 | zombieLateStep | index.html | not in the profile |
| 36341 | updateWildlife | index.html | 0.15 |
| 30587 | buildTrainingGround | world/training.js | not in the profile |
