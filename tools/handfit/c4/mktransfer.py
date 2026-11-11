# mktransfer.py <out steps.json> <from> <key> <sd> '<FG json>' '<TG json>' <DY mm> '<pose json or null>'
import json, sys
out, frm, key, sd, fg, tg, dy, pose = sys.argv[1:9]
mode = sys.argv[9] if len(sys.argv) > 9 else 'rel'; rel = sys.argv[10] if len(sys.argv) > 10 else 'null'
s = open('/home/claude/gs306/tools/handfit/c4/transfer.js').read().replace('%EXPORT%', open('/home/claude/gs306/tools/handfit/c4/export-block.js').read())
for k, v in (('%FROM%', frm), ('%KEY%', key), ('%SD%', sd), ('%FG%', fg), ('%TG%', tg), ('%DY%', dy), ('%POSE%', pose), ('%MODE%', mode), ('%REL%', rel)): s = s.replace(k, v)
setup = json.load(open('/home/claude/gs306/tools/handfit/c4/g7-steps.json'))[0]
json.dump([setup, {"name": "t-" + key + "-" + sd, "js": s, "wait": 200}], open(out, 'w'))
