index.html as served: 63854 script lines, document offset 1336, 2250 top-level functions found
1329 deoptimizations in the last 150 s of the run (the log ends at 183.5 s).

## By kind and by reason
| kind | count |
| --- | --- |
| dependency-change | 797 |
| deopt-eager | 501 |
| deopt-lazy | 31 |

| reason | count |
| --- | --- |
| dependent prototype chain changed | 529 |
| wrong map | 230 |
| embedded weak objects cleared | 166 |
| Insufficient type feedback for generic named access | 106 |
| dependent field type constness changed | 102 |
| Insufficient type feedback for call | 42 |
| (unknown) | 31 |
| prepare for on stack replacement (OSR) | 31 |
| Insufficient type feedback for compare operation | 22 |
| Insufficient type feedback for binary operation | 19 |
| Insufficient type feedback for object literal | 12 |
| not a Smi | 10 |

## By function (index.html) or by position (other files): the most deoptimized
| function or position | deopts | kinds | top reasons | distinct lines |
| --- | --- | --- | --- | --- |
| updateZombies (index.html) | 66 | deopt-eager 51; dependency-change 12; deopt-lazy 3 | Insufficient type feedback for generic named access 18; Insufficient type feedback for compare operation 8; Insufficient type feedback for call 8 | 48 |
| zombieLateStep (index.html) | 61 | deopt-eager 37; dependency-change 24 | wrong map 18; dependent prototype chain changed 16; Insufficient type feedback for call 8 | 30 |
| (top level or nested) (index.html) | 32 | dependency-change 24; deopt-eager 8 | dependent prototype chain changed 20; wrong map 4; dependent field type constness changed 3 | 9 |
| three.webgpu.js:51953:9 | 21 | deopt-lazy 21 | (unknown) 21 | 1 |
| updateFlowFieldOn (index.html) | 16 | deopt-eager 12; dependency-change 4 | prepare for on stack replacement (OSR) 10; dependent field type constness changed 4; Insufficient type feedback for generic named access 1 | 5 |
| shotBlocked (index.html) | 16 | dependency-change 8; deopt-eager 8 | dependent field type constness changed 5; prepare for on stack replacement (OSR) 4; wrong map 3 | 6 |
| resolveTreeCollisions (index.html) | 16 | deopt-eager 10; dependency-change 6 | dependent field type constness changed 4; wrong map 3; Insufficient type feedback for generic named access 2 | 9 |
| resolveStaticProps (index.html) | 15 | dependency-change 8; deopt-eager 7 | dependent prototype chain changed 5; wrong map 5; dependent field type constness changed 3 | 5 |
| zombieTickDt (index.html) | 14 | dependency-change 12; deopt-eager 2 | dependent prototype chain changed 6; dependent field type constness changed 6; wrong map 2 | 2 |
| three.webgpu.js:51842:33 | 14 | deopt-eager 14 | wrong map 14 | 1 |
| zTarget (index.html) | 13 | dependency-change 8; deopt-eager 5 | dependent prototype chain changed 8; wrong map 5 | 2 |
| zombie-ability-collision.js:78:7 | 13 | deopt-eager 13 | prepare for on stack replacement (OSR) 13 | 1 |
| hordeFrame (index.html) | 12 | deopt-eager 7; dependency-change 5 | dependent prototype chain changed 5; Insufficient type feedback for generic named access 3; wrong map 2 | 5 |
| knockDownPitch (index.html) | 12 | dependency-change 9; deopt-eager 3 | dependent prototype chain changed 9; wrong map 1; Insufficient type feedback for call 1 | 3 |
| updateAudioDirection (index.html) | 12 | dependency-change 8; deopt-eager 4 | dependent prototype chain changed 7; Insufficient type feedback for generic named access 4; dependent field type constness changed 1 | 2 |
| updateGuardianBossRigs (index.html) | 12 | dependency-change 10; deopt-eager 2 | dependent prototype chain changed 9; wrong map 1; Insufficient type feedback for generic named access 1 | 3 |
| zombieIdleState (index.html) | 11 | deopt-eager 6; dependency-change 5 | wrong map 6; dependent prototype chain changed 5 | 5 |
| updateNightRims (index.html) | 11 | dependency-change 8; deopt-eager 3 | dependent prototype chain changed 8; wrong map 2; Insufficient type feedback for generic named access 1 | 4 |
| fogCullKeeps (index.html) | 11 | dependency-change 7; deopt-eager 4 | dependent prototype chain changed 4; dependent field type constness changed 3; wrong map 2 | 3 |
| feral-motion.js:30:32 | 10 | dependency-change 10 | dependent prototype chain changed 10 | 1 |
| defenceTargetOf (index.html) | 10 | dependency-change 8; deopt-eager 2 | dependent prototype chain changed 8; wrong map 2 | 2 |
| zombie-ability-runtime.js:241:11 | 10 | dependency-change 10 | dependent prototype chain changed 9; dependent field type constness changed 1 | 1 |
| zombie-ability-runtime.js:100:22 | 10 | dependency-change 10 | dependent prototype chain changed 9; dependent field type constness changed 1 | 1 |
| updateZombieFires (index.html) | 10 | dependency-change 9; deopt-eager 1 | dependent prototype chain changed 9; wrong map 1 | 2 |
| screamer-behavior.js:6:19 | 9 | dependency-change 9 | dependent prototype chain changed 9 | 1 |
| screamer-behavior.js:7:34 | 9 | dependency-change 9 | dependent prototype chain changed 9 | 1 |
| spitter-motion.js:14:29 | 9 | dependency-change 9 | dependent prototype chain changed 9 | 1 |
| drowned-behavior.js:7:16 | 9 | dependency-change 9 | dependent prototype chain changed 9 | 1 |
| spider-motion.js:8:19 | 9 | dependency-change 9 | dependent prototype chain changed 9 | 1 |
| shambler-steering.js:9:18 | 9 | dependency-change 9 | dependent prototype chain changed 9 | 1 |
