index.html as served: 63854 script lines, document offset 1336, 2250 top-level functions found
908 deoptimizations in the last 150 s of the run (the log ends at 185.5 s).

## By kind and by reason
| kind | count |
| --- | --- |
| dependency-change | 599 |
| deopt-eager | 298 |
| deopt-lazy | 11 |

| reason | count |
| --- | --- |
| dependent prototype chain changed | 360 |
| embedded weak objects cleared | 146 |
| wrong map | 127 |
| dependent field type constness changed | 80 |
| Insufficient type feedback for generic named access | 56 |
| Insufficient type feedback for call | 27 |
| prepare for on stack replacement (OSR) | 26 |
| Insufficient type feedback for binary operation | 15 |
| Insufficient type feedback for compare operation | 13 |
| not a Smi | 11 |
| (unknown) | 11 |
| dependent allocation site tenuring changed | 11 |

## By function (index.html) or by position (other files): the most deoptimized
| function or position | deopts | kinds | top reasons | distinct lines |
| --- | --- | --- | --- | --- |
| updateZombies (index.html) | 43 | deopt-eager 32; dependency-change 8; deopt-lazy 3 | Insufficient type feedback for generic named access 10; Insufficient type feedback for call 8; dependent prototype chain changed 5 | 35 |
| zombieLateStep (index.html) | 31 | deopt-eager 24; dependency-change 7 | wrong map 13; dependent prototype chain changed 4; Insufficient type feedback for generic named access 3 | 22 |
| (top level or nested) (index.html) | 25 | dependency-change 22; deopt-eager 3 | dependent prototype chain changed 16; dependent field type constness changed 5; wrong map 2 | 8 |
| updateFlowFieldOn (index.html) | 13 | deopt-eager 8; dependency-change 5 | prepare for on stack replacement (OSR) 8; dependent field type constness changed 4; dependent prototype chain changed 1 | 3 |
| zombieTickDt (index.html) | 13 | dependency-change 11; deopt-eager 2 | dependent prototype chain changed 6; dependent field type constness changed 5; wrong map 2 | 2 |
| resolveStaticProps (index.html) | 10 | deopt-eager 6; dependency-change 4 | dependent field type constness changed 4; Insufficient type feedback for binary operation 2; wrong map 2 | 4 |
| hordeFrame (index.html) | 10 | deopt-eager 6; dependency-change 4 | dependent prototype chain changed 4; Insufficient type feedback for generic named access 2; Insufficient type feedback for binary operation 2 | 5 |
| fogCullKeeps (index.html) | 10 | dependency-change 7; deopt-eager 3 | dependent field type constness changed 4; dependent prototype chain changed 3; Insufficient type feedback for generic named access 2 | 4 |
| zTarget (index.html) | 10 | dependency-change 6; deopt-eager 4 | dependent prototype chain changed 6; wrong map 4 | 2 |
| zombie-ability-collision.js:78:7 | 9 | deopt-eager 9 | prepare for on stack replacement (OSR) 9 | 1 |
| zombieIdleState (index.html) | 8 | dependency-change 5; deopt-eager 3 | dependent prototype chain changed 5; wrong map 3 | 4 |
| zombie-ability-runtime.js:100:22 | 8 | dependency-change 8 | dependent prototype chain changed 8 | 1 |
| shotBlocked (index.html) | 8 | deopt-eager 5; dependency-change 3 | prepare for on stack replacement (OSR) 4; dependent field type constness changed 3; Insufficient type feedback for generic named access 1 | 3 |
| updateAudioDirection (index.html) | 7 | dependency-change 6; deopt-eager 1 | dependent prototype chain changed 5; wrong map 1; dependent field type constness changed 1 | 2 |
| resolveTreeCollisions (index.html) | 7 | deopt-eager 4; dependency-change 3 | dependent field type constness changed 2; prepare for on stack replacement (OSR) 2; dependent prototype chain changed 1 | 4 |
| screamer-behavior.js:21:30 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| spider-motion.js:54:33 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| spitter-motion.js:7:19 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| screamer-behavior.js:8:35 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| spider-motion.js:8:19 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| shambler-steering.js:9:18 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| knockDownPitch (index.html) | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| military-behavior.js:8:29 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| leaper-motion.js:7:31 | 7 | dependency-change 7 | dependent prototype chain changed 7 | 1 |
| updateGuardianBossRigs (index.html) | 7 | dependency-change 6; deopt-eager 1 | dependent prototype chain changed 6; wrong map 1 | 2 |
| defenceTargetOf (index.html) | 7 | dependency-change 6; deopt-eager 1 | dependent prototype chain changed 6; wrong map 1 | 2 |
| seekZombieWindow (index.html) | 7 | dependency-change 6; deopt-eager 1 | dependent prototype chain changed 6; wrong map 1 | 2 |
| fogCullDepth (index.html) | 7 | dependency-change 4; deopt-eager 3 | dependent prototype chain changed 4; wrong map 3 | 2 |
| updateZombieFires (index.html) | 7 | dependency-change 6; deopt-eager 1 | dependent prototype chain changed 6; wrong map 1 | 2 |
| spider-motion.js:29:35 | 6 | dependency-change 6 | dependent prototype chain changed 6 | 1 |
