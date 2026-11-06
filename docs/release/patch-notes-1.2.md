# Grave Shift 1.2

**DRAFT: Claude reads it, then Jerry.**

The woods now hide the valley. Follow the trail to Threshold, find the places beyond the trees, and make your way home when the light goes.

## First person

- Gun placement, hands and reloads have been tuned across the arsenal. The revolver's cylinder opens toward the support hand.
- Akimbo pairs show both guns in first person, one in each hand, each kicking on its own shots.
- The view stays steadier while walking and running, while the gun moves with the marine's stride. Sprint lowers it, and turns bring a smoother sway. The chainsaw sits nearer the centre of the view, and the minigun has a side grip for its support hand.
- The flamethrower pushes back smoothly as it fires instead of shaking the whole view.
- Sleeves now reach the gloves in first person.

## The world

- Denser woods gather around clearings and bending trails. A new run begins on a trail outside Threshold, with the HQ revealed as you approach. Camps sit farther out, and the map fills in where you have walked.
- Stone and thicket guide the approaches to the HQ. The dead come through its openings; a chainsaw can cut marked fallen logs for a shortcut, and iron horseshoes can close an opening to them.
- The Hollows' descent now leads down from daylight into wider tunnels and chambers, with more room to move.

## The dead

- A nearby threat closing from the dark can give itself away in the brush before it reaches you.
- The dead find the openings around Threshold and reach the clearing instead of pushing into the thicket.
- A knocked-down brute now plants its hands and knee to push itself back up.

## The guns

- Receivers, controls, steel, polymer and wood read more clearly at arm's length. The minigun and chainsaw have rebuilt bodies and grips; the Wasp no longer carries its folding stock.
- Magazines and suppressors have had a size pass, and lasers move with the gun's recoil and stay lit through reloads.

## Sound and music

- Each place has a little more of its own voice: a phone at the hikers' camp, radio chatter at the rangers' truck, wire before a storm, and iron at the trapper's yard.
- The music settles on a place before changing again, so a run across the valley does not chase a new track at every boundary.
- The Training Ground's floor now gives a concrete bootstep.
- Settings now have separate Master, Music and Ambience volume sliders.

## Fixes

- The weapon wheel keeps the camera view you chose. The radio vault's walls stay visible from the marine's eyes.
- The Training Ground no longer carries the title screen's light into a new run. Bought attachments tell you where to fit them, and the workbench and CIF previews can be zoomed.
- First-person menus release the cursor while they are open.
- Tracked objectives now sit with the READY briefing. Both bridges and the fords keep a walkable passage where the wall bands cross their trails.

## For testers

- `?gates=1` tries extra story-site barriers and keyed openings. They are off in the regular run.
- `?score=0` selects the earlier music; `?score=1` forces the layered score where its files are present.
- `?walls=hedge` shows the earlier brush barrier, `?walls=0` removes the wall bands, and `?woods=0` restores the older tree scatter for comparisons.

<!-- Sources for release review (each rendered line -> task and handoff or direct code evidence):
Intro/World 1 -> CU-205 handoffs/2026-11-01-cursor-CU-205.md; CU-206 handoffs/2026-11-01-cursor-CU-206.md; CU-209 handoffs/2026-11-01-cursor-CU-209.md; CU-198 handoffs/2026-10-31-cursor-CU-198.md.
First person 1 -> GP-20016 handoffs/2026-11-02-chatgpt-GP-20016.md; GP-20020 handoffs/2026-11-03-chatgpt-GP-20020.md.
First person 2 -> CL-301 handoffs/2026-11-03-claude-CL-301-akimbo.md; AG-228 handoffs/2026-11-03-antigravity-AG-228.md.
First person 3 -> CL-293 handoffs/2026-11-02-claude-CL-293-motion.md; AG-202 handoffs/2026-11-02-antigravity-AG-202-r1.md; GP-20016 handoffs/2026-11-02-chatgpt-GP-20016.md; GP-20024 handoffs/2026-11-03-chatgpt-GP-20024.md.
First person 4 -> CL-293 handoffs/2026-11-03-claude-CL-293-camera.md; AG-207 handoffs/2026-11-02-antigravity-AG-207.md.
First person 5 -> CL-293 handoffs/2026-11-02-claude-CL-293-hands-a.md.
World 2 -> CU-210 handoffs/2026-11-01-cursor-CU-210.md; CU-233 handoffs/2026-11-02-cursor-CU-233.md; GP-20007 handoffs/2026-11-01-chatgpt-GP-20007.md; GB-266 handoffs/2026-11-01-grokbot-GB-266.md.
World 3 -> GB-267 handoffs/2026-11-01-grokbot-GB-267.md; AG-191 handoffs/2026-11-01-antigravity-AG-191.md.
Dead 1 -> GP-20005 handoffs/2026-11-01-chatgpt-GP-20005.md; AG-181 handoffs/2026-11-01-antigravity-AG-181.md.
Dead 2 -> CU-210 handoffs/2026-11-01-cursor-CU-210.md; CU-211 handoffs/2026-11-01-cursor-CU-211.md.
Dead 3 -> GB-280 handoffs/2026-11-06-grokbot-GB-280.md; AG-236 qa/2026-11-06-AG-236/; Claude accepted in handoffs/requests.md.
Guns 1 -> GP-20021 handoffs/2026-11-03-chatgpt-GP-20021.md; GP-20022 handoffs/2026-11-03-chatgpt-GP-20022.md; GP-20023 handoffs/2026-11-03-chatgpt-GP-20023.md; GP-20024 handoffs/2026-11-03-chatgpt-GP-20024.md.
Guns 2 -> GB-260 handoffs/2026-11-01-grokbot-GB-260.md; GB-257 handoffs/2026-10-31-grokbot-GB-257.md.
Sound 1 -> GP-20011 handoffs/2026-11-01-chatgpt-GP-20011.md; CU-219 handoffs/2026-11-01-cursor-CU-219.md.
Sound 2 -> CL-294 core/audio.js calmFlow; AG-198 handoffs/2026-11-02-antigravity-AG-198.md.
Sound 3 -> J53 core/audio.js TRAIN_TAKE player/footstep-stone; Claude's 2026-11-02 answer in handoffs/requests.md.
Sound 4 -> GP-20029 handoffs/2026-11-06-chatgpt-GP-20029.md; AG-238 handoffs/2026-11-06-antigravity-AG-238.md.
Fixes 1 -> CU-189 handoffs/2026-10-31-cursor-CU-189.md; CU-191 handoffs/2026-10-31-cursor-CU-191.md.
Fixes 2 -> CU-192 handoffs/2026-10-31-cursor-CU-192.md; CU-229 handoffs/2026-11-02-cursor-CU-229.md; GP-19989 handoffs/2026-10-31-chatgpt-GP-19989.md.
Fixes 3 -> CU-228 handoffs/2026-11-02-cursor-CU-228.md.
Fixes 4 -> GP-19987 handoffs/2026-10-31-chatgpt-GP-19987.md; GP-20015 handoffs/2026-11-02-chatgpt-GP-20015.md.
For testers 1 -> CL-296 handoffs/2026-11-03-claude-CL-296-gates.md.
For testers 2 -> CL-275 core/audio.js scoreWanted/setScore.
For testers 3 -> CU-233 handoffs/2026-11-02-cursor-CU-233.md; CU-206 handoffs/2026-11-01-cursor-CU-206.md.
-->
