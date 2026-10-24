# GB-220 group 1+2 - prepared, WAITING on index.html (AG-119 holds it)

Changed: nothing in the game yet. qa/2026-10-23-GB-220/before/ (14 shots: stow-<a>-<b>-back/top.png per sling loadout, with camera sidecars; shots.cmd re-takes them as `after`). Earlier g1/g2/g3 handoffs: BOM stripped.

Planned (measured on the real renderer with a scratch copy of t189 that prints each spot's clearance, push direction in the spot's frame and scale; new = old + dir * (minClear - 0.004) / scale; passing sides kept):
- CARRY_FIT sling rows (index.html ~20830):
  m4       [[-0.034,-0.03,-0.004],[0.002,-0.001,0]]      -> [[0.043,0.021,0.005],[0.025,-0.014,-0.003]]
  ak       [[0.008,0.008,0.001],[0.001,-0.001,0]]        -> [[0.046,0.034,0.006],[-0.057,0.042,0.007]]
  aa12     [[0.021,0.017,0.003],[-0.021,0.017,0.003]]    -> [[0.093,0.06,0.012],[-0.055,0.035,0.007]]
  shotgun  [[-0.047,-0.038,-0.006],[0.041,-0.034,-0.005]] -> [[-0.002,-0.013,-0.001],[-0.003,-0.009,0]]
  launcher [[-0.006,-0.004,-0.001],[0.021,-0.014,-0.003]] -> [[-0.006,-0.004,-0.001],[-0.006,0,0]]
  flamer   [[0.062,0.057,0.007],[0.004,-0.003,0]]        -> [[0.034,0.039,0.004],[0.022,-0.012,-0.002]]
  chainsaw [[0.004,0.003,0.001],[-0.016,0.014,0.002]]    -> [[-0.007,-0.003,0],[0.04,-0.016,-0.005]]
- t228 launcher/flamer: support fist upside down on the vertical foregrip (wrist +x at 180 deg to the grip's up). Candidate: index.html ~46667 `sgL` gives 'up' +1; flip for 'up' - verify in the inspector first.

Tests: none after a change (no change made).

Not verified / blocked:
- index.html check-in refused for ~25 min: chatgpt GP-19960 (since released) and antigravity AG-119 (active, not stale). Nothing forced.
- t224 0-ticks audio, t188 chainsaw hands, t195 m4/pistol roll, t229 revolver/akimbo: not diagnosed yet.