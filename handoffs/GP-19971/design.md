# GP-19971 construction notes

Family: the uncanny. A voice behind a shield: suspended pursuit, chest-open scream,
then a defensive retreat. Same 1.2 s scream and 2.4 s exposure, collision root,
damage and steering. Third-person silhouette first, close face second.

## References examined

- Quaternius UAL2: https://quaternius.com/packs/universalanimationlibrary2.html
  and the local catalogue's Zombie_Idle_Loop, Zombie_Scratch and
  Zombie_Walk_Fwd_Loop. Those are grounded zombie actions; none expresses this
  shielded hover / ear-cover sequence. No clip copied or retargeted.
- Front full-voice scream photo, viewed in the browser:
  https://www.buzzfeed.com/ravenishak/advice-not-to-ignore
  (image: https://img.buzzfeed.com/buzzfeed-static/static/2023-10/23/18/asset/cdb7b8ab9b18/sub-buzz-790-1698084549-1.jpg).
  Narrowed eyes, inward brow tension, stretched cheek folds, jaw dropping below
  an oval opening, curved teeth arches. Anatomy reference only; no likeness or pixels reused.
- Ear-cover pose, viewed in the browser:
  https://static9.depositphotos.com/1005116/1204/i/450/depositphotos_12040264-stock-photo-closing-ears-with-hands-and.jpg
  Elbows outside and slightly above shoulders, forearms returning toward the
  ears, hands on their own sides, exposed chest. Used as a pose reference only;
  no image downloaded or included in game assets.

## Structural poses and constraints

1. Drift: elbows down and slightly behind shoulders, gently trailing hands;
   slow lagging forearms, supported by the existing supernatural hover.
2. Scream: chest leads, shoulders abduct and draw back, elbows nearly extended.
   Ease in over the existing scream anticipation; preserve the face's visibility.
3. Exposed: elbows out, forearms raised beside the head, small asymmetric flinch.
   Existing retreat/footwork continues; no hands crossing the torso midline.
4. Return: blend to the trailing pose as protection returns. Injuries and attacks
   retain their own animation priority; restore all modified transforms first.

Tests sample limb segments and transitions at 30/60/120 Hz, including absent ankle
helpers. No joint lengths or body-root position may change. Refine head geometry
without extending the head's bounding box down; retain bruise tongue/pale-green
eyes. Render front, three-quarter and profile, rest and scream, in noon,
overcast, dusk and night. Gameplay filmstrip and independent GPU review follow.

## Baseline findings

- Arm posing is nested after the ankle-helper check; missing ankles leave crossed
  bind arms. A regression test reproduces it (FAIL before the fix).
- The exposed pose folds hands toward the chest; the scream gestures forward.
- The head leans so far back in the scream that the mouth is obscured head-on.
- Pure-zero face albedo hides the cheek forms; the dangling tongue and spiky
  fringe dominate. Keep the black shroud, but give the face a restrained charcoal
  response and a compact dropped jaw with readable cheek/brow tension.
- Desktop compositor captures returned some black buffers. The proof runner now
  uses DWInspect.shot's synchronous render/copy and rejects blank images.
