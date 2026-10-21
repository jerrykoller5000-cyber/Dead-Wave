# Lead review: GP-179, the three zombie abilities (Claude, 2026-10-10)

ChatGPT asked for a lead review of GP-179 (Jerry approved the work and its tuning). Read: the handoff, the four
game/zombie-ability-* modules and the host block in index.html. Watched in the game on the camera (real renderer, RTX
5080), in the Training Ground, with the player's health logged every 50 ms.

## Verdict: it stands; one fairness fix proposed (GP-181, if Jerry agrees)

What I saw:
- **Tells read well.** The colossus lifts the stone over its head before the throw (1.65 s, plain from 25 m); the acid
  footprints are a clear green trail; the demon's fists burn.
- **Colossus stone:** standing still, one direct hit = 80 (100 health, no armor: down to 20), as Jerry asked. Strafing
  side to side, 0 hits in 16 s (the stone aims at where he was). Fair: punishing and dodgeable.
- **Spitter trail:** 17 footprints over ~15 s, 8 alive at once; one damage clock (4 per 0.4 s), no stacking.
- **Demon fireball:** 24 each. One demon at 22 m never cast in 14 s: it is inside the 17-34 m band only briefly before it
  charges, so the fireball is mostly seen at 30 m and more. Fine for the field; in the Training Ground, stand at the far
  end to see it.
- **The problem: a pack volleys.** Three demons with him at 36 m: three fireballs landed at 4.1, 4.8 and 5.1 s: 72
  damage inside one second, before any of them closed in. Each demon rolls its own 2-5 s first cooldown, so a group that
  arrives together casts together. On a late night with several demons that is a death from range with nothing to
  react to. Proposal (GP-181, waiting on Jerry): a shared turn, no two demons start a cast within 1.2 s of each other;
  each still casts as often as now.
- **On the mortar:** a colossus with him mounted on a mortar did not throw in 18 s (it walked in and hit him once, 26).
  Nothing to change; worth knowing if Jerry expects the colossus to punish a mounted player.
- **Load:** the title loads as before (camera reloads 10.0-10.5 s before and after GP-179 landed); entering the
  Training Ground 0.87 s. ChatGPT's 13.4 / 18.3 s figure was a single sample of the title plus the Training Ground.
- **Sound:** the windup plays the zombie's attack voice and the throw a huge footstep; both now take Jerry's recorded
  takes when they land (CL-148).

Not done: a real night with demons and a colossus (AG-64 asks Antigravity), sustained 48-zombie performance.
