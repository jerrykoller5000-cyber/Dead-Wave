# claude3 — CC-354 tcc341/tcc344 read every SkinnedMesh at its drawn vertex — LANDED — 2026-11-15
Changed:          The two clip readers (effAttr) now read CC-353's garments by posed()/posedNormals() and any other SkinnedMesh at its drawn vertex (getVertexPosition, normals through the blended bone matrices); bars unchanged (0.5 mm). Director's pick (a).
Files:            tools/tests/tcc341.js (99ad0137 -> a9d19620), tools/tests/tcc344.js (aa411932 -> 0f1ab775); hunks review/CC-354/*.json applied by exact text on the unchanged bases; backups _DELETE ME/claude3-cc354-backup/
Tests:            cloud, landed tree (index 54867cc9): run-all tcc341 tcc344 --jobs 1 --no-retry -> "ok tcc341 16 pass 0 fail", "ok tcc344 7 pass 0 fail", "2 checks: 23 pass, 0 fail". Expectation unchanged (no --review needed: no bar moved).
Screenshots:      none (test readers only)
Not verified:     the 9 real-three tcc341 rows (same with or without this change): CC-354b, on the after-zombies list (board CL-361).
Requests:         none
Contract changes: none
Rule 16:          tests ran in my cloud (D-135), one instance, through the cloud slot; nothing on the PC.
