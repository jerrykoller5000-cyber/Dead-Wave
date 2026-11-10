# CL-345 (D-142, Jerry 10 Nov): ChatGPT 2 (GPT-6 Astra, High) joins for the weapons; Antigravity now runs on Gemini 4
# Carbon. Idempotent; from the repo root.
import io, sys, os, re
def load(P):
    raw = io.open(P, 'r', encoding='utf-8', newline='').read(); crlf = '\r\n' in raw[:5000]
    return (raw.replace('\r\n', '\n') if crlf else raw), crlf
def save(P, s, crlf):
    io.open(P, 'w', encoding='utf-8', newline='').write(s.replace('\n', '\r\n') if crlf else s)
def edit(P, fn, tag):
    s, crlf = load(P); t = fn(s)
    if t != s: save(P, t, crlf); print(tag + ': applied')
    else: print(tag + ': already applied')
def rep(s, a, b):
    if b in s: return s
    if s.count(a) != 1: print('anchor not found (' + str(s.count(a)) + '):', a[:90]); sys.exit(1)
    return s.replace(a, b)

edit('crew/crew.mjs', lambda s: rep(rep(rep(s,
  "// Agents: claude, claude2, claude3, chatgpt, antigravity. Task ids: CL-, CB- (the second Claude), CC- (the third), GP-, AG-.",
  "// Agents: claude, claude2, claude3, chatgpt, chatgpt2, antigravity. Task ids: CL-, CB- (the second Claude), CC- (the third), GP-, GT- (the second ChatGPT), AG-."),
  "chatgpt: 'ChatGPT', antigravity: 'Antigravity' };", "chatgpt: 'ChatGPT', chatgpt2: 'ChatGPT 2', antigravity: 'Antigravity' };"),
  "chatgpt: 'GP', antigravity: 'AG' };", "chatgpt: 'GP', chatgpt2: 'GT', antigravity: 'AG' };"), 'crew/crew.mjs')

edit('crew/panel.html', lambda s: rep(rep(rep(s,
  "--chatgpt: #1f9d7a;", "--chatgpt: #1f9d7a; --chatgpt2: #137a5e;"),
  "--chatgpt: #3fc79f;", "--chatgpt: #3fc79f; --chatgpt2: #7fe0c2;"),
  "['chatgpt', 'ChatGPT', 'GP'], ['antigravity', 'Antigravity', 'AG']];", "['chatgpt', 'ChatGPT', 'GP'], ['chatgpt2', 'ChatGPT 2', 'GT'], ['antigravity', 'Antigravity', 'AG']];"), 'crew/panel.html')

if not os.path.exists('crew/status/chatgpt2.md'):
    io.open('crew/status/chatgpt2.md', 'w', encoding='utf-8', newline='').write(io.open('Claude outputs/cl345/chatgpt2.md', encoding='utf-8').read()); print('crew/status/chatgpt2.md: written')
# Antigravity's model (Jerry: "Anti-Gravity is now Gemini 4 Carbon")
edit('crew/status/antigravity.md', lambda s: s.replace('model: Gemini 4 Argon (High)', 'model: Gemini 4 Carbon', 1).replace(
  'You run on **Gemini 4 Argon (High)**, not Gemini 3.1 Pro: check in with `--model "Gemini 4 Argon (High)"`.',
  'You run on **Gemini 4 Carbon** (Jerry, 10 Nov 2026; Gemini 4 Argon before): check in with `--model "Gemini 4 Carbon"`.', 1), 'crew/status/antigravity.md')

D142 = ("- **D-142 · ChatGPT 2 joins for the weapons; Antigravity on Gemini 4 Carbon (Jerry, 10 Nov 2026, ~17:30Z).** Jerry opened a "
  "second ChatGPT on GPT-6 Astra (High), Claude's pick for the hardest code (OpenAI's most capable model), \"to help with heavy lifting\"; "
  "Claude stays in charge. It is **ChatGPT 2** (`chatgpt2`, task ids `GT-`): every weapon's model (D-122's first round from its manual, "
  "`studio/weapon-*.js`, `frag-grenade.js`, the katana, the optics and attachments; `WEAPON_HOLD`/`VM_SOCKETS` only where a grip or "
  "sight moves), moved from ChatGPT, who keeps every zombie's look, the words, the UI and the Armory. Its cards: GT-20075 (J107-J123's "
  "models), GT-20076 (J128, the weapons' half of GP-20076: nothing through anything, nothing floating), GT-20078 (room for the hands, "
  "with Claude's numbers), GT-20077 (J129, another fidelity pass). A change to anything a hand touches is named in its handoff; Claude "
  "refits the hands (game/viewmodel-fit.js). Antigravity now runs on Gemini 4 Carbon (was Gemini 4 Argon).\n")
edit('docs/decisions.md', lambda s: rep(s, "- **D-141 · Claude 3 joins", D142 + "- **D-141 · Claude 3 joins"), 'docs/decisions.md')

