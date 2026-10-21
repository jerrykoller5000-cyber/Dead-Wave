# claude — CL-39 day-1 audit — 2026-09-25
Changed:          audit only, no code changed. 10 problems: 0 S1, 7 S2, 3 S3. The biggest: day 1's day/night clock and its wave don't line up, and there's a dead minute after the alarm.
Files:            handoffs/audit-day1/claude.md
Tests:            a timing probe of the day-1 wave in the headless harness (numbers below); `npm test` on a cloud copy: 32 checks, 482 pass, 40 fail. That run doesn't count: the box is slow and most soundtrack files weren't copied, so the music and timing checks fail for reasons that aren't in the game. Cursor's run on Jerry's PC (CU-27) is the record.
Screenshots:      none: a real render under SwiftShader timed out here. Antigravity has the GPU.
Not verified:     how any of it looks or sounds on Jerry's PC; how long a real day-1 fight lasts from the first shot to the last kill.
Requests:         none (the audit goes to Claude)
Contract changes: none

My area is the world, night lighting, the music and the audio director, plus a read of the
day-1 path in `index.html` against the flow test in `docs/plan.md`.

## Top 5

1. **CL-A1**: night falls about 4 minutes into day 1 with no horde, and the horde can come at noon.
2. **CL-A2**: after the alarm, a full minute passes before the first zombie is close enough to shoot.
3. **CL-A5**: day 2 starts the moment the last zombie drops, underneath the day-1 finisher.
4. **CL-A6**: day 1 has no payoff at the end, just a 3-second banner.
5. **CL-A3**: day 1 only ever hears the first two minutes of its own 4:30 song.

## Problems

### CL-A1 · S2 · flow / world · The day/night clock and the wave run on separate clocks
- Where:    index.html: `updateDayNight` (the sun, from `DAY_CYCLE_SPEED` 0.0012, so a full day
            is about 833 s), `resetDayClockForMatch` (the match starts at 09:36), `hqStartWave` and
            `startPrep` (neither touches the clock).
- Steps:    fresh profile, Play, play day 1 the way a new player would: explore, do an objective,
            look at the kiosk.
- Expected: `docs/plan.md`: "Day: scavenge and skirmish … Night: the horde … Dawn: payoff."
- Seen:     night (`dayFactor` < 0.28) starts at about 16:55, which is 246 s (about 4 minutes)
            after the match starts, and it lasts about 8 minutes of real time. A player who
            takes longer than 4 minutes over day 1 spends it in the scary dark (fog from 18 m)
            with nothing to fight. A player who sounds the alarm early fights the horde in full
            sun. "DAY 1 CLEARED" can land at any hour, so the next "day" might start at midnight.
            The HUD also shows two different days: `timeLine` "Night · 22:10" next to `waveLine`
            "Wave Day 1 · Prep".
- Owner:    Claude (sky, light, clock) with Grokbot (the wave director). Jerry decides the rule.
- Fix idea: tie the sky to the loop. The clock only moves during prep and stops at dusk. The
            alarm brings night on over its 5 s. Clearing the wave runs the sky to dawn, and the
            next prep starts in the morning.
- Proof:    the constants and functions named above; the numbers are worked from them. The
            probe saw the clock at 09:50 with "Grace" at the start of prep.

### CL-A2 · S2 · flow / combat · A dead minute after the alarm
- Where:    index.html: `spawnWaveBatch` (spawns come out of the cave mouths); caves are placed
            150 to 195 m from the HQ (`POI.caves`, r = 150 + rnd·45); shamblers move at 3.19 m/s.
- Steps:    fresh profile, Play, sound the alarm at the HQ panel.
- Expected: the fight starts soon after the alarm (the plan: the fight music "hits right away").
- Seen:     the probe timed the day-1 wave from the first spawn: all 20 were out after about 8 s,
            the nearest one was 184 m away, the first came within 30 m after 55 s and within 10 m
            after 61 s. With the 5 s alarm on top, that's about a minute of fight music and a
            red banner with nothing to shoot, and the player can't see them coming.
- Owner:    Grokbot (spawns), Claude (music).
- Fix idea: on day 1, spawn from the nearest mouth, or from 70 to 90 m in the treeline, so contact
            comes 15 to 25 s after the alarm. Or show them coming: a compass pip and groans.
