const fs=require('fs'),crypto=require('crypto'),p='game/screamer-appearance.js';const src=fs.readFileSync(p,'utf8'),hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const start=src.indexOf(' const rim='),end=src.indexOf(' const geo=new T.PlaneGeometry',start);
if(start<0||end<0)throw Error('Shield block moved');
const block=` // A loose sonic membrane: patchy arcs instead of a continuous tinted shell.
 const P=N.positionGeometry,F=N.varying(P);
 const wobble=N.sin(P.y.mul(5).add(P.x.mul(3)).sub(clock.mul(1.6)))
  .mul(N.cos(P.z.mul(4).add(P.x.mul(2)).add(clock.mul(.9)))).mul(.14)
  .add(N.sin(P.z.mul(7).sub(P.x.mul(5)).add(clock.mul(1.2))).mul(.05));
 mat.positionNode=P.mul(N.vec3(wobble.add(1),wobble.mul(.32).add(1),wobble.mul(.85).add(1)))
  .add(N.vec3(N.sin(P.y.mul(4).add(clock)).mul(.035),0,N.sin(P.y.mul(5).sub(clock.mul(.8))).mul(.04)));
 const rim=N.float(1).sub(N.abs(N.dot(N.normalWorld,N.normalize(N.cameraPosition.sub(N.positionWorld))))).pow(3.2);
 const patches=N.sin(F.x.mul(5).add(F.y.mul(3)).add(clock.mul(.8)))
  .mul(N.cos(F.z.mul(6).sub(F.y.mul(5)).sub(clock.mul(.5))));
 const coverage=N.smoothstep(-.3,.45,patches);
 const wave=N.sin(F.y.mul(22).add(F.x.mul(5)).add(N.sin(F.z.mul(5).sub(clock)).mul(2)).sub(clock.mul(5))).abs().pow(18);
 const pulse=N.sin(clock.mul(Math.PI)).mul(.5).add(.5); // two-second breathing cycle
 mat.opacityNode=rim.mul(.10).add(wave.mul(.034)).add(hit.mul(.035)).min(.14)
  .mul(coverage).mul(strength).mul(pulse.mul(.45).add(.55));
 const hull=new T.SphereGeometry(1,32,20);hull.computeBoundingSphere();hull.boundingSphere.radius=1.3; // includes shader displacement
 const shield=new T.Mesh(hull,mat);shield.name='screamer-sonic-shield';shield.position.y=1.10*s;shield.scale.set(.72*s,1.13*s,.69*s);shield.castShadow=false;g.add(shield);
`;
const out=src.slice(0,start)+block+src.slice(end);if(hash(fs.readFileSync(p,'utf8'))!==hash(src))throw Error('Source changed');fs.writeFileSync(p,out);fs.writeFileSync('review/screamer-field-GP19875/edit-proof.json',JSON.stringify({beforeHash:hash(src),afterHash:hash(out),vaporUnchanged:src.slice(end)===out.slice(out.indexOf(' const geo=new T.PlaneGeometry')),peakOpacity:.14},null,2)+'\n');console.log('Shield only: transparent broken arcs and moving irregular hull');