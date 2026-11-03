import json, sys

out = open("qa/2026-11-02-AG-200/audit-dump-utf8.txt", "w", encoding="utf-8")
sys.stdout = out

ag200 = json.load(open("qa/2026-11-02-AG-200/probe-summary.json"))
print("=== AG-200 SUMMARY ===")
for k, v in ag200["poses"].items():
    print(f"\nPOSE: {k} | 1P={v['fpDbg']['first'] if v.get('fpDbg') else None} | vmActive={v['vmActive']} | feetCenter={v['feetCenter']} | nearFeet={v['nearFeetCount']} | drawn={v['drawnNearFeetCount']}")
    seen = {}
    for m in v["nearFeetMeshes"]:
        sig = (m["name"], m["type"], m["parentChain"], m["geometry"][:65], m["material"], m["instanced"], m["visibleChain"], m["layersMask"], m["vmEyeHide"], m["drawnInMainPass"])
        if sig not in seen:
            seen[sig] = {"count": 0, "minOrigin": m["distOrigin"], "minVert": m["distActualVerts"], "sample": m}
        seen[sig]["count"] += 1
        if m["distActualVerts"] is not None and (seen[sig]["minVert"] is None or m["distActualVerts"] < seen[sig]["minVert"]):
            seen[sig]["minVert"] = m["distActualVerts"]
    print(f"  --- DRAWN OR VISIBLE OR SPHERE MESHES WITHIN 0.8m ---")
    for sig, info in sorted(seen.items(), key=lambda x: (not x[0][9], not x[0][6], x[1]["minVert"] if x[1]["minVert"] is not None else 99)):
        name, mtype, pchain, geo, mat, inst, visC, lmask, eyeH, drawn = sig
        if drawn or visC or "Sphere" in geo or "Icosa" in geo or "marine-idle" in pchain:
            print(f"    drawn={str(drawn):5s} vis={str(visC):5s} L={lmask} eyeH={str(eyeH):5s} cnt={info['count']:2d} dVert={str(info['minVert']):6s} dOrig={str(info['minOrigin']):6s} | {name:20s} | {mtype:12s} | {mat:42s} | {geo:65s} | {pchain}")
    if v.get("instancedZeroCountDrawn"):
        print("  instancedZeroCountDrawn:", len(v["instancedZeroCountDrawn"]), v["instancedZeroCountDrawn"][:5])
    if v.get("sphereLikeVisible"):
        print("  sphereLikeVisible:", len(v["sphereLikeVisible"]), v["sphereLikeVisible"][:10])

ag201 = json.load(open("qa/2026-11-02-AG-201/camo-audit.json"))
print("\n=== AG-201 SUMMARY ===")
for section, data in ag201.items():
    print(f"\nSECTION: {section}")
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, list):
                print(f"  {k} ({len(v)} items):")
                for item in v:
                    if isinstance(item, dict) and "matName" in item:
                        print(f"    {item.get('label',''):18s} | name={item.get('name',''):18s} | type={item.get('type',''):11s} | vis={str(item.get('visible')):5s} L={item.get('layersMask')} eyeH={str(item.get('vmEyeHide')):5s} | wScale={item.get('worldScale',{}).get('x')} | mat={item.get('matName'):20s} ({item.get('matUuid','')[:8]}) | verts={str(item.get('vertCount')):5s} | rep/m U={item.get('medURepeatsPerM')} V={item.get('medVRepeatsPerM')} UV={item.get('medUVRepeatsPerM')} | tileUV={item.get('tileMetersUV')}m")
                    else:
                        print("   ", item)
            else:
                print(f"  {k}: {v}")
out.close()
