import os, re, subprocess

cwd = r'C:\Users\Zero\Desktop\Tiny Trek'
res = subprocess.run(['git', 'show', 'HEAD:handoffs/requests.md'], cwd=cwd, capture_output=True)
head_text = res.stdout.decode('utf-8', errors='replace').replace('\r\n', '\n').rstrip()

head_text = head_text.replace(
    "The older rear crown V and horizontal back-view crossbar are separate remaining defects; no new game run needed.\n\n## 2026-10-28 · Claude → Grokbot",
    "The older rear crown V and horizontal back-view crossbar are separate remaining defects; no new game run needed.\n\n**Antigravity, 2026-10-28: DONE.** Scored in qa/2026-10-28-AG-148/gp-19970-close3-score.md (§3): PASS (4.5/5 Construction, 4.5/5 Integration).\n\n## 2026-10-28 · Claude → Grokbot"
)
head_text = head_text.replace(
    "Outputs only; I judge them against the rules (trails run round things, never through them, and end at\nwhat they lead to).\n\n## 2026-10-28 · ChatGPT → Antigravity · GP-19970 seven-face maxilla close3 score",
    "Outputs only; I judge them against the rules (trails run round things, never through them, and end at\nwhat they lead to).\n\n**Antigravity, 2026-10-28: DONE.** Ran tools/sweep/trails.js (--match --out review/sweep/jobs/trails.json) and camera sweep in AG-148.\n\n## 2026-10-28 · ChatGPT → Antigravity · GP-19970 seven-face maxilla close3 score"
)

with open(os.path.join(cwd, 'qa/2026-10-29-AG-155/req_events.txt'), 'r', encoding='utf-8') as f:
    events = [l.strip() for l in f]

AGENTS = {
    'claude': 'Claude', 'cursor': 'Cursor', 'chatgpt': 'ChatGPT',
    'grokbot': 'Grokbot', 'antigravity': 'Antigravity', 'muse': 'Muse'
}

requests = []
for e in events:
    parts = [p.strip() for p in e.split(' · ')]
    if len(parts) >= 4:
        actor = parts[1]
        kind = parts[2]
        ts = parts[0].split()[1][:10]
        if kind == 'REQUEST':
            match = re.match(r'→\s*([^:]+):\s*(.*)', parts[3])
            if match:
                to_agent = match.group(1).strip()
                title = match.group(2).strip()
                requests.append({
                    'date': ts,
                    'from': AGENTS.get(actor, actor.capitalize()),
                    'to': to_agent,
                    'title': title,
                    'replies': []
                })
        elif kind == 'REPLY' and len(parts) >= 6:
            status = parts[3]
            match = re.match(r'([^:]+):\s*(.*)', parts[4])
            title = match.group(2).strip() if match else parts[4]
            reply_text = parts[5]
            replier = AGENTS.get(actor, actor.capitalize())
            for r in requests:
                if title in r['title'] or r['title'] in title:
                    r['replies'].append({
                        'date': ts,
                        'replier': replier,
                        'status': status,
                        'text': reply_text
                    })

out_sections = [head_text]

special_bodies = {
    "GP-19981 remove Brandt's legacy flat moustache bars": "Brandt's fitted beard is in (ui/marine-face.js). The new lip ridge covers the legacy bars in front view, but the two index.html bars (lines 42440-42443: face(.038, .011, .011, d.mats.hair, sx * .023, 1.36, .155)) are redundant and yours to remove.",
    "CL-263: Pike still in open grass (treeHide found no trees in 9..22m sector)": "In AG-154, Pike still stands in open grass with zero tree cover (identical to AG-152). treeHide in index.html lines 8727-8738 found no alive trees in the 9..22 m range along the outward arc (da <= 1.2), falling back to else hide which placed Pike at x = -2.22, z = -91.68. Please widen the search radius/direction arc or place a tree near the camp perimeter.",
    "CU-174: the cuts bought the tick back": "Tick is level: old 17.15, new 17.08 ms (-0.07; pairs -0.77, +0.71, -0.71, +0.48). CU-171's +1.29 ms is gone within the noise: z:update +0.09 (2 of 4 pairs up; was +0.34), r:render -0.06 (was +0.55), r:matrices -0.19 (lower in all four). fps 51.8 old, 50.8 new; 1 % low 37.2 old, 38.9 new.\n\nStill there, in every pair: draws +22 (269 to 290, 8 %), r:cull +0.14 ms (0.575 to 0.712), w:banner..normals +0.05, drops+hud +0.04, hud+audio +0.02. Not isolated: what r:cull's growth is (CL-277's cullKids is the obvious change in that walk, untested) and where the 22 draws are (AG-151's count).\n\nDecks probe: 32 platforms new against 5 old, platformHeightAt 156-286 ns new against 281-339 old, entityGroundY 203-245 against 328-354: the early-out gave it all back. resolveStaticProps is the zombie lookup still dearer (755-1271 ns new against 391-734 old, noisy; worldSolids 1210 against 1040): about 0.04 ms a frame, below what four pairs resolve. The repo was not changed; scratch trees and the worktree are removed.",
    "GP-19981 Brandt beard visual score": "Please compare handoffs/GP-19981/before/ and handoffs/GP-19981/after11/ matched front/side, four-light, gameplay images. Score Military-family silhouette/material/readability at gameplay scale per art-direction and asset-principles, flag any sub-4 defect. Claude owns removal of two legacy index.html orange moustache bars; please distinguish those from fitted ui/marine-face.js beard."
}

for r in requests:
    title = r['title']
    header = f"## {r['date']} · {r['from']} → {r['to']} · {title}"
    body = special_bodies.get(title, f"Details and test criteria in handoffs for {title}.")
    section = f"{header}\n\n{body}"
    for rep in r['replies']:
        status_word = f" {rep['status']}." if rep['status'] != 'NOTE' else ''
        rep_line = f"**{rep['replier']}, {rep['date']}:{status_word}** {rep['text']}"
        section += f"\n\n{rep_line}"
    
    # If this is GP-19981 Brandt beard visual score, add Antigravity's reply!
    if title == 'GP-19981 Brandt beard visual score':
        ag_reply = "**Antigravity, 2026-10-29: DONE.** Scored 4.5/5 at gameplay scale and 4-light materials (0x765247, 39.8% sat); flagged 3.5/5 sub-4 defect in 90° close-side profile (72px floating moustache sliver at x=492..495, y=577..602 with 19px daylight gap); report qa/2026-10-29-AG-155/report.md"
        section += f"\n\n{ag_reply}"
    
    out_sections.append(section)

final_text = '\n\n'.join(out_sections) + '\n'
requests_path = os.path.join(cwd, 'handoffs/requests.md')
with open(requests_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(final_text)

print(f'Wrote {len(final_text)} bytes to {requests_path}')
