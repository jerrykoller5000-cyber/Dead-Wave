const D=T.trainingDbg;const r=D.spawn('brute',2);const t0=Date.now();while(D.alive()===0&&Date.now()-t0<60000)await new Promise(r=>setTimeout(r,200));return {r,a:D.alive(),ms:Date.now()-t0};
