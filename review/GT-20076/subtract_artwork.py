"""Cut cosmetic mesh shells from the game's own triangles; positions and UVs stay in drawing space."""
from collections import defaultdict

import numpy as np
from scipy.spatial import cKDTree

EPS = 2e-10

def prune(poly):
    out=[]
    for p in poly:
        if not out or np.linalg.norm(p-out[-1])>EPS:
            out.append(p)
    if len(out)>1 and np.linalg.norm(out[0]-out[-1])<EPS:
        out.pop()
    return np.array(out)

def halves(poly,n,w):
    d=poly@n-w
    if d.min()>=-EPS or d.max()<=EPS: return [poly]
    a=[];b=[]
    for i,p in enumerate(poly):
        j=(i+1)%len(poly)
        if d[i]>=-EPS:a.append(p)
        if d[i]<=EPS:b.append(p)
        if d[i]*d[j]<0 and abs(d[i])>EPS and abs(d[j])>EPS:
            point=p+(poly[j]-p)*(d[i]/(d[i]-d[j]))
            a.append(point);b.append(point)
    return [q for q in (prune(a),prune(b)) if len(q)>=3]

def inside(p,tri):
    d=tri-p
    a,b,c=d[:,0],d[:,1],d[:,2]
    la,lb,lc=np.linalg.norm(d,axis=2).T
    triple=np.einsum('ij,ij->i',a,np.cross(b,c))
    denom=la*lb*lc+np.einsum('ij,ij->i',a,b)*lc+np.einsum('ij,ij->i',b,c)*la+np.einsum('ij,ij->i',c,a)*lb
    return abs(np.sum(2*np.arctan2(triple,denom)))>2*np.pi

def portions(source,bounds,required_inside):
    solids=[part[:,:,:3] for part in bounds]
    xyz=np.concatenate(solids);bbox0=xyz.min(axis=1);bbox1=xyz.max(axis=1)
    normals=np.cross(xyz[:,1]-xyz[:,0],xyz[:,2]-xyz[:,0])
    lengths=np.linalg.norm(normals,axis=1);normals/=np.maximum(lengths[:,None],1e-30)
    offsets=np.einsum('ij,ij->i',normals,xyz[:,0])
    out=[]
    for face in source:
        tri=face[:,:3]
        n=np.cross(tri[1]-tri[0],tri[2]-tri[0])
        length=np.linalg.norm(n)
        if length<1e-15:continue
        n/=length
        candidates=np.where(((bbox1>=tri.min(axis=0)-EPS)&(bbox0<=tri.max(axis=0)+EPS)).all(axis=1))[0]
        planes={}
        def plane(normal,offset):
            k=tuple(np.round(np.r_[normal,offset]*1e9).astype(np.int64))
            if k not in planes:planes[k]=(normal,offset)
        for idx in candidates:
            if lengths[idx]<1e-15:continue
            if abs(abs(n@normals[idx])-1)<1e-10 and abs(tri[0]@normals[idx]-offsets[idx])<EPS:
                for j in range(3):
                    a,b=xyz[idx,j],xyz[idx,(j+1)%3]
                    edge=np.cross(n,b-a)
                    edge/=max(np.linalg.norm(edge),1e-30)
                    plane(edge,edge@a)
            else:plane(normals[idx],offsets[idx])
        polygons=[tri]
        for normal,offset in planes.values():
            polygons=[piece for poly in polygons for piece in halves(poly,normal,offset)]
        kept=[]
        for poly in polygons:
            area=abs(np.cross(poly-poly[0],np.roll(poly,-1,axis=0)-poly[0]).sum(axis=0)@n)
            centre=poly.mean(axis=0)
            if area>1e-16 and all(inside(centre,solid)==want for solid,want in zip(solids,required_inside)):
                kept.append(poly)
        if len(kept)==len(polygons):kept=[tri]
        for poly in kept:out.append((face,poly,required_inside[0]))
    return out