- Proof:    probe `tza` in my cloud copy of the harness (fake renderer, real game logic). It
            printed: "t=51s spawned 3/20 … nearest 184 m", "t=112s … nearest 8 m", "first zombie
            within 30 m after 105.3 s". The first 50 s were the opening grace hour, because the
            probe skipped the alarm; the real alarm ends the grace.

### CL-A3 · S2 · music · Day 1's song is built for 4:30, and day 1's fight is about 2 minutes
- Where:    `assets/soundtrack/fight_day01.mp3` (270.0 s), `tools/day1.py`; the form is in
            `handoffs/2026-09-25-claude-CL-35-36-day1-song-stingers.md`.
- Expected: the fight's best moment in the song lines up with the fight's best moment.
- Seen:     the intro is 20 s and the climax comes at bar 88, about 3:40. From CL-A2, contact
            comes at about 1:00. For 20 shamblers, a pistol, a knife and whatever the kiosk
            sells, the whole fight is probably done by 2:00 to 2:30, so the bridge, the build and
            the climax never play on day 1.
- Owner:    Claude.
- Fix idea: re-form the song so the first drop lands at contact (bar 24 at 96 bpm half-time is
            about 60 s) and the climax comes by 2:00, then loop the middle. Better still: move to
            the next section when the wave's own events happen (first contact, half dead, last five).
- Proof:    track length from ffprobe; the form from the CL-35 handoff. Not verified: a real
            day-1 fight's length (AG-15 can time it).

### CL-A4 · S3 · music · The day-1 song clicks where it loops
- Where:    `assets/soundtrack/fight_day01.mp3`; `core/audio.js` `startDeck` loops it with
            `<audio loop>`.
- Seen:     decoded with ffmpeg, the file ends with 12.4 ms of silence at RMS 0.002, then jumps
            back to a start at RMS 0.335. The sample step across the seam is 0.21 of full scale.
            That's a tick and a short dropout every 4:30. MP3 also pads each end, and Chrome's
            `<audio loop>` isn't sample-accurate, so the seam can gap on top of that. Day 2's
            `chip_skirmish_b` steps from RMS 0.167 at its end to 0.377 at its start.
- Owner:    Claude.
- Fix idea: render the loop seamlessly (no silent tail, the last bar leading into bar 0). Play
            the fight loops through Web Audio (`AudioBufferSourceNode.loop` with
            `loopStart`/`loopEnd`), which is sample-accurate.
- Proof:    ffmpeg decode, mono at 44.1 kHz: "trailing silence 12.4 ms, rms end 0.002 start
            0.335, seam jump 0.208". Not verified by ear.

### CL-A5 · S2 · flow · Day 2 starts underneath the day-1 finisher
- Where:    index.html: `updateZombies` calls `startPrep()` the moment `zombies.length === 0`.
            `startPrep` does `day += 1`, the "DAY 1 CLEARED" banner, `triggerSlowMo(0.7)`,
            `AudioSys.dayCleared()` and `writeDayStart()`.
- Seen:     all of that happens in the same frame the finisher starts (`beginWaveFinisher`: 7.2 s
            of slow motion, the camera circling the body, every sound but the sting muted).
            While the camera is still circling day 1's last zombie:
            - the HUD already reads "Wave Day 2 · Prep";
            - the banner lands on top of the finisher;
            - the day-2 morning save is written;
            - `dayCleared()`'s fanfare plays into the muted mix, so nobody hears it.
- Owner:    Claude (finisher) with Grokbot (the wave director).
- Fix idea: start the next prep when the finisher hands the camera back (`F.dur + FIN_RETURN_S`),
            and show the banner then.
- Proof:    code as named. Not verified on screen.

### CL-A6 · S2 · flow · Day 1 ends without a payoff
- Where:    the end of the wave: `startPrep` (a 3 s banner is all there is).
- Expected: `docs/plan.md` "Dawn: payoff. A short summary of the night, achievements unlocked,
            and tomorrow's briefing."
