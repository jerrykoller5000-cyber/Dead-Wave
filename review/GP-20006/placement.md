# GP-20006 HQ thicket placement

The first W2 band follows a 60 m radius around HQ, 4 m wide and roughly 2.5 m
tall. The live PATHS geometry supplies the openings, so a later trail move
recomputes its gap. Wet river crossing points also remain open. The ring sits
outside the 24 m clearing and uses a polyline, trail corridors and shared
circle solids; the latter are what the existing build-clearance and dead's
flow-field systems inspect. `?walls=1` previews it, off otherwise until CU-210.

World-design rules served: **4 Negative Space** keeps the HQ clearing open;
**8 Functional Accessibility** preserves every crossing; **10 Controlled
Irregularity** varies bush clusters, sapling heights, fallen logs and rocks;
**11 Directional Guidance** makes the existing trails the legible way out.
The environmental family is **settler and civil / natural woods** from
`docs/art-direction.md`: pine dark, mossy green, bark brown and fieldstone,
rough surfaces with no reserved signal colors. The silhouette is a thorny,
grounded hedge below the large tree canopy, with saplings breaking its top.

Own gameplay-scale visual review: before and after from inside the ring at
(-52, 0), outside at (-68, 0), and a trail gap near (60, 7), in noon and dusk.
The closed ring reads as a continuous bush/log/rock wall, and the trail gap
reads as a path. Night was captured, but the title-screen camera did not
produce a full nighttime flashlight view. Overcast and the independent
Antigravity eyes-on review remain pending.

CU-209's later trail bends exposed a placement conflict: two oblique crossings
would have needed about 17.5 m and 32 m of missing band using the old arc-span
cut. Claude's ruling (2026-11-01, handoffs/requests.md) is to cut only the
actual trail corridor (trail half-width + 1 m from its polyline), regardless of
angle. Cursor was asked to place its bends outside the 50-70 m band so tracks
cross near square. The band now uses corridor-shaped cuts in its circles and
movement resolver. Four current crossings were probed in the live game: each
was unblocked with zero resolver movement; the closed (-60,0) span still pushes
radially. Matching wall-off/on noon shots were captured for the closed span and
the oblique trail; its dusk view is also in this folder.

Antigravity's AG-183 four-light RTX 5080 pass on the same four visual mesh
families scored 5/5 for each applicable asset category, found no floating or
clipped geometry, and validated the closed span and the river opening
(`qa/2026-11-01-AG-183/report.md`, `ag183-sheet.png`). That pass preceded the
path-following cut, so the latest corridor opening is covered by the matched
own noon views and dusk view above.