def oriented_cutter(mesh):
    """Orient a closed game mesh for solid-angle tests without changing the game's drawing."""
    vertices = mesh[:, :, :3]
    _, ids = np.unique(np.round(vertices.reshape(-1, 3), 8), axis=0, return_inverse=True)
    edges = defaultdict(list)
    faces = []
    for i, corners in enumerate(ids.reshape(-1, 3)):
        a, b, c = vertices[i]
        if len(set(corners)) != 3 or np.linalg.norm(np.cross(b-a, c-a)) < 1e-15:
            continue
        faces.append(i)
        for start, end in zip(corners, np.roll(corners, -1)):
            edges[tuple(sorted((start,end)))].append((i, start < end))

    neighbors = defaultdict(list)
    for pair in edges.values():
        if len(pair) != 2:
            raise ValueError("The cutter needs a closed surface")
        (a, a_forward), (b, b_forward) = pair
        change = a_forward == b_forward
        neighbors[a].append((b, change))
        neighbors[b].append((a, change))

    flipped = {}
    result = []
    for first in faces:
        if first in flipped:
            continue
        flipped[first] = False
        queue = [first]
        component = []
        while queue:
            i = queue.pop()
            component.append(i)
            for j, invert in neighbors[i]:
                required = bool(flipped[i]) != bool(invert)
                if j in flipped:
                    if flipped[j] != required:
                        raise ValueError("Inconsistent orientation around cutter")
                else:
                    flipped[j] = required
                    queue.append(j)

        triangles = mesh[component].copy()
        for index, face in enumerate(component):
            if flipped[face]:
                triangles[index] = triangles[index, ::-1]
        coords = triangles[:, :, :3]
        volume = np.einsum('ij,ij->', coords[:,0], np.cross(coords[:,1],coords[:,2]))
        if volume < 0:
            triangles = triangles[:, ::-1].copy()
        for face in triangles:
            a, b, c = face[:, :3]
            if np.cross(b-a, c-a) @ face[:, 3:6].mean(axis=0) < 0:
                face[:, 3:6] *= -1
        result.extend(triangles)
    return np.array(result)


def stitch_boundary(triangles, groups, tolerance):
    """Match a subdivided cut edge to its neighbor, preserving UVs on either side."""
    mesh = list(triangles)
    groups = list(groups)
    for _ in range(300):
        positions, ids = np.unique(np.array(mesh)[:, :, :3].reshape(-1, 3), axis=0, return_inverse=True)
        edges = defaultdict(list)
        for index, face in enumerate(ids.reshape(-1, 3)):
            for corner in range(3):
                a, b = face[corner], face[(corner + 1) % 3]
                edges[tuple(sorted((a,b)))].append((index, corner))
        boundary = {key:value[0] for key,value in edges.items() if len(value)==1}
        neighbors = defaultdict(set)
        for a,b in boundary:
            neighbors[a].add(b)
            neighbors[b].add(a)
        candidates = []
        for (a,b),(index,corner) in boundary.items():
            edge = positions[b] - positions[a]
            length2 = edge @ edge
            for middle in (neighbors[a] | neighbors[b]) - {a,b}:
                if middle in ids.reshape(-1,3)[index]:
                    continue
                relative = positions[middle] - positions[a]
                t = (relative @ edge) / length2
                if not 0 < t < 1:
                    continue
                error = np.linalg.norm(relative - t*edge)
                if error <= tolerance:
                    joins = int(middle in neighbors[a]) + int(middle in neighbors[b])
                    candidates.append((-joins,error,index,corner,middle))
        if not candidates:
            break
        _,_,index,corner,middle = min(candidates)
        a,b,c = np.roll(mesh[index],-corner,axis=0)
        span = b[:3] - a[:3]
        t = ((positions[middle] - a[:3]) @ span) / (span @ span)
        cut = a + t*(b-a)
        cut[:3] = positions[middle]
        mesh[index] = np.array([a,cut,c])
        mesh.append(np.array([cut,b,c]))
        groups.append(groups[index])
    return np.array(mesh),groups


