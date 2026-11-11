# Ammo types (J133, J134)

Jerry, 10 Nov 2026 (J133, D-149): "Ammo needs to be fleshed out a little more. The cartridges must reflect their
real-world counterparts on all guns. Primarily the spent casings. For shotgun ammunition types the shell casings are a
different color depending on what type has been expended. Slugs are most effective and cost the most, buckshot is a
little more effective than birdshot (the typical round) and more expensive. Use X to change ammunition types. If the
player changes ammunition types he will first have to unload the current ammunition and put in the new ones. He retains
the ejected ammunition."

J134 (standing, D-150, AGENTS.md rule 16b): no ammo types on a gun that can fire full-auto (the pistol with its sear
included). There X is the fire selector; on a gun with types X changes the ammo. The AA-12 keeps one shell.

The numbers live in one place, `combat/ammo-types.js` (CB-294). Everything below is a proposal: change any number there
and the game, the Armory and the tests follow.

## The pump shotgun (12 gauge, 2 3/4")

| Type | Real round | Pellets x damage | Shell total | Effect vs birdshot | Spread | Reach | Pack | Per round | Hull |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Birdshot (issued) | #4 shot | 7 x 9 | 63 | x1.00 | 0.14 | 22 m | 20 for $20 | $1.00 | red |
| Buckshot | 00 buck | 8 x 10 | 80 | x1.27 | 0.12 | 26 m | 20 for $30 | $1.50 | blue, one band |
| Slug | 1 oz rifled slug | 1 x 100 | 100 | x1.59 | 0.02 | 44 m | 20 for $40 | $2.00 | ivory, two bands |

- Effect is in Jerry's hit sheet's terms (game/hit-balance.js scores a shell as a part of a body's health): a type counts by
  its shell total against the issued shell's (combat/ammo-types.js typeHitBase, the rule CB-248 used).
- Birdshot is the shell the game always had: the same sheet, the same 12ga pack and the same reserve. Buckshot and slugs are
  counted on their own and bought by the pack at the Armory, each up to the 12ga reserve's cap; a buy near the cap sells
  only what fits, at its part of the pack's price.
- Hull colours are the game's choice (real makers colour hulls by brand, not by load): birdshot red, buckshot blue with one
  band, slug ivory with two (ChatGPT 2's GT-20080 shells: one 2 3/4" length, a taller brass head on buckshot and slug, the
  crimp open on a spent one). The pump throws the hull of the type that was fired.
- The 3.5-inch magnum loads of CB-248 (bought once and fitted) are replaced by these: rounds are bought and counted per
  type, and X changes what is in the tube.

## Changing type (X)

- X on a gun with types goes to the next type in the order (birdshot, buckshot, slug, round again) that he carries any of.
  With none of any other type, X says so and nothing happens.
- First every round in the gun comes out, one at a time (0.36 s a shell: worked out through the action), back into that
  type's count: he keeps them. Then the new type goes in, one at a time (0.42 s a shell, the reload's pace), up to the
  tube or what he carries, and a short settle (0.25 s). A full tube of eight to eight: about 6.5 s.
- Firing, a weapon change or R stops the change where it is: the rounds already moved stay moved, and the tube holds
  whatever went in.
- The hands follow the change through a hook (CE-3, Claude 5): the view's state carries `ammoSwitch` (from, to, phase
  'unload' | 'load' | 'settle', the round in hand 0..1, counts).

## For other guns

Any gun that never fires full-auto can have types later: add it to `AMMO_TYPES` with its rounds. The J134 test fails if a
gun that can fire full-auto is given types.
