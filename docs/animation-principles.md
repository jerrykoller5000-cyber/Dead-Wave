# Universal animation principles

Jerry, 2026-10-24: "Here are some principles we can live by." A reference standard for every agent's animation work
(version 1.0, engine-agnostic). AGENTS.md rule 18 and D-89 make it binding. The references Jerry found to go with it
are at the end.

## I. Fundamental philosophy

**Animation is the communication of force, intention, weight, emotion, and causality through change over time.**

Every animated object must appear to obey a consistent internal logic, whether realistic, stylized, mechanical,
supernatural, or abstract.

The purpose of animation is not simply to move an object between positions. It is to convince the observer that the
object possesses believable physical properties, is responding to forces, or is acting with intention.

All AI animation agents must observe the following principles.

## II. The 12 classical principles

### 1. Squash and stretch
Movement should communicate elasticity, rigidity, and the forces acting upon an object.

- Soft objects compress under impact and extend during acceleration.
- Rigid objects should maintain their structure unless deformation is intended.
- Organic movement may use subtle deformation even when anatomically realistic.
- Preserve apparent volume where appropriate.
- Never apply exaggerated deformation indiscriminately.

**Rule:** Deformation must communicate material properties and force.

### 2. Anticipation
Actions should contain preparatory movement when anticipation improves readability or physical plausibility.

- A jump commonly begins with compression.
- A heavy strike involves loading the body.
- A turn may begin with the eyes or head.
- Anticipation may be minimal for reflexive or extremely fast actions.

**Rule:** Preparation should communicate an action's intention without introducing unnecessary delay.

### 3. Staging
The viewer must understand what is happening.

- Major actions require recognizable silhouettes.
- Important motions should not become obscured by unrelated activity.
- Poses must remain understandable from the intended viewing perspective.
- Secondary movement must not compete with the primary action.

**Rule:** Clarity takes priority over complexity.

### 4. Straight-ahead action and pose-to-pose
Animation can be constructed continuously or from deliberate structural poses.

- Use pose-to-pose methods for controlled actions, locomotion, and gameplay.
- Use continuous procedural methods for dynamic reactions and unpredictable motion.
- Establish meaningful key poses before interpolating complex actions.
- Preserve continuity between generated and authored motion.

**Rule:** Define the movement's structural intention before adding detail.

### 5. Follow-through and overlapping action
Connected parts of a moving object rarely start and stop simultaneously.

- Arms, clothing, equipment, and appendages may continue moving after the torso stops.
- Different body segments accelerate and decelerate at different times.
- Follow-through should reflect mass, stiffness, and attachment.
- Avoid uniform movement of every joint.

**Rule:** Motion should propagate through connected structures rather than occurring everywhere simultaneously.

### 6. Slow in and slow out
Movement generally exhibits changes in velocity rather than constant-speed interpolation.

- Apply appropriate acceleration and deceleration.
- Preserve sharp movements where the action demands them.
- Avoid excessive easing that makes characters feel sluggish.
- Sudden impacts may produce immediate changes in direction.

**Rule:** Velocity profiles must match the forces and intentions driving movement.

### 7. Arcs
Organic and rotational movement generally follows curved trajectories.

- Hands, feet, heads, and limbs often travel along arcs.
- Joint rotation naturally creates curved endpoint paths.
- Mechanical systems may legitimately use straight-line movement.
- Avoid accidental angular or erratic trajectories.

**Rule:** Motion paths must follow the object's structure and physical constraints.

### 8. Secondary action
Supporting movement adds meaning without replacing the primary action.

- Breathing may accompany an idle pose.
- Clothing and equipment respond to movement.
- Facial expression and posture can reinforce intention.
- Excessive secondary animation creates visual noise.

**Rule:** Secondary movement must support, not distract from, the primary movement.

### 9. Timing
The duration and spacing of movement determine its perceived properties.

- Heavy objects often require greater effort to accelerate.
- Light objects may react quickly.
- Fatigue, urgency, confidence, fear, and hesitation influence timing.
- Actions must respect gameplay and interaction requirements.
- Different phases of the same action may require different speeds.

**Rule:** Timing must communicate physical properties, emotional state, and functional purpose.

### 10. Exaggeration
Physical movement may be emphasized to improve communication.

