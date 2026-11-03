index.html as served: 63650 script lines, document offset 1336, 2243 top-level functions found
905 deoptimizations in the last 150 s of the run (the log ends at 201.6 s).

## By kind and by reason
| kind | count |
| --- | --- |
| dependency-change | 554 |
| deopt-eager | 321 |
| deopt-lazy | 30 |

| reason | count |
| --- | --- |
| dependent prototype chain changed | 342 |
| embedded weak objects cleared | 144 |
| wrong map | 120 |
| dependent field type constness changed | 62 |
| Insufficient type feedback for generic named access | 59 |
| prepare for on stack replacement (OSR) | 55 |
| (unknown) | 30 |
| Insufficient type feedback for call | 27 |
| Insufficient type feedback for compare operation | 15 |
| Insufficient type feedback for binary operation | 12 |
| not a Smi | 11 |
| dependent allocation site tenuring changed | 6 |

## By function (index.html) or by position (other files): the most deoptimized
| function or position | deopts | kinds | top reasons | distinct lines |
| --- | --- | --- | --- | --- |
| updateZombies (index.html) | 43 | deopt-eager 32; dependency-change 7; deopt-lazy 4 | Insufficient type feedback for call 10; Insufficient type feedback for generic named access 9; dependent prototype chain changed 4 | 37 |
| zombie-ability-collision.js:91:7 | 29 | deopt-eager 29 | prepare for on stack replacement (OSR) 29 | 1 |
| zombieLateStep (index.html) | 26 | deopt-eager 18; dependency-change 8 | wrong map 8; dependent prototype chain changed 7; Insufficient type feedback for call 5 | 18 |
| (top level or nested) (index.html) | 19 | dependency-change 18; deopt-eager 1 | dependent prototype chain changed 15; dependent field type constness changed 2; not int32 1 | 5 |
| three.webgpu.js:51953:9 | 17 | deopt-lazy 17 | (unknown) 17 | 1 |
| shotBlocked (index.html) | 15 | deopt-eager 9; dependency-change 6 | wrong map 5; dependent field type constness changed 4; prepare for on stack replacement (OSR) 2 | 7 |
| updateFlowFieldOn (index.html) | 13 | deopt-eager 9; dependency-change 4 | prepare for on stack replacement (OSR) 8; dependent field type constness changed 4; minus zero 1 | 4 |
| marine-kit-fit.js:36:43 | 12 | deopt-eager 12 | prepare for on stack replacement (OSR) 12 | 1 |
| fogCullKeeps (index.html) | 11 | dependency-change 9; deopt-eager 2 | dependent prototype chain changed 5; dependent field type constness changed 4; Insufficient type feedback for generic named access 2 | 3 |
| zombieTickDt (index.html) | 11 | dependency-change 10; deopt-eager 1 | dependent prototype chain changed 6; dependent field type constness changed 4; wrong map 1 | 2 |
| zTarget (index.html) | 11 | dependency-change 6; deopt-eager 5 | dependent prototype chain changed 6; wrong map 5 | 2 |
| resolveTreeCollisions (index.html) | 11 | deopt-eager 8; dependency-change 3 | dependent field type constness changed 3; Insufficient type feedback for generic named access 2; Insufficient type feedback for binary operation 2 | 7 |
| syncZombieFogCull (index.html) | 10 | dependency-change 6; deopt-eager 3; deopt-lazy 1 | dependent prototype chain changed 5; dependent field type constness changed 1; (unknown) 1 | 5 |
| three.webgpu.js:51842:33 | 10 | deopt-eager 10 | wrong map 10 | 1 |
| fogCullDepth (index.html) | 9 | dependency-change 7; deopt-eager 2 | dependent prototype chain changed 7; wrong map 2 | 2 |
| updateAudioDirection (index.html) | 8 | dependency-change 7; deopt-eager 1 | dependent prototype chain changed 6; dependent field type constness changed 1; Insufficient type feedback for generic named access 1 | 2 |
| zombie-ability-runtime.js:241:11 | 8 | dependency-change 8 | dependent prototype chain changed 7; dependent field type constness changed 1 | 1 |
| zombiePoseVisible (index.html) | 8 | dependency-change 7; deopt-eager 1 | dependent prototype chain changed 5; dependent field type constness changed 2; wrong map 1 | 2 |
| zombie-ability-runtime.js:100:22 | 8 | dependency-change 8 | dependent prototype chain changed 8 | 1 |
| seekZombieWindow (index.html) | 8 | dependency-change 7; deopt-eager 1 | dependent prototype chain changed 7; wrong map 1 | 2 |
| hordeRoom (index.html) | 8 | dependency-change 7; deopt-eager 1 | dependent prototype chain changed 7; wrong map 1 | 2 |
| updateTreeSway (index.html) | 8 | deopt-eager 4; dependency-change 4 | dependent prototype chain changed 4; wrong map 2; prepare for on stack replacement (OSR) 2 | 3 |
| bomber-behavior.js:6:19 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| defenceTargetOf (index.html) | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| updateGuardianBossRigs (index.html) | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| noteFirstSeen (index.html) | 7 | dependency-change 5; deopt-eager 2 | dependent prototype chain changed 5; Insufficient type feedback for generic named access 1; Insufficient type feedback for object literal 1 | 3 |
| leaper-motion.js:7:31 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| trackZombieMotion (index.html) | 7 | dependency-change 5; deopt-eager 2 | dependent prototype chain changed 5; wrong map 2 | 2 |
| zombieIdleState (index.html) | 7 | dependency-change 5; deopt-eager 2 | dependent prototype chain changed 5; wrong map 2 | 3 |
| zombie-ability-collision.js:39:17 | 7 | dependency-change 7 | dependent prototype chain changed 5; dependent field type constness changed 2 | 1 |
