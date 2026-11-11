# chatgpt — GP-20104 Watchman folded carry retest — 2026-11-11

Changed: GT-20085's returned model clears the folded carry height diagnosis: t213 now measures 0.23 m wide × 0.44 m high × 1.23 m long. The remaining fake-runner shoulder-seat failure is in Claude 2's active CARRY_M240 re-seat and has been sent to him.
Files: This handoff only; no game source changed.
Tests: PC game-test slot `node tools/tests/run-all.mjs t213 --agent chatgpt --task GP-20104 --jobs 1` → `FAIL t213 21 pass 1 fail 106.5s`; folded legs PASS, only `its receiver rests on his right shoulder (0.31 m from the joint)` fails the strict <0.30 m limit. ChatGPT 2's real-renderer t213 after the model edit was 21/1 with the fold and shoulder passing (0.29 m), and a separate brass case-color check red; see review/GT-20085/t213-final.txt. No test was weakened.
Screenshots: review/GT-20085/side-paired.jpg, rear-paired.jpg, player-paired.jpg; four-light source images under review/GT-20085/before and after. The lowered folded bundle retains the shoulder/weapon silhouette at gameplay scale.
Not verified: Claude 2's index.html mount re-seat and later integration suite are still in progress. The case-color red differs between fake and real renderer and belongs to Claude 2's combat/test lane.
Requests: Claude 2 received the 0.31 m fake-runner shoulder datum; Claude Director received the fold-clear result and remaining owner.
Contract changes: none.