- Exaggerate silhouettes when necessary for readability.
- Emphasize impacts, recoil, anticipation, or expressions selectively.
- Reduce exaggeration in realistic animation.
- Maintain the established artistic language.

**Rule:** Exaggeration should clarify motion, never substitute for proper mechanics.

### 11. Solid drawing / spatial construction
Animated structures must retain convincing three-dimensional relationships, even in two-dimensional presentations.

- Preserve anatomy, proportions, balance, and perspective.
- Maintain consistent spatial relationships between connected components.
- Prevent accidental joint inversion and unnatural limb configurations.
- Respect the rig's intended rotational axes and limits.

**Rule:** Every pose must remain spatially coherent.

### 12. Appeal
Animation must communicate a recognizable personality, purpose, or physical identity.

- Different characters should have distinguishable movement signatures.
- A movement should reinforce the subject's design and role.
- Avoid generic motion when character-specific behavior is appropriate.
- Appeal does not necessarily mean attractiveness; disturbing or unnatural motion can be highly effective.

**Rule:** Movement should express the identity of the animated subject.

## III. Universal physical motion principles

### 13. Causality
Every meaningful movement should have an identifiable cause: intention, gravity, impact, environmental force,
mechanical operation, or another defined influence.

**Rule:** Avoid unexplained changes in motion unless they are deliberately supernatural or stylistic.

### 14. Mass and inertia
Objects resist changes in velocity and direction.

- Larger or heavier masses generally exhibit greater inertia under comparable forces.
- Momentum should influence stops, turns, impacts, and landings.
- Loose equipment may continue moving after the character stops.
- Characters should not change velocity instantaneously without a justified mechanism or gameplay requirement.

**Rule:** Movement must express the subject's apparent mass and inertia.

### 15. Center of mass and balance
Bodies must maintain balance or convincingly respond to its loss.

- Standing characters generally keep their center of mass appropriately supported.
- Leaning, accelerating, and stopping require suitable changes in posture.
- Rapid directional changes require believable foot placement and body positioning.
- Falling characters should lose balance in a causally understandable way.

**Rule:** Weight distribution must remain credible throughout movement.

### 16. Contact and support
Physical contact must be consistent.

- A planted foot must not visibly slide without intention.
- Hands gripping an object must maintain their intended contact.
- Seated or kneeling characters must align correctly with supporting surfaces.
- Contact points should respond appropriately to moving objects and uneven terrain.

**Rule:** Contact constraints take priority over decorative motion.

### 17. Force transmission
Actions should communicate how force travels through a structure.

- A heavy strike may involve the legs, hips, torso, shoulder, and arm.
- A landing transfers impact through the feet and legs into the body.
- Recoil influences the weapon and its supporting body parts.
- Mechanical assemblies transfer forces through their joints and connections.

**Rule:** Major movements should originate from plausible sources of force.

### 18. Anatomical and mechanical constraints
All structures must operate within their defined capabilities.

- Respect joint limits and attachment relationships.
- Avoid unintended stretching of rigid structures.
- Prevent self-intersection where physically inappropriate.
- Maintain correct bone lengths and proportions.
- Nonhuman creatures may use intentionally different constraints.

**Rule:** Never break the structure of the animated subject without explicit artistic justification.

### 19. Continuity
An object must retain temporal and spatial consistency.

- Positions, rotations, and velocities should transition coherently.
- State transitions must avoid unexplained snapping.
- Root movement should correspond to visible locomotion.
- Looped animations must connect cleanly or use a deliberately designed transition.

**Rule:** Every frame must belong to a coherent sequence of motion.

### 20. Environmental interaction
Motion must respond to the surrounding world.

- Feet conform to ground height and orientation.
- Obstacles affect trajectories.
- Slopes and stairs influence gait.
- Water, gravity, friction, and environmental forces influence motion where applicable.
- Spatial clearance must be respected.

**Rule:** Characters must appear to inhabit their environment rather than move independently of it.

## IV. Game animation principles

### 21. Responsiveness
Animation must serve gameplay rather than obstruct it.

- Input response should match the game's intended feel.
- Recovery times and animation locks must be deliberate.
- Transitions must support state changes.
- Root motion and gameplay movement must remain coordinated.
- Realism may be compromised when necessary for responsive control.

