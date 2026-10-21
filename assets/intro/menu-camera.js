/* Camera-only director. Game simulation and world state remain owned by index.html. */
window.createMenuCamera = ({THREE, camera, height, POI, fade}) => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const shots = [POI.dock, POI.tower, POI.bridges[0], POI.graveyard, POI.mast, POI.cabins[0]].filter(Boolean);
  if (!shots.length) shots.push({x:0,z:0});
  let shot = 0, elapsed = 0, deployment = null;
  const target = new THREE.Vector3(), look = new THREE.Vector3();
  const initialPosition = new THREE.Vector3(), initialQuaternion = new THREE.Quaternion();
  const endPosition = new THREE.Vector3(), endQuaternion = new THREE.Quaternion();
  const matrix = new THREE.Matrix4();
  const smooth = x => x*x*(3-2*x);
  return {
    get deploying() { return !!deployment; },
    get focus() { return target; },
    menu(dt) {
      elapsed += dt;
      if (elapsed >= 10) { elapsed %= 10; shot = (shot+1)%shots.length; }
      const p=shots[shot], angle=shot*1.7+(reduced?0:(elapsed/10-.5)*.25);
      target.set(p.x,height(p.x,p.z)+(p===POI.tower?6:2),p.z);
      const radius=p===POI.tower?30:26;
      camera.position.set(p.x+Math.cos(angle)*radius,target.y+15,p.z+Math.sin(angle)*radius);
      camera.position.y=Math.max(camera.position.y,height(camera.position.x,camera.position.z)+7);
      camera.fov=48; camera.updateProjectionMatrix(); camera.lookAt(target);
      fade.style.opacity=String(Math.max(0,1-elapsed/1.3,(elapsed-8.7)/1.3));
    },
    begin(start, finish, destination, focus, flight = null) {
      if(deployment) return;
      endPosition.copy(destination); look.copy(focus);
      matrix.lookAt(endPosition,look,camera.up); endQuaternion.setFromRotationMatrix(matrix);
      deployment={time:0,started:false,start,finish,flight,fadeFrom:Number(fade.style.opacity)||0};
      document.body.classList.add('deploying'); document.getElementById('hud').inert=true;
    },
    advance(dt) {
      const d=deployment; if(!d)return;
      d.time+=dt;
      if(d.time<.65){fade.style.opacity=String(d.fadeFrom+(1-d.fadeFrom)*smooth(d.time/.65));return;}
      if(!d.started){
        d.started=true; d.start();
        initialPosition.copy(endPosition).add(new THREE.Vector3(15,10,12));
        initialPosition.y=Math.max(initialPosition.y,height(initialPosition.x,initialPosition.z)+5);
        matrix.lookAt(initialPosition,look,camera.up); initialQuaternion.setFromRotationMatrix(matrix);
      }
      const elapsed=d.time-.65, duration=d.flight?.duration || (reduced ? .4 : 3.2), t=Math.min(1,elapsed/duration), s=smooth(t);
      if(d.flight){
        d.flight.update(elapsed,dt);
        d.flight.camera(elapsed,camera,endPosition,look,reduced);
      } else {
        camera.position.lerpVectors(initialPosition,endPosition,s);
        camera.position.y=Math.max(camera.position.y,height(camera.position.x,camera.position.z)+1.1);
        camera.quaternion.slerpQuaternions(initialQuaternion,endQuaternion,s);
        camera.fov=48+12*s;camera.updateProjectionMatrix();
      }
      fade.style.opacity=String(Math.max(0,1-(d.time-.65)/.9));
      if(t===1){
        deployment=null;fade.style.opacity='0';document.body.classList.remove('deploying');
        document.getElementById('hud').inert=false;d.finish();
      window.dispatchEvent(new CustomEvent('dw-game', { detail: { type: 'controls-ready' } }));
      }
    }
  };
};
