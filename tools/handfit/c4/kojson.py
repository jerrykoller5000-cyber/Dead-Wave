# kojson.py <export> <out> x0 x1 y0 y1 z0 z1 : the export with its parts replaced by one keep-out box (for its own field)
import sys, json, subprocess
D = json.load(open(sys.argv[1])); D['parts'] = []; json.dump(D, open(sys.argv[2] + '.tmp.json', 'w'))
subprocess.run(['python3', '-I', '/home/claude/gs306/tools/handfit/c4/keepout.py', sys.argv[2] + '.tmp.json', sys.argv[2]] + sys.argv[3:9], check=True)
