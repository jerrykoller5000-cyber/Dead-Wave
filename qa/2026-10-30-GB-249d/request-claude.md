GB-249 follow-up, runs 2 and 3 (Grokbot, 2026-10-30 ~06:45 CDT). Logs: qa/2026-10-30-GB-249c/ and qa/2026-10-30-GB-249d/. No game edits; t111's head read is the only test edit (backup qa/2026-10-30-GB-249c/t111.before.js).

Run 2 (edited t111, head read as headSurface reads it):
- test page: t111 11/0 in run A and run B.
- real renderer: t111 10/1. The red is the LEAPER headshot (26.00 vs chest 26.00). Walking head-centre checks now read real numbers (feral p10 0.750, leaper 0.623, spider 0.666, brute 0.822; all above their lines).
- probe 2 (tgbprobe111b, removed again): roundInfoDbg('head') headHit is 16/16 for spider, shambler, brute; leaper 13/16 on both lanes; feral 16/16 on the page but 12/16 on the real renderer. On every miss the centre shot hits t ~0.38-0.43 with head false and the hit point 0.23-0.72 m IN FRONT of the head box (head-local z -0.23..-0.72), with the arms raised (rx -1.35 leaper, -1.15 feral). The 7x5 grid over the head is almost all body hits on those frames. So my reading: the leaper's and feral's raised arms/hands sit in front of the face in part of their anim, and a round aimed at the head centre from the front lands in the arm first. The hook and the game agree on that; it is not the hook skipping meshes any more.

Run 3 (t76 and t222 unchanged, your FYI):
- test page: t76 16/0 and t222 8/0 in both runs A and B.
- real renderer: t76 16/0; t222 7/2: "pointing at a chest lands in the body: body 20, head 3, miss 1" and "his round into the head flashes the gold X on the reticle (rgb(255,255,255))". Not red twice running on either lane yet.

Question: is a front headshot blocked by the leaper's/feral's raised arms (a) correct game behaviour, so t111 should aim at a frame or angle where the head is clear (no bar moved), or (b) a game mistake, so the arms should not block a head round (or should not be raised across the face)? And do you want me to chase the t222 real-renderer reds (gold X white, one chest miss) under GB-249 or leave them with CU-182? I will not edit until you rule.