**Rule:** Functional control and visual credibility must be balanced according to the game's design.

### 22. Animation layering
Independent motions should be separable where practical: lower-body locomotion, upper-body aiming, head tracking,
weapon recoil, facial expression, equipment movement, environmental reactions.

**Rule:** Do not create unnecessary full-body animations when composable motion layers provide a more flexible solution.

### 23. Transition integrity
Every animation must define how it enters, exits, blends, or is interrupted.

- Preserve the character's pose and velocity when appropriate.
- Handle transitions between standing, crouching, running, falling, and interacting.
- Avoid abrupt changes in limb orientation.
- Define interruptible and noninterruptible phases.
- Ensure transition logic matches gameplay state.

**Rule:** An animation is incomplete until its transitions have been tested.

### 24. Camera-aware readability
Motion must remain understandable from the player's actual perspective.

- Top-down games require clear silhouettes and readable directional movement.
- First-person games prioritize weapon, hand, and camera motion.
- Third-person games require coordinated full-body mechanics.
- Distant characters often need simpler, stronger gestures.
- Camera movement must not introduce unnecessary discomfort.

**Rule:** Judge animation from the gameplay camera, not only the animation editor.

### 25. Procedural and authored motion
Use the appropriate combination of authored clips, procedural systems, and physics.

- Authored clips establish expressive foundational movement.
- Inverse kinematics maintains environmental and interaction constraints.
- Procedural layers provide aiming, corrections, and variation.
- Physics handles appropriate dynamic responses.
- Blending systems combine these into coherent final movement.

**Rule:** Prefer hybrid animation systems when they provide better control, reuse, or environmental adaptation.

### 26. Frame-rate independence
Movement must not depend on a fixed rendering frame rate unless an explicitly fixed simulation step is being used.

- Calculate motion using elapsed or fixed simulation time as appropriate.
- Ensure interpolation behaves consistently.
- Prevent animation drift from variable frame rates.
- Validate at multiple playback speeds and frame rates.

**Rule:** Animation timing must remain stable under expected runtime conditions.

## V. The construction protocol

Every agent producing or modifying animation follows this workflow.

1. **Define the action.** Subject and rig; starting state; intended final state; physical or narrative purpose;
   duration and timing constraints; camera perspective; required environmental interactions; required style; gameplay
   interruptions and restrictions.
2. **Analyze reference motion.** Search the motion libraries; identify comparable actions; examine major poses and
   timing; identify contact points and weight shifts; decide what can be reused; record the differences between the
   reference and the required result. Never blindly copy motion without considering skeleton differences, timing, or
   context.
3. **Establish structural poses.** The minimum key poses that communicate the action. For each: body orientation,
   center-of-mass position, supporting contacts, limb configuration, action intention, relative timing.
4. **Construct motion** between the poses (interpolation, procedural control or motion synthesis), keeping logical
   acceleration, appropriate trajectories, anatomical constraints, contact stability, consistent timing and coherent
   weight transfer.
5. **Add secondary motion:** follow-through, inertial lag, equipment motion, small postural adjustments, breathing or
   character-specific behavior. Never only to make an animation busier.
6. **Integrate with gameplay.** Test it in its intended environment: input responsiveness, state transitions,
   root-motion alignment, collision compatibility, environmental adaptation, gameplay-camera readability.
7. **Validate and correct**, by objective measurements and visual inspection. Correct the most significant defects
   before adding polish.
8. **Export and document:** name and purpose, rig compatibility, duration, looping, root-motion behavior, foot and hand
   contact intervals, transition requirements, gameplay events, known limitations, validation results.

## VI. Automated animation quality assurance

Each animation is scored 0-5 in every category that applies:

| Category | Evaluation question |
| --- | --- |
| Intention | Is the action immediately understandable? |
| Timing | Does the motion communicate the appropriate speed, weight, and purpose? |
| Balance | Are weight shifts and support physically credible? |
| Contact | Are feet, hands, and interacting objects properly constrained? |
| Continuity | Are transitions and motion paths free from unintended snapping? |
| Structure | Are joints, proportions, and spatial relationships preserved? |
| Environmental fit | Does the animation interact appropriately with surrounding geometry? |
| Character | Does the motion communicate the subject's intended personality or nature? |
| Gameplay | Does it function correctly during real gameplay? |
| Style | Does it match the visual and animation language of the project? |

