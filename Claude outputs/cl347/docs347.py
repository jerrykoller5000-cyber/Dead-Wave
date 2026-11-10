# CL-347 (D-143, Jerry 10 Nov): more than one game test at a time on the PC, while it has the room. AGENTS.md rule 16,
# the board's slot section and decisions, docs/decisions.md. Idempotent; from the repo root.
import io, sys
def load(P):
    raw = io.open(P, 'r', encoding='utf-8', newline='').read(); crlf = '\r\n' in raw[:5000]
    return (raw.replace('\r\n', '\n') if crlf else raw), crlf
def edit(P, fn, tag):
    s, crlf = load(P); t = fn(s)
    if t != s: io.open(P, 'w', encoding='utf-8', newline='').write(t.replace('\n', '\r\n') if crlf else t); print(tag + ': applied')
    else: print(tag + ': already applied')

QUOTE = ("\"If the bottleneck is available test slots I give you guys the authority to open as many as you think is feasible "
         "without cooking the machine. We ran into an issue where we were crashing often last time but if you have a good solution for it. "
         "Feel free to implement.\"")
RULE16 = """16. **Game tests on Jerry's PC go through the slots** (Jerry, 2026-10-15: one at a time; 2026-11-10, D-143: "open as many
    as you think is feasible without cooking the machine"; the queue is `tools/game-test-slot.mjs`, CL-347). Anything that
    starts the game is a game test: the Marine Inspector, the camera and screenshots, browser-based `npm test` runs, and
    hidden or headless instances. They all go through the machine-wide queue: first come first served, Jerry first, and it
    wakes the next in line itself.
    - **Several at once, only with the room.** The PC runs up to its slots at once (auto from its memory, cores and
      graphics card, never over 3; `tools/game-test-slot.config.json`). The first lease starts as always; a further one
      only when the last start was 30 s ago and the computer has the room right then: free memory for one more game
      plus 4 GB, the cores under 75% busy, the card's memory free and the card under 80 °C. A lease whose processes die
      without releasing (a crash, a killed session) puts the PC back to one at a time for 20 minutes. Claude's cloud and
      any computer without a readable graphics card stay at one.
    - **Jerry runs alone.** His Play and Inspector launchers queue as him: he goes first, nothing new starts while he
      waits, and his game starts when the running checks end. Never close his windows or another agent's processes.
    - `--exclusive` for anything that measures speed (frame times, load times, the speed checks, timing benches): it
      waits for the others to end and runs alone. Looks and checks don't need it.
    - `node crew/crew.mjs slot status` shows every holder, who waits and why (`NEXT ... waits: ...`).
    - `node crew/crew.mjs slot run <you> <task> --checks "<batch>" [--exclusive] -- <command>` queues your prepared
      batch, waits for its turn, runs it and releases when its browser has closed. `slot request` (with `--minutes`)
      queues without running; `slot cancel <you> <id>` leaves the queue. The camera, shoot, `npm test` and the
      launchers queue themselves.
    - Never start a game any other way, and never work around the queue's refusal.
    - One game instance and one test worker per lease (`--jobs 1`); one lease per agent; no overlapping helpers or extra
      tabs. Keep batches short: every one of them is what Jerry waits for when he presses Play.
    - The slot is the only gate: don't wait on a guess that Jerry is playing (ask Claude if you think he is).
    - The slot is only for running the game, never for coding: make your changes and prepare your checks, queue them, keep
      working while you wait. If your session ends before your turn, say so plainly on your card and in the log:
      "Changes ready; waiting for testing slot". Never stop silently or call the task done before its checks have run.
    - The full suite is one coordinated integration job, not a check after each edit. **D-135:** Claude runs full suites
      and broad batches in his cloud workspace; the PC's slots are for Antigravity's looks on Jerry's GPU, for Jerry, and
      for each owner's targeted tests of the item in hand.
    - Claude's cloud workspace is a separate computer (the queue keeps a separate state there); Claude keeps it to one
      instance at a time and logs those runs. Every test on Jerry's PC, Claude's included, goes through the queue.
    - Record the rule in your handoff notes.
"""
def agents(s):
    if '**Game tests on Jerry\'s PC go through the slots**' in s: return s
    a = s.index('16. **One game test at a time on Jerry\'s PC**'); b = s.index('    - Record the rule in your handoff notes.\n', a)
    b += len('    - Record the rule in your handoff notes.\n')
    s = s[:a] + RULE16 + s[b:]
    return s.replace("   **Game checks** go through the queue (rule 16):", "   **Game checks** go through the queue (rule 16; several at once when the PC has the room, D-143):", 1)
