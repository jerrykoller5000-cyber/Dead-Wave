# CL-346 (Jerry, 10 Nov): the board shows the second ChatGPT: the crew of six in Jerry's orders, ChatGPT 2's wait on
# Claude, and the panel's queue headings read whole names ("### ChatGPT 2", not "ChatGPT"). Idempotent; from the repo root.
import io, sys
def load(P):
    raw = io.open(P, 'r', encoding='utf-8', newline='').read(); crlf = '\r\n' in raw[:5000]
    return (raw.replace('\r\n', '\n') if crlf else raw), crlf
def edit(P, fn, tag):
    s, crlf = load(P); t = fn(s)
    if t != s: io.open(P, 'w', encoding='utf-8', newline='').write(t.replace('\n', '\r\n') if crlf else t); print(tag + ': applied')
    else: print(tag + ': already applied')
def rep(s, a, b):
    if b in s: return s
    if s.count(a) != 1: print('anchor not found (' + str(s.count(a)) + '):', a[:90]); sys.exit(1)
    return s.replace(a, b)
ORD = ("- **2026-11-10 · The crew is six: Claude 3 and ChatGPT 2 join; Antigravity on Gemini 4 Carbon (D-141, D-142).** (Jerry, in chat) "
  "\"Spinning up another Opus 5.5 running on high to help with heavy lifting... You are still the one in charge.\" \"We are also going to spin "
  "up another instance of ChatGPT.\" \"Anti-Gravity is now Gemini 4 Carbon.\" Claude leads; Claude 3 has the marine's body, fabric and head "
  "(CC-), ChatGPT 2 on GPT-6 Astra (High) every weapon's model (GT-), ChatGPT keeps the zombies, the words and the Armory.\n"
  "- **2026-11-10 · No clipping, no wrong bends, then another weapons pass (J126-J129; D-138, D-139, D-140).** \"No one part of the hand may "
  "clip through another part of the hand. No part of the hand may clip through any part of a weapon. No part of the players' arms or legs may "
  "clip through any game object.\" \"No portion of the player's body may bend or rotate in an anatomically inaccurate way unless upon player "
  "death or it makes sense visually.\" \"No fabric or material will clip through another.\" Then \"yet another Fidelity Pass on all weapons\" "
  "(GT-20077, CL-342). He holds further notes until the crew is done.\n")
def board(s):
    s = rep(s, "- **2026-11-10 · Muse and Cursor are retired;", ORD + "- **2026-11-10 · Muse and Cursor are retired;")
    s = s.replace("- **2026-11-10 · The crew is four (D-134) and works by D-135.**", "- **2026-11-10 · The crew was four (D-134; six since D-142) and works by D-135.**", 1)
    W = "- **ChatGPT 2** · GT-20078 · waiting: Claude (the numbers from CL-334: where a fitted hand still goes into the gun)\n"
    if W not in s:
        a = s.index("reads it; a line whose task ids are all finished drops off by itself.\n"); b = s.index('\n', a) + 1
        s = s[:b] + ('\n' if s[b:b+1] != '\n' else '') + W + s[b:] if False else s[:b] + '\n' + W + s[b:].lstrip('\n') if s[b:b+2] == '\n\n' or s[b:b+1] != '\n' else s[:b] + '\n' + W + s[b+1:]
    return s
edit('crew/BOARD.md', board, 'crew/BOARD.md')
edit('crew/panel.html', lambda s: rep(s, "const h = /^### (\\w+)/.exec(line); if (h) owner = BY_NAME[h[1].toLowerCase()] || owner;",
  "const h = /^### (.+?)\\s*$/.exec(line); if (h) owner = BY_NAME[h[1].toLowerCase()] || BY_NAME[h[1].split(/\\s/)[0].toLowerCase()] || owner;"), 'crew/panel.html')