def simplify(triangles,groups):
    """Remove redundant planar subdivisions, preserving original UV and normal seams."""
    positions,vertex_ids=np.unique(triangles[:,:,:3].reshape(-1,3),axis=0,return_inverse=True)
    positions=positions.astype(float)
    faces=vertex_ids.reshape(-1,3).copy()
    incident=[set() for _ in positions]
    attributes={}
    for index,face in enumerate(faces):
        for vertex,value in zip(face,triangles[index]):
            incident[vertex].add(index)
            attributes[(groups[index],vertex)]=value
    def neighbors(vertex):
        return {v for i in incident[vertex] for v in faces[i] if v!=vertex}
    def collapse(start,end):
        fan=incident[start]
        seam={groups[i] for i in fan}
        if not seam.issubset({groups[i] for i in incident[end]}):return False
        shared=fan & incident[end]
        # Collapsing a manifold edge removes exactly its two adjacent triangles.
        if len(shared)!=2 or len(neighbors(start)&neighbors(end))!=2:return False
        for i in fan-shared:
            old=positions[faces[i]]
            new=old.copy()
            new[faces[i]==start]=positions[end]
            cross=np.cross(new[1]-new[0],new[2]-new[0])
            if cross@np.cross(old[1]-old[0],old[2]-old[0])<=0:return False
            if np.linalg.norm(cross)<max(np.linalg.norm(new[k]-new[(k+1)%3]) for k in range(3))*1e-8:return False
        for i in shared:
            for v in faces[i]:incident[v].discard(i)
            faces[i,:]=-1
        for i in list(fan):
            faces[i,faces[i]==start]=end
            incident[end].add(i)
        fan.clear()
        return True
    changed=True
    while changed:
        changed=False
        for start in range(len(positions)):
            if not incident[start]:continue
            candidates=sorted(neighbors(start),key=lambda v:np.linalg.norm(positions[start]-positions[v]))
            if any(collapse(start,end) for end in candidates):changed=True
    return np.array([[attributes[groups[i],v] for v in face] for i,face in enumerate(faces) if face[0]>=0])

def subtract(subject,cutters,reduce_faces=True,weld_tolerance=9e-9,line_tolerance=1e-9,flat_tolerance=2e-9,stitch_tolerance=0):
    kept=portions(subject,cutters,[False]*len(cutters))
    for i,cutter in enumerate(cutters):
        others=cutters[:i]+cutters[i+1:]
        kept+=portions(cutter,[subject]+others,[True]+[False]*len(others))
    weld={}
    def key(v):return tuple(np.round(v*1e9).astype(np.int64))
    for _,poly,_ in kept:
        for v in poly:weld.setdefault(key(v),v.copy())
    verts=np.array(list(weld.values()))
    # Snap vertices arising from the same float32 bevel intersections before triangulating.
    parent=list(range(len(verts)))
    def root(i):
        while parent[i]!=i:
            parent[i]=parent[parent[i]]
            i=parent[i]
        return i
    for i,j in cKDTree(verts).query_pairs(weld_tolerance):
        parent[root(j)]=root(i)
    for i,k in enumerate(weld):weld[k]=verts[root(i)]
    verts=np.array([verts[i] for i in range(len(verts)) if root(i)==i])
    output=[]
    groups=[]
    for face,poly,reverse in kept:
        poly=np.array([weld[key(p)] for p in poly])
        poly=prune(poly)
        if len(poly)<3:continue
        loop=[]
        for i,start in enumerate(poly):
            end=poly[(i+1)%len(poly)]
            edge=end-start;length2=edge@edge
            if length2<EPS**2:continue
            t=(verts-start)@edge/length2
            dist=np.linalg.norm((verts-start)-t[:,None]*edge,axis=1)
            mids=np.where((t>1e-8)&(t<1-1e-8)&(dist<line_tolerance))[0]
            loop.append(start)
            loop.extend(verts[j] for j in sorted(mids,key=lambda j:t[j]))
        loop=prune(loop)
        if len(loop)<3:continue
        e1=face[1,:3]-face[0,:3];e2=face[2,:3]-face[0,:3]
        axis=np.argmax(abs(np.cross(e1,e2)))
        den=np.cross(e1,e2)[axis]
        def sample(p):
            d=p-face[0,:3]
            u=np.cross(d,e2)[axis]/den
            v=np.cross(e1,d)[axis]/den
            props=face[0,3:]*(1-u-v)+face[1,3:]*u+face[2,3:]*v
            if reverse:props[:3]*=-1
            return np.r_[p,props]
        if reverse:loop=loop[::-1]
        if len(loop)==3:triangles=[loop]
        else:
            centre=loop.mean(axis=0)
            triangles=[[centre,p,loop[(i+1)%len(loop)]] for i,p in enumerate(loop)]
        for tri in triangles:
            span=max(np.linalg.norm(tri[i]-tri[(i+1)%3]) for i in range(3))
            if np.linalg.norm(np.cross(tri[1]-tri[0],tri[2]-tri[0]))>span*flat_tolerance:
                output.append([sample(p) for p in tri])
                groups.append((id(face),reverse))
    baked=np.array(output,dtype=np.float32)
    if stitch_tolerance:
        baked,groups=stitch_boundary(baked,groups,stitch_tolerance)
    return simplify(baked,groups) if reduce_faces else baked
