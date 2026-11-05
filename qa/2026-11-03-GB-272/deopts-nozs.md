index.html as served: 63892 script lines, document offset 1336, 2250 top-level functions found
656 deoptimizations in the last 150 s of the run (the log ends at 185.5 s).

## By kind and by reason
| kind | count |
| --- | --- |
| dependency-change | 323 |
| deopt-eager | 309 |
| deopt-lazy | 24 |

| reason | count |
| --- | --- |
| wrong map | 150 |
| embedded weak objects cleared | 139 |
| dependent prototype chain changed | 112 |
| dependent field type constness changed | 63 |
| Insufficient type feedback for generic named access | 58 |
| Insufficient type feedback for call | 27 |
| (unknown) | 24 |
| prepare for on stack replacement (OSR) | 22 |
| Insufficient type feedback for compare operation | 13 |
| Insufficient type feedback for binary operation | 10 |
| not int32 | 8 |
| not a Smi | 8 |

## By function (index.html) or by position (other files): the most deoptimized
| function or position | deopts | kinds | top reasons | distinct lines |
| --- | --- | --- | --- | --- |
| updateZombies (index.html) | 88 | deopt-eager 59; dependency-change 15; deopt-lazy 14 | wrong map 38; dependent prototype chain changed 15; (unknown) 14 | 38 |
| zombieLateStep (index.html) | 36 | deopt-eager 28; dependency-change 5; deopt-lazy 3 | wrong map 16; Insufficient type feedback for call 6; dependent prototype chain changed 5 | 22 |
| updateFlowFieldOn (index.html) | 18 | deopt-eager 11; dependency-change 7 | prepare for on stack replacement (OSR) 10; dependent field type constness changed 7; minus zero 1 | 4 |
| zombie-ability-runtime.js:157:23 | 10 | dependency-change 10 | dependent prototype chain changed 10 | 1 |
| fogCullKeeps (index.html) | 9 | deopt-eager 6; dependency-change 3 | wrong map 5; dependent prototype chain changed 3; Insufficient type feedback for generic named access 1 | 3 |
| zombie-ability-collision.js:78:7 | 9 | deopt-eager 9 | prepare for on stack replacement (OSR) 9 | 1 |
| resolveStaticProps (index.html) | 8 | deopt-eager 4; dependency-change 4 | dependent field type constness changed 4; Insufficient type feedback for call 2; Insufficient type feedback for compare operation 1 | 4 |
| (top level or nested) (index.html) | 8 | dependency-change 7; deopt-eager 1 | dependent field type constness changed 6; not int32 1; embedded weak objects cleared 1 | 7 |
| updateFish (index.html) | 7 | deopt-eager 5; dependency-change 2 | dependent prototype chain changed 2; Insufficient type feedback for call 1; not int32 1 | 5 |
| spider-motion.js:9:29 | 6 | dependency-change 6 | dependent prototype chain changed 6 | 1 |
| syncZombieFogCull (index.html) | 6 | deopt-eager 6 | wrong map 4; Insufficient type feedback for binary operation 1; Insufficient type feedback for generic named access 1 | 2 |
| zombie-ability-collision.js:39:17 | 6 | dependency-change 6 | dependent field type constness changed 6 | 1 |
| hordeFrame (index.html) | 5 | deopt-eager 4; dependency-change 1 | Insufficient type feedback for binary operation 2; Insufficient type feedback for generic named access 1; dependent prototype chain changed 1 | 3 |
| spitter-motion.js:14:29 | 5 | dependency-change 5 | dependent prototype chain changed 5 | 1 |
| resetReloadAnim (index.html) | 4 | dependency-change 4 | dependent prototype chain changed 4 | 1 |
| platformHeightAt (index.html) | 4 | dependency-change 2; deopt-eager 2 | dependent field type constness changed 2; wrong map 2 | 3 |
| updateWindSway (index.html) | 4 | deopt-eager 2; dependency-change 2 | wrong map 2; dependent prototype chain changed 2 | 2 |
| updateNightRims (index.html) | 4 | deopt-eager 3; dependency-change 1 | Insufficient type feedback for generic named access 2; dependent prototype chain changed 1; wrong map 1 | 4 |
| spider-motion.js:54:33 | 4 | dependency-change 4 | dependent prototype chain changed 4 | 1 |
| spider-motion.js:29:35 | 4 | dependency-change 4 | dependent prototype chain changed 4 | 1 |
| spider-motion.js:8:19 | 4 | dependency-change 4 | dependent prototype chain changed 4 | 1 |
| updateAudioDirection (index.html) | 4 | dependency-change 4 | dependent prototype chain changed 3; dependent field type constness changed 1 | 1 |
| zombie-ability-runtime.js:160:10 | 4 | deopt-eager 4 | wrong map 4 | 1 |
| updateGaleLeaves (index.html) | 4 | deopt-eager 3; dependency-change 1 | Insufficient type feedback for call 2; dependent prototype chain changed 1; Insufficient type feedback for generic named access 1 | 3 |
| feral-motion.js:74:9 | 3 | deopt-eager 3 | wrong map 2; Insufficient type feedback for generic named access 1 | 1 |
| feral-motion.js:132:17 | 3 | deopt-eager 3 | wrong map 3 | 1 |
| updateWildlife (index.html) | 3 | deopt-eager 3 | Insufficient type feedback for call 2; Insufficient type feedback for generic named access 1 | 3 |
| spitter-motion.js:7:19 | 3 | dependency-change 3 | dependent prototype chain changed 3 | 1 |
| spider-motion.js:62:28 | 3 | dependency-change 3 | dependent prototype chain changed 3 | 1 |
| zombie-feet.js:110:39 | 3 | deopt-eager 3 | wrong map 3 | 1 |
