# shiftpart.py <export> <out> <part idx> <dx dy dz gun mm>: a cloud-only what-if: one part moved in the gun's frame
import json,base64,numpy as np,sys
D=json.load(open(sys.argv[1])); i=int(sys.argv[3]); d=np.array([float(v) for v in sys.argv[4:7]])/1000
G=np.array(D['info']['gunMw']).reshape(4,4).T; dw=G[:3,:3]@d
p=D['parts'][i]; T=np.frombuffer(base64.b64decode(p['b64']),dtype=np.float32).reshape(-1,3)+dw
p['b64']=base64.b64encode(T.astype(np.float32).tobytes()).decode(); json.dump(D,open(sys.argv[2],'w')); print('moved',p['name'],dw)