- Seen:     day 1 is where the loop gets taught (kill, skulls, bank, Cash, buy). The end of the
            first wave is the moment to show it: kills, skulls carried, "bank them at the HQ
            window", and what that Cash buys. Right now the next thing the player sees is day 2's
            prep label.
- Owner:    ChatGPT (the screen), Claude (the timing, with CL-A5).
- Fix idea: a short dawn card after the finisher (kills, skulls, best streak, one tip), and
            Continue opens tomorrow's briefing.
- Proof:    there's no summary between waves (the only one in the code is the end-of-run card).
            This is a phase-3 item on the plan; I'm flagging it because day 1 feels unfinished
            without it.

### CL-A7 · S2 · flow · Most of day 1 has nothing to fight
- Where:    the day-1 prep phase. `pickZombieType` and the day-fight music exist, but nothing
            spawns in the daytime on day 1 (the guarded POIs are phase 3).
- Seen:     from Play to the alarm, a new player can explore, repair the radio and loot caches,
            but can't earn a skull, because skulls only come from kills. The coach's first card
            appears after the first skull pickup, which comes after the first wave. With CL-A1
            on top, that part of day 1 can be long, dark and quiet.
- Owner:    Grokbot (a few roamers or one guarded POI on day 1), ChatGPT (the coach's first step).
- Fix idea: two or three shamblers at the nearest POI on day 1, so the first kill, the first skull
            and the first bank all happen before the first alarm.
- Proof:    code read. Not verified in play.

### CL-A8 · S3 · world · Caves at night on a real GPU are still unchecked
- Where:    the cave mouths in fog and at night (CL-17).
- Seen:     CL-17 fixed the black spots in fog by numbers in my copy; at night the fog starts at
            18 m and it was never looked at on Jerry's GPU. On day 1 the assault mouth pulses
            during prep (`warnActiveCaves(1)`), so it's the first cave a player walks up to.
- Owner:    Claude, and Antigravity for the shots.
- Fix idea: AG shots of the day-1 assault mouth at 22:00, with and without the NVGs.
- Proof:    not verified (the CL-17 handoff lists it as open).

### CL-A9 · S3 · music · The calm tracks and the chiptune fights may not sound like one game
- Where:    `MUSIC_POOLS` in `core/audio.js` and `music.json`: the menu, day, dusk and night pools
            are the original 2026-09-21 tracks. Day 1's fight and every sting are now chiptune
            (Jerry: "chiptune is the way").
- Seen:     day 1 goes menu (old style), prep (old style), alarm (chip), fight (chip), relief (chip),
            prep (old style). If the old calm tracks don't sit with the chip sound, the switch is
            jarring four times per day.
- Owner:    Claude. Jerry's ears decide.
- Fix idea: Jerry listens to one day-1 cycle. If it jars, the calm pools get chip versions made
            the same way as CL-34.
- Proof:    not verified: a question for Jerry, not a measurement.

### CL-A10 · S2 · crew · Claude's review backlog and stale requests hide real problems
- Where:    the crew panel: 12 handoffs wait for my review (GB-28, GB-29, GB-31 to GB-36, GP-21,
            GP-24, GP-25, GP-29), and 73 of 180 requests read as open, most of them already settled.
- Seen:     a problem that sits in an unreviewed handoff or an old request never reaches the plan.
            Several of those handoffs change test expectations (economy caps, the guardian, the
            knife).
- Owner:    Claude.
- Fix idea: I review all 12 in CL-40 and close the old requests with DONE/WONT/LATER, so the panel
            only shows live ones.
- Proof:    the panel's "waiting for Claude's review" list and its request count.

## Also noticed (for the owners; others will likely report these in more depth)

- Knife: `t63` "one swing hits at most 2 (hit=0)". It failed on Jerry's PC at 23:28Z (`t63m`)
  and in my cloud copy. Grokbot.
- Copy that isn't in `ui/strings.js`: "DAY n CLEARED", "DAY n — HORDE INBOUND", "From …",
  "ALARM", "they heard that", "Wave Day", "Zombies left", "Grace". The strings `menu.studio` and
  `legacy.menu.tagline` are no longer used anywhere. ChatGPT.
- The code still calls it `bloodMoon`, while the player sees Ember Night. Fine inside the code,
  but new keys should say ember. ChatGPT / Grokbot.