edit('AGENTS.md', agents, 'AGENTS.md')

SLOT = """## Game-test slot

Game tests on a computer go through its queue (Jerry, 2026-10-15). Since D-143 (Jerry, 10 Nov: "open as many as you
think is feasible without cooking the machine"), several at once where the computer has the room: the PC up to its
slots (auto, never over 3), each start 30 s after the last and only with free memory, quiet cores and a cool, unfilled
graphics card; a crash puts it back to one at a time for 20 minutes. Anything that starts the game goes through it:
`node crew/crew.mjs slot run <you> <task> --checks "<what you check>" -- <command>` (`--exclusive` for speed
measurements: they run alone). It waits for its turn, runs one instance with `--jobs 1`, closes it and releases.
Jerry's own game or inspector always comes first, and alone: nothing new starts while he waits. While you wait, keep
coding. If your session ends before your turn: `node crew/crew.mjs wait <you> "<what is ready>"` (it says "Changes
ready; waiting for testing slot" on your card and on Jerry's panel). The full suite is one coordinated job (Claude 2's,
in its cloud). Claude's cloud is a separate computer; it keeps to one instance there. `AGENTS.md` rule 16 has it all.
"""
def board(s):
    if 'Since D-143' not in s:
        a = s.index('## Game-test slot\n'); b = s.index('\n## Waiting on', a)
        s = s[:a] + SLOT + s[b:]
    if '**D-143**' not in s:
        a = s.index('- **D-142** ·')
        s = s[:a] + "- **D-143** · More than one game test at a time on the PC (Jerry, 10 Nov), while it has the room: up to 3, staggered, measured at each start; Jerry and speed checks alone; a crash drops it to one (CL-347).\n" + s[a:]
    return s
edit('crew/BOARD.md', board, 'crew/BOARD.md')

D143 = ("- **D-143 · More than one game test at a time on the PC, while it has the room (Jerry, 10 Nov 2026, ~18:05Z).** " + QUOTE + " "
  "Claude's answer (CL-347, `tools/game-test-slot.mjs`): the crashes in October came when the agents' game tests overlapped with nothing to stop "
  "them (Jerry's PC-load rule, 15 Oct). The queue now grants up to the PC's slots at once (auto from its memory, cores and graphics card, at most 3; "
  "`tools/game-test-slot.config.json` or DW_GAME_TEST_SLOTS to change it), each still one game and one worker. The first lease starts as before; "
  "a further one only 30 s after the last start (a game's load is its peak) and only with the room at that moment: memory for one more game "
  "(5 GB) plus 4 GB, the cores under 75% busy, the graphics card's memory free and the card under 80 °C, read with nvidia-smi. Jerry's own game "
  "and inspector run alone (nothing new starts while he waits); `--exclusive` runs a speed measurement alone. A lease whose processes die "
  "without releasing (a crash or a killed session) puts the PC back to one at a time for 20 minutes. A computer without a readable graphics card "
  "(Claude's cloud, the Linux sandboxes) stays at one. The panel and `crew.mjs me` show every holder and why the next one waits.\n")
def decisions(s):
    if '**D-143 ·' in s: return s
    a = s.index('- **D-142 ·')
    return s[:a] + D143 + s[a:]
edit('docs/decisions.md', decisions, 'docs/decisions.md')
