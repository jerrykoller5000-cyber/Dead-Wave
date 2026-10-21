// One rotary recording for the four mounts, plus paced shot/contact accents.
// Keeping the voice independent of each mount avoids four overlapping loops.
export function createTrainingFacilityAudio({clock,move,bump,shot,motor}) {
  let lastBump=-Infinity,lastShot=-Infinity,lastAccent=-Infinity,moving=false;
  const counts={up:0,down:0,bump:0,shot:0};
  const stop=()=>{if(moving){motor(false);moving=false;}};
  return {
    cue(kind) {
      const now=clock();
      if(kind==='fence-up'||kind==='fence-down') {const up=kind==='fence-up';move(up);counts[up?'up':'down']++;return true;}
      if(kind==='fence-bump') {if(now-lastBump>=.85){lastBump=now;bump();counts.bump++;}return true;}
      if(kind==='containment-shot') {
        // Refresh the recorded bed on every shot (also retries while decoding).
        motor(true);moving=true;
        if(now-lastAccent>=.055){shot();counts.shot++;lastAccent=now;}lastShot=now;return true;
      }
      return false;
    },
    tick(paused=false) {if(paused||clock()-lastShot>.2)stop();},
    reset() {stop();lastBump=lastShot=lastAccent=-Infinity;},
    state:()=>({...counts,moving})
  };
}
