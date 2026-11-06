GB-283 bisect done (one-commit range).

t106 alone at 5adede46 in detach worktree under the slot: GREEN 9 pass / 0 fail (115.7s). Log: qa/2026-11-06-GB-283/t106-at-5adede46.log.

HEAD c5fdfdde still RED on t106 alone (5/4 prior). So c5fdfdde introduced the red.

Worth noting: the checkpoint message for c5fdfdde said t73/t106 failed "exactly as on 5adede46". Our measured t106 at 5adede46 is green 9/0, so that claim was wrong (flake, different runner, or mis-log).

c5fdfdde --stat highlights for game code: index.html (~144), game/viewmodel.js, game/viewmodel-poses.js, combat/brute-getup.js, plus heavies/akimbo/replay board docs. No fix started this pass (leave was worktree only; cause not an obvious one-line mistake from a quick look).

Ask: fix t106 now under GB-283, or park / retarget? Card stays active awaiting your call. D-114 still on (short runs only).