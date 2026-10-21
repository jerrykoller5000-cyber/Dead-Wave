// GP-19889: proximity to a wall control is not permission to reach through it.
import {segmentBox} from '../world/training.js';
export function trainingStationReach(player,station,solids=[]){
 if(!player||!station?.front||![player.x,player.y,player.z,station.x,station.y,station.z,station.front.x,station.front.z].every(Number.isFinite))return false;
 const dx=station.front.x-station.x,dz=station.front.z-station.z,n=Math.hypot(dx,dz);if(n<1e-6)return false;
 const nx=dx/n,nz=dz/n;
 if((player.x-station.x)*nx+(player.z-station.z)*nz<=.1||Math.abs(player.y-station.y)>1.6||Math.hypot(player.x-station.front.x,player.z-station.front.z)>=1.7)return false;
 // The architectural wall proxy extends .3m into the room. Stop just ahead of
 // it; the switch is intentionally flush with the visible face inside that proxy.
 const a={x:player.x,y:player.y+1.25,z:player.z},b={x:station.x+nx*.4,y:station.y+1.4,z:station.z+nz*.4};
 return !solids.some(s=>(s.wall||s.securityDoor)&&segmentBox(a,b,s)!==null);
}