0 broken or absent; 1 severe problems; 2 significant problems; 3 acceptable but unpolished; 4 convincing and
functional; 5 excellent. **The acceptance target is at least 4 in every applicable category.** Critical mechanical
failures (broken rigs, invalid mandatory contacts) are corrected regardless of the overall score. Scores are
assessment aids, not substitutes for measured tests or Jerry's review.

## VII. Common animation failures

Actively identify and avoid: foot sliding and skating; unexplained position snapping; excessive uniform easing;
weightless acceleration or stopping; floating or unsupported poses; unnatural joint rotations; incorrectly
synchronized body segments; unintended geometry intersections; robotic repetition without appropriate variation;
motion that contradicts player input; visible discontinuities between animation states; excessive or distracting
secondary motion; missing anticipation or follow-through where physically necessary; unclear silhouettes;
camera-dependent visual defects; incorrect contact timing; weapon or prop misalignment; inconsistent playback across
frame rates; unnecessary procedural noise; overcomplex movement that obscures the intended action.

**Correction priority:** 1. broken structure, invalid contact and gameplay failures; 2. incorrect pose, balance or
spatial relationships; 3. timing, velocity and transition problems; 4. readability and character expression;
5. secondary movement and fine polish.

## VIII. Operating instructions

- **A. Reason about motion before generating it:** the cause, the intended result, the major poses, the forces and the
  physical constraints.
- **B. Prefer reference-informed movement.** Search for existing appropriate motion before synthesizing an action from
  scratch.
- **C. Preserve structural integrity:** the rig, joints, object relationships and required contacts.
- **D. Animate the whole physical system:** balance, inertia, environmental response and motion propagation, even when
  only one body part appears to initiate an action.
- **E. Prioritize clear, intentional motion.** No complicated animation without a functional or expressive purpose.
- **F. Optimize for the actual use case:** gameplay requirements, visual style, camera distance and subject type.
- **G. Validate the result, not the code.** Code that runs does not prove the animation looks or behaves correctly.
- **H. Iterate using evidence:** identify observable defects, isolate their causes, apply targeted corrections, retest.
- **I. Do not conceal failure.** Report unresolved defects, unsupported rig requirements, missing references and
  quality limitations.
- **J. Treat animation as an integrated system.** Every new motion must coexist with locomotion, interactions,
  transitions, physics and the other animation layers.

## IX. Final governing principle

**Good animation is not defined by the number of keyframes, the sophistication of the algorithm, or the realism of the
simulation. It is defined by the clarity, coherence, responsiveness, and credibility of the resulting movement.**

Motion must look intentional, remain consistent with its own physical and artistic rules, and fulfill its purpose.
Every animation agent must prioritize the quality of observable movement over the complexity of its implementation.

---

## The references (Jerry, 2026-10-24)

| Library | What | Terms | Use |
| --- | --- | --- | --- |
| CMU Graphics Lab motion capture, as FBX: huggingface.co/datasets/gbionics/cmu-fbx | 2,548 human clips: a bones-only skeleton with root motion, no fingers; folders by subject, `{subject}_{trial}.fbx`; a description per clip | CMU's terms: may be included in a commercial game; the data itself may not be resold (converted data included); credit mocap.cs.cmu.edu | The marine's moves (CL-261) and any human motion |
| Quaternius, Ultimate Animated Animals: quaternius.com/packs/ultimateanimatedanimals.html | 12 animals, 12+ animations each (attack, death, kicks, gallops, walk, jump); FBX, OBJ, Blend, glTF | CC0 | Four-legged motion; any bird among them for the birds (N22) |
| Quaternius, Easy Enemy: quaternius.com/packs/easyenemy.html | 5 animated enemies; FBX, OBJ, Blend | CC0 | Creature motion (the guardian, the Hollows) |
| Quaternius, Universal Animation Library 1 and 2 (already in: `assets/anim/reference/`) | Humanoid clips, 23 kept so far | CC0 | Through `studio/reference.js` |

Only the clips we use are brought into the repo (`assets/anim/reference/`), each with its source and terms in that
folder's LICENSE.txt, as UAL's are.
