index.html as served: 60429 script lines, document offset 1317, 2111 top-level functions found
465 deoptimizations in the last 150 s of the run (the log ends at 181.2 s).

## By kind and by reason
| kind | count |
| --- | --- |
| deopt-eager | 298 |
| dependency-change | 137 |
| deopt-lazy | 30 |

| reason | count |
| --- | --- |
| wrong map | 166 |
| dependent prototype chain changed | 71 |
| Insufficient type feedback for generic named access | 50 |
| dependent field type constness changed | 49 |
| (unknown) | 30 |
| Insufficient type feedback for call | 23 |
| Insufficient type feedback for compare operation | 16 |
| dependent map was deprecated | 15 |
| Insufficient type feedback for binary operation | 9 |
| not a Smi | 8 |
| not int32 | 6 |
| Insufficient type feedback for object literal | 4 |

## By function (index.html) or by position (other files): the most deoptimized
| function or position | deopts | kinds | top reasons | distinct lines |
| --- | --- | --- | --- | --- |
| updateZombies (index.html) | 68 | deopt-eager 40; dependency-change 15; deopt-lazy 13 | wrong map 23; dependent prototype chain changed 13; (unknown) 13 | 29 |
| zombieLateStep (index.html) | 32 | deopt-eager 28; dependency-change 3; deopt-lazy 1 | wrong map 22; Insufficient type feedback for call 3; Insufficient type feedback for binary operation 1 | 19 |
| (top level or nested) (index.html) | 9 | dependency-change 5; deopt-eager 4 | dependent field type constness changed 5; wrong map 2; not int32 1 | 7 |
| updateFlowFieldOn (index.html) | 9 | deopt-eager 7; dependency-change 2 | prepare for on stack replacement (OSR) 4; wrong map 2; dependent field type constness changed 2 | 5 |
| three.webgpu.js:51953:9 | 9 | deopt-lazy 9 | (unknown) 9 | 1 |
| zombie-feet.js:107:32 | 8 | dependency-change 8 | dependent map was deprecated 8 | 1 |
| zombie-ability-runtime.js:157:23 | 7 | dependency-change 7 | dependent prototype chain changed 6; dependent field type constness changed 1 | 1 |
| resolveStaticProps (index.html) | 5 | deopt-eager 4; dependency-change 1 | Insufficient type feedback for unary operation 2; Insufficient type feedback for call 2; dependent field type constness changed 1 | 4 |
| zombie-feet.js:172:32 | 5 | dependency-change 5 | dependent map was deprecated 5 | 1 |
| updateWindSway (index.html) | 4 | deopt-eager 2; dependency-change 2 | wrong map 2; dependent prototype chain changed 2 | 3 |
| hordeFrame (index.html) | 4 | deopt-eager 3; dependency-change 1 | dependent prototype chain changed 1; Insufficient type feedback for binary operation 1; Insufficient type feedback for generic named access 1 | 4 |
| resetReloadAnim (index.html) | 4 | dependency-change 4 | dependent prototype chain changed 4 | 1 |
| zombie-feet.js:113:34 | 4 | deopt-eager 4 | wrong map 4 | 1 |
| spitter-motion.js:14:29 | 4 | dependency-change 4 | dependent prototype chain changed 4 | 1 |
| syncZombieFogCull (index.html) | 4 | deopt-eager 3; dependency-change 1 | wrong map 2; Insufficient type feedback for binary operation 1; dependent prototype chain changed 1 | 3 |
| tick (index.html) | 4 | deopt-eager 2; dependency-change 1; deopt-lazy 1 | not a Smi 1; Insufficient type feedback for generic named access 1; dependent prototype chain changed 1 | 4 |
| pushOutOfHouse (index.html) | 3 | deopt-eager 3 | Insufficient type feedback for call 1; Insufficient type feedback for binary operation 1; Insufficient type feedback for compare operation 1 | 2 |
| zombieIdleState (index.html) | 3 | deopt-eager 2; dependency-change 1 | wrong map 2; dependent prototype chain changed 1 | 3 |
| marine-turn.js:30:21 | 3 | dependency-change 3 | dependent prototype chain changed 3 | 1 |
| flowDirOn (index.html) | 3 | deopt-eager 2; dependency-change 1 | Insufficient type feedback for compare operation 1; dependent prototype chain changed 1; wrong map 1 | 3 |
| fogCullKeeps (index.html) | 3 | deopt-eager 3 | wrong map 3 | 2 |
| zombieTickDt (index.html) | 3 | deopt-eager 3 | wrong map 3 | 1 |
| feral-motion.js:73:18 | 3 | dependency-change 3 | dependent prototype chain changed 3 | 1 |
| updateNightRims (index.html) | 3 | deopt-eager 3 | Insufficient type feedback for generic named access 2; wrong map 1 | 3 |
| zombie-ability-runtime.js:160:10 | 3 | deopt-eager 3 | wrong map 3 | 1 |
| updateMarinePose (index.html) | 3 | deopt-eager 2; dependency-change 1 | Insufficient type feedback for generic named access 2; dependent prototype chain changed 1 | 3 |
| holdWeapon (index.html) | 3 | dependency-change 1; deopt-lazy 1; deopt-eager 1 | dependent prototype chain changed 1; (unknown) 1; Insufficient type feedback for generic keyed access 1 | 3 |
| resolveTreeCollisions (index.html) | 3 | dependency-change 2; deopt-eager 1 | dependent field type constness changed 2; Insufficient type feedback for unary operation 1 | 2 |
| drawMapBlips (index.html) | 3 | deopt-eager 2; dependency-change 1 | wrong map 2; dependent field type constness changed 1 | 3 |
| updateAudioDirection (index.html) | 3 | dependency-change 2; deopt-eager 1 | wrong map 1; dependent field type constness changed 1; dependent prototype chain changed 1 | 2 |
