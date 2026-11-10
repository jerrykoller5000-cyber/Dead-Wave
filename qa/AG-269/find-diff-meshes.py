import json

with open(r'C:\Users\Zero\Desktop\Tiny Trek\qa\AG-269\telemetry.json', 'r') as f:
    d = json.load(f)

s_inactive = d['scenarios'][0]['marineMeshes']
s_active = d['scenarios'][2]['marineMeshes']

inactive_vis = {m['uuid']: m for m in s_inactive if m.get('visible') and not m.get('vmEyeHide')}
active_vis = {m['uuid']: m for m in s_active if m.get('visible') and not m.get('vmEyeHide')}

diff_uuids = set(inactive_vis.keys()) - set(active_vis.keys())
print('Meshes visible when VM is inactive but hidden when VM is active:', len(diff_uuids))
for u in diff_uuids:
    m = inactive_vis[u]
    name = m.get('name') or '(unnamed)'
    mat = m.get('matName') or '(unnamed mat)'
    map_id = m.get('mapUuid')
    verts = m.get('vertexCount')
    uv = m.get('uvBounds')
    scale = m.get('scale')
    print(f"Name: {name:20s} | Mat: {mat:15s} | Verts: {verts:4d} | Scale: {scale} | Map: {map_id} | UV: {uv}")