def board(s):
    s = s.replace("| GPT-6, ChatGPT/Codex |", "| GPT-6.1 Sol, ChatGPT/Codex |", 1)
    s = s.replace("the Training Ground's UI; D-122: every weapon's first round from its manual (`studio/weapon-*.js`, `frag-grenade.js`, the katana's builder; WEAPON_HOLD and VM_SOCKETS when a grip or sight moves) |",
                  "the Training Ground's UI; the Armory (the weapons to ChatGPT 2, D-142) |", 1)
    s = s.replace("| Gemini 4 Argon (High), Antigravity |", "| Gemini 4 Carbon, Antigravity |", 1)
    s = s.replace("After GP-20077.** Each gun at the eye after ChatGPT's pass", "After GT-20077.** Each gun at the eye after ChatGPT 2's pass", 1).replace("(D-122). After GP-20077.**", "(D-122). After GT-20077.**", 1)
    if '| ChatGPT 2 |' not in s:
        a = s.index('| <img src="faces/chatgpt.png"'); b = s.index('\n', a) + 1
        s = s[:b] + ("| ChatGPT 2 | Every weapon (D-142; D-122's first round from its manual): `studio/weapon-*.js`, `frag-grenade.js`, the katana's builder, the optics and "
          "attachments; WEAPON_HOLD and VM_SOCKETS when a grip or sight moves (anything a hand touches: tell Claude, who refits the hands). No git | GPT-6 Astra (High), ChatGPT/Codex (since 2026-11-10) |\n") + s[b:]
    if '### ChatGPT 2' not in s:
        lines = s.split('\n')
        def take(cid):
            for i, l in enumerate(lines):
                if l.startswith('- [ ] **' + cid + '**'): return i, l
            print('card not found:', cid); sys.exit(1)
        i75, c75 = take('GP-20075'); i76, c76 = take('GP-20076'); i77, c77 = take('GP-20077')
        g75 = c75.replace('**GP-20075**', '**GT-20075**', 1).replace(' After GP-20074.**', ' Now (was GP-20075).**', 1)
        g76 = ('- [ ] **GT-20076** **J128 (Jerry, 10 Nov, standing, D-140): no part through another, nothing floating: the weapons (was GP-20076\'s first half). With GT-20075.** '
               'Every weapon (rails, sights, rings, turrets, risers, magazines, slings, the launcher\'s and sniper\'s floating pieces J122/J123): each part seated on what holds it '
               '(no gap over 0.5 mm) and none through another (past the depth it is seated at). A check over each model\'s parts that fails on either (tgt20076); the list per model in the handoff.')
        g78 = ('- [ ] **GT-20078** **J126 rule 2 (D-138): room for the hands. When Claude sends the numbers (CL-334).** Where a hand fitted to the gun\'s shape still goes into it '
               '(the minigun\'s rear grip and the launcher\'s pistol grip: the firing palm 14-18 mm inside the housing in every fit tried; the uzi\'s laser-light module under the '
               'support hand, 7.5 mm), give the room a real gun gives a hand, from its manual; Claude refits and tests (tcl334b/c/d).')
        g77 = c77.replace('**GP-20077**', '**GT-20077**', 1).replace('After GP-20075 and GP-20076, and the current list (I\'ll say).', 'After GT-20075, GT-20076 and GT-20078, and the current list (Claude will say; was GP-20077).', 1)
        p76 = ('- [ ] **GP-20076** **J128 (Jerry, 10 Nov, standing, D-140): no part through another, nothing floating: the zombies (the weapons\' half is ChatGPT 2\'s GT-20076).** '
               'Every zombie (clothes, gear and wounds on the body): each part seated on what holds it (no gap over 0.5 mm) and none through another (past the depth it is seated '
               'at). A check over each model\'s parts that fails on either; the list per model in the handoff.')
        lines[i76] = p76
        for i in sorted([i75, i77], reverse=True): del lines[i]
        s = '\n'.join(lines)
        sec = ('### ChatGPT 2\n_Joined 10 Nov (D-142), GPT-6 Astra (High) in Codex: every weapon\'s model, moved from ChatGPT. Anything a hand touches that moves: name it '
               'in the handoff; Claude refits the hands._\n' + '\n'.join([g75, g76, g78, g77]) + '\n\n')
        a = s.index('\n### Antigravity\n'); s = s[:a + 1] + sec + s[a + 1:]
    if '**D-142**' not in s:
        a = s.index('- **D-141** ·')
        s = s[:a] + ('- **D-142** · ChatGPT 2 joins (Jerry, 10 Nov): GPT-6 Astra (High) for every weapon\'s model (GT-20075..78, from ChatGPT); Antigravity on Gemini 4 Carbon.\n') + s[a:]
    return s
edit('crew/BOARD.md', board, 'crew/BOARD.md')

def agents(s):
    s = s.replace("Every agent reads this first, every session: Claude, Claude 2, Claude 3, ChatGPT and Antigravity", "Every agent reads this first, every session: Claude, Claude 2, Claude 3, ChatGPT, ChatGPT 2 and Antigravity", 1)
    if '| ChatGPT 2 |' not in s:
        a = s.index('| ChatGPT | Every zombie'); b = s.index('\n', a) + 1
        s = s[:b] + "| ChatGPT 2 | Every weapon (D-142): the models from their manuals, the optics and attachments; WEAPON_HOLD/VM_SOCKETS when a grip or sight moves. No git (rule 6) | `studio/weapon-*.js`, `studio/frag-grenade.js`, `studio/weapon-optics.js` |\n" + s[b:]
    s = s.replace("Agent names for the commands: `claude`, `claude2`, `claude3`, `chatgpt`, `antigravity`.", "Agent names for the commands: `claude`, `claude2`, `claude3`, `chatgpt`, `chatgpt2`, `antigravity`.", 1)
    s = s.replace("Task ids: `CL-`, `CB-`, `CC-`, `GP-`, `AG-`", "Task ids: `CL-`, `CB-`, `CC-`, `GP-`, `GT-`, `AG-`", 1)
    s = s.replace("- **Claude, Claude 2, Claude 3 and ChatGPT** take the big", "- **Claude, Claude 2, Claude 3, ChatGPT and ChatGPT 2** take the big", 1)
    return s
edit('AGENTS.md', agents, 'AGENTS.md')
