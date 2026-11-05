index.html as served: 63867 script lines, document offset 1336, 2250 top-level functions found
577 deoptimizations in the last 150 s of the run (the log ends at 185.2 s).

## By kind and by reason
| kind | count |
| --- | --- |
| dependency-change | 278 |
| deopt-eager | 272 |
| deopt-lazy | 27 |

| reason | count |
| --- | --- |
| embedded weak objects cleared | 144 |
| wrong map | 105 |
| dependent prototype chain changed | 69 |
| dependent field type constness changed | 57 |
| Insufficient type feedback for generic named access | 55 |
| Insufficient type feedback for call | 29 |
| prepare for on stack replacement (OSR) | 27 |
| (unknown) | 27 |
| Insufficient type feedback for compare operation | 14 |
| Insufficient type feedback for binary operation | 14 |
| not a Smi | 9 |
| not int32 | 9 |

## By function (index.html) or by position (other files): the most deoptimized
| function or position | deopts | kinds | top reasons | distinct lines |
| --- | --- | --- | --- | --- |
| updateZombies (index.html) | 28 | deopt-eager 20; dependency-change 6; deopt-lazy 2 | Insufficient type feedback for generic named access 7; Insufficient type feedback for call 7; dependent field type constness changed 5 | 21 |
| zombieLateStep (index.html) | 25 | deopt-eager 22; dependency-change 3 | wrong map 12; Insufficient type feedback for call 5; dependent field type constness changed 3 | 18 |
| three.webgpu.js:51953:9 | 16 | deopt-lazy 16 | (unknown) 16 | 1 |
| resolveStaticProps (index.html) | 11 | dependency-change 7; deopt-eager 4 | dependent prototype chain changed 7; wrong map 2; Insufficient type feedback for call 1 | 3 |
| updateFlowFieldOn (index.html) | 10 | deopt-eager 10 | prepare for on stack replacement (OSR) 7; wrong map 2; minus zero 1 | 4 |
| zombie-ability-collision.js:91:7 | 10 | deopt-eager 10 | prepare for on stack replacement (OSR) 10 | 1 |
| three.webgpu.js:51842:33 | 9 | deopt-eager 9 | wrong map 9 | 1 |
| zombie-ability-collision.js:78:7 | 8 | deopt-eager 8 | prepare for on stack replacement (OSR) 8 | 1 |
| (top level or nested) (index.html) | 7 | dependency-change 5; deopt-eager 2 | dependent field type constness changed 4; not int32 1; embedded weak objects cleared 1 | 6 |
| resolveTreeCollisions (index.html) | 7 | deopt-eager 5; dependency-change 2 | Insufficient type feedback for generic named access 2; dependent field type constness changed 2; wrong map 1 | 6 |
| updateTreeFade (index.html) | 7 | dependency-change 4; deopt-eager 3 | dependent prototype chain changed 4; wrong map 3 | 3 |
| updateFish (index.html) | 6 | deopt-eager 4; dependency-change 2 | dependent prototype chain changed 2; Insufficient type feedback for binary operation 2; Insufficient type feedback for compare operation 1 | 4 |
| zombie-ability-collision.js:135:19 | 6 | deopt-eager 6 | Insufficient type feedback for generic named access 6 | 1 |
| zombie-ability-collision.js:39:17 | 6 | dependency-change 6 | dependent prototype chain changed 4; dependent field type constness changed 2 | 1 |
| updateTreeSway (index.html) | 6 | deopt-eager 4; dependency-change 2 | wrong map 2; prepare for on stack replacement (OSR) 2; dependent prototype chain changed 2 | 3 |
| updateWildlife (index.html) | 5 | deopt-eager 4; dependency-change 1 | wrong map 2; Insufficient type feedback for generic named access 2; dependent prototype chain changed 1 | 5 |
| shotBlocked (index.html) | 5 | deopt-eager 4; dependency-change 1 | wrong map 4; dependent prototype chain changed 1 | 4 |
| zombie-ability-collision.js:117:18 | 5 | deopt-eager 5 | wrong map 5 | 1 |
| updateAudioDirection (index.html) | 5 | dependency-change 4; deopt-eager 1 | dependent prototype chain changed 3; dependent field type constness changed 1; wrong map 1 | 2 |
| hordeFrame (index.html) | 4 | deopt-eager 3; dependency-change 1 | Insufficient type feedback for binary operation 1; Insufficient type feedback for generic global access 1; Insufficient type feedback for generic named access 1 | 4 |
| fogCullKeeps (index.html) | 4 | deopt-eager 2; dependency-change 2 | dependent field type constness changed 2; Insufficient type feedback for generic named access 1; not a Smi 1 | 3 |
| marine-turn.js:30:21 | 4 | dependency-change 4 | dependent prototype chain changed 3; embedded weak objects cleared 1 | 1 |
| zombieIdleState (index.html) | 4 | deopt-eager 3; dependency-change 1 | wrong map 3; dependent prototype chain changed 1 | 4 |
| updateNightRims (index.html) | 4 | deopt-eager 4 | Insufficient type feedback for generic named access 2; wrong map 2 | 2 |
| resetReloadAnim (index.html) | 3 | dependency-change 3 | dependent prototype chain changed 3 | 1 |
| marine-turn.js:28:16 | 3 | dependency-change 3 | dependent prototype chain changed 2; embedded weak objects cleared 1 | 1 |
| shambler-motion.js:56:36 | 3 | dependency-change 3 | dependent field type constness changed 1; dependent prototype chain changed 1; embedded weak objects cleared 1 | 1 |
| zombie-ability-runtime.js:157:23 | 3 | dependency-change 3 | dependent field type constness changed 3 | 1 |
| tick (index.html) | 3 | dependency-change 1; deopt-lazy 1; deopt-eager 1 | dependent prototype chain changed 1; (unknown) 1; Insufficient type feedback for generic named access 1 | 3 |
| updateWorldAnimations (index.html) | 3 | dependency-change 2; deopt-lazy 1 | dependent field type constness changed 1; dependent prototype chain changed 1; (unknown) 1 | 2 |
