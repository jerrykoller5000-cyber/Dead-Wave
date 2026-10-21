# GP-164 flamer sling contact diagnosis

The real-renderer t189 output changed from a passing right-sling gap of 0.001 m before to a failing 0.020 m after. The left-sling failure was preexisting (rounded 0.014 m before, 0.013 m after). No production source, carry transform, test or expectation was changed during this investigation.

## Reproduction

The parent released the camera after its behavior batch. An isolated `T.makeMarine()` preview exported the actual renderer's body/other-weapon triangles and the unchanged carry matrices for both flamer sling positions. The first sandbox camera attempt could not attach to the existing elevated service and failed to launch Chrome; the elevated `node tools/camera.mjs job review/weapon-fidelity/heavy-fit-job.json` then succeeded. It did not reload or change the main player.

The body/carry export completed at **2026-10-09 11:36:49.313 UTC**. Its SHA256 is `d7634029e7d7639518ac1becc01ba1db7b2658a19424d3d8627e5cd73bfc804d`. The immutable export fingerprint, heavy source hash and comparison completion time are recorded in `heavy-fit-source.json`.

`node review/weapon-fidelity/heavy-fit-compare.mjs` instantiates the saved original and current flamer using actual THREE and original shared geometry helpers. Both are measured against the same exported support triangles and carry matrices, isolating the weapon geometry change. `heavy-fit-comparison.json` contains exact points, support triangles, directions and measurements.

- Right sampled metric: 0.568 mm before, 20.172 mm after. Keeping the original inward direction still gives 19.259 mm after, so changed centroid weighting is not the cause.
- The old nearest sample is a vertex of the removed top rail, local `[0.022414213, 0.095585786, 0.041999999]`, supported by another stowed weapon.
- The new receiver already has a top triangle directly under that sample. Its nearest surface point is local `[0.022414213, 0.094999999, 0.041999999]`, only 0.491 mm away in the carried world scale. Barycentric coordinates `[0.266519, 0.135228, 0.598253]` confirm that point is inside the existing triangle, rather than a new test vertex.
- From that real receiver surface, t189's inward ray gives 0.336 mm with the new direction, or 0.368 mm with the old direction. t189 starts other-weapon rays 2 mm inward, so the actual surface-to-support distance is 2.336 mm. The old rail's corresponding distance was 2.568 mm.
- The left nearest point is the exact same tank vertex before/after; its sampled gap changes only with direction, 13.380 to 13.262 mm.

## Conclusion

The right-side failure is caused by sparse vertex sampling omitting the interior of the new smooth receiver triangle. It does not establish a physical contact regression: an existing surface point is slightly closer to the same supporting stowed weapon. The final bright flamer image was also inspected and shows the intended clean receiver, connected hose and tank straps.

No cosmetic correction is justified by this evidence. Adding vertices or a hidden contact piece solely to satisfy this sampling pattern would distort the implementation. t189 remains a reported failure; its owner can consider surface sampling in a separate review. The heavy production source remains `c1e9761739d4e7bbb9b6fd61968c8382faf6676d20c89af1ecf940d30ab98003`.
