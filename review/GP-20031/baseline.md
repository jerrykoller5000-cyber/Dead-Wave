# GP-20031 camo scale baseline

Source: `qa/2026-11-02-AG-201/camo-audit.json` and its report. These are live-scene measurements before GP-20031. The rack figure is from the report's baked-rack audit; its JSON `rackUVs` array is empty, so a new rack measurement remains necessary.

| Surface | World scale | Measured repeats/m | Measured tile (m) | Reference image |
| --- | ---: | ---: | ---: | --- |
| Fitted uniform | 1.0000 | 2.323–2.369 | 0.422–0.431 | `qa/2026-11-02-AG-201/01-uniform-body-unarmed-1p.jpg` |
| M4 first person | 0.6741 | 3.513 | 0.285 | `qa/2026-11-02-AG-201/02-uniform-vm-m4-1p.jpg` |
| M4 body | 0.6741 | 3.513–3.525 | 0.284–0.285 | `qa/2026-11-02-AG-201/03-uniform-and-gun-body-m4-pop-1p.jpg` |
| AK first person | 0.6864 | 3.458–3.466 | 0.289 | `qa/2026-11-02-AG-201/04-weapon-ak-vm-1p.jpg` |
| Shotgun first person | 0.7935 | 2.989–3.000 | 0.333–0.335 | `qa/2026-11-02-AG-201/07-training-armory-rack-vs-viewmodel.jpg` |
| Rack baked copies | baked to model scale | ~2.381 | ~0.420 | `qa/2026-11-02-AG-201/07-training-armory-rack-vs-viewmodel.jpg` |

`index.html` calls `weaponSizeFactor` before `registerGunFurniture`, but that registration projects from each mesh's *unscaled local* geometry. It replaces the weapon builders' UVs. Given the gun's final root scale `s`, the previous density was `1 / (0.42s)` repeats/m. Multiplying projected UVs by `s` makes the first-person and held body copies `1 / 0.42 = 2.381` repeats/m. The root's existing builder scale must be included: M4 `sizeK` was `0.7327`, but its final root scale was `0.6741`. `rackGunCopy` bakes scale into vertices and reprojects, so it already targets that density. The minigun's extra stowed scales also needed compensation.

Claude handed over the narrow `index.html` UV and carried-copy sections. The correction and measured after results are in `review/GP-20031/measurements.md`.
