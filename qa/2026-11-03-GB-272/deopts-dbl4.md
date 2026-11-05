index.html as served: 63867 script lines, document offset 1336, 2250 top-level functions found
683 deoptimizations in the last 150 s of the run (the log ends at 181.5 s).

## By kind and by reason
| kind | count |
| --- | --- |
| deopt-eager | 439 |
| dependency-change | 197 |
| deopt-lazy | 47 |

| reason | count |
| --- | --- |
| wrong map | 186 |
| dependent field type constness changed | 101 |
| dependent prototype chain changed | 92 |
| Insufficient type feedback for generic named access | 86 |
| Insufficient type feedback for call | 51 |
| (unknown) | 47 |
| Insufficient type feedback for compare operation | 21 |
| Insufficient type feedback for binary operation | 18 |
| Insufficient type feedback for object literal | 16 |
| prepare for on stack replacement (OSR) | 15 |
| not a Smi | 13 |
| not int32 | 8 |

## By function (index.html) or by position (other files): the most deoptimized
| function or position | deopts | kinds | top reasons | distinct lines |
| --- | --- | --- | --- | --- |
| updateZombies (index.html) | 56 | deopt-eager 45; dependency-change 8; deopt-lazy 3 | Insufficient type feedback for call 11; Insufficient type feedback for generic named access 9; Insufficient type feedback for compare operation 7 | 47 |
| zombieLateStep (index.html) | 44 | deopt-eager 34; dependency-change 10 | wrong map 18; Insufficient type feedback for generic named access 6; dependent field type constness changed 5 | 27 |
| three.webgpu.js:51953:9 | 30 | deopt-lazy 30 | (unknown) 30 | 1 |
| three.webgpu.js:51842:33 | 22 | deopt-eager 22 | wrong map 22 | 1 |
| updateFlowFieldOn (index.html) | 15 | deopt-eager 13; dependency-change 2 | prepare for on stack replacement (OSR) 10; dependent field type constness changed 2; minus zero 1 | 5 |
| stepCrumple (index.html) | 15 | deopt-eager 15 | wrong map 9; prepare for on stack replacement (OSR) 3; Insufficient type feedback for generic named access 2 | 4 |
| resolveStaticProps (index.html) | 13 | dependency-change 7; deopt-eager 6 | dependent field type constness changed 7; wrong map 3; Insufficient type feedback for call 1 | 4 |
| resolveTreeCollisions (index.html) | 13 | deopt-eager 7; dependency-change 6 | dependent field type constness changed 4; wrong map 4; Insufficient type feedback for generic named access 2 | 6 |
| updateTreeFade (index.html) | 11 | deopt-eager 7; dependency-change 4 | wrong map 7; dependent prototype chain changed 3; dependent field type constness changed 1 | 4 |
| updateFallingTrees (index.html) | 11 | deopt-eager 9; dependency-change 2 | wrong map 6; Insufficient type feedback for generic named access 3; dependent field type constness changed 1 | 6 |
| explodeGrenade (index.html) | 9 | deopt-lazy 5; deopt-eager 3; dependency-change 1 | (unknown) 5; wrong map 2; Insufficient type feedback for compare operation 1 | 6 |
| (top level or nested) (index.html) | 8 | dependency-change 5; deopt-eager 3 | dependent field type constness changed 5; not int32 1; Insufficient type feedback for generic named access 1 | 7 |
| shotBlocked (index.html) | 8 | dependency-change 5; deopt-eager 3 | dependent prototype chain changed 3; wrong map 3; dependent field type constness changed 2 | 4 |
| fogCullKeeps (index.html) | 7 | dependency-change 4; deopt-eager 3 | dependent field type constness changed 4; Insufficient type feedback for generic named access 2; not a Smi 1 | 4 |
| updateCashDrops (index.html) | 7 | deopt-eager 6; dependency-change 1 | wrong map 2; Insufficient type feedback for generic keyed access 1; Insufficient type feedback for generic named access 1 | 5 |
| resetReloadAnim (index.html) | 6 | dependency-change 6 | dependent prototype chain changed 6 | 1 |
| tick (index.html) | 6 | dependency-change 2; deopt-lazy 2; deopt-eager 2 | dependent prototype chain changed 2; (unknown) 2; unexpected name in keyed access 1 | 5 |
| zombie-ability-runtime.js:157:23 | 6 | dependency-change 6 | dependent field type constness changed 6 | 1 |
| nightWarningCover (index.html) | 6 | deopt-eager 3; dependency-change 3 | wrong map 3; dependent prototype chain changed 2; dependent field type constness changed 1 | 2 |
| updateWildlife (index.html) | 5 | deopt-eager 3; dependency-change 2 | Insufficient type feedback for call 2; dependent prototype chain changed 1; dependent field type constness changed 1 | 4 |
| zombieTickDt (index.html) | 5 | dependency-change 5 | dependent field type constness changed 5 | 1 |
| updateAudioDirection (index.html) | 5 | dependency-change 3; deopt-eager 2 | dependent prototype chain changed 2; dependent field type constness changed 1; wrong map 1 | 2 |
| updateTreeSway (index.html) | 5 | deopt-eager 5 | wrong map 3; prepare for on stack replacement (OSR) 2 | 2 |
| updateTreeBatchesInner (index.html) | 5 | dependency-change 3; deopt-eager 2 | dependent field type constness changed 3; Insufficient type feedback for compare operation 1; wrong map 1 | 3 |
| hordeFrame (index.html) | 4 | deopt-eager 3; dependency-change 1 | Insufficient type feedback for generic named access 2; Insufficient type feedback for generic global access 1; dependent prototype chain changed 1 | 3 |
| zombieIdleState (index.html) | 4 | deopt-eager 3; dependency-change 1 | wrong map 3; dependent prototype chain changed 1 | 4 |
| propsNear (index.html) | 4 | dependency-change 2; deopt-eager 2 | dependent field type constness changed 2; Insufficient type feedback for generic named access 1; wrong map 1 | 3 |
| zombie-ability-collision.js:117:18 | 4 | deopt-eager 4 | wrong map 4 | 1 |
| updateShadowLOD (index.html) | 4 | deopt-eager 4 | wrong map 4 | 2 |
| updateNightRims (index.html) | 3 | deopt-eager 3 | wrong map 2; Insufficient type feedback for generic named access 1 | 2 |
