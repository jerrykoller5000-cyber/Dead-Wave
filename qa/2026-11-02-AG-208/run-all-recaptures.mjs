// Orchestrator for all recaptures under AG-208
import { runRecaptureAG207 } from './recapture-ag207.mjs';
import { runRecaptureAG202R1 } from './recapture-ag202-r1.mjs';

async function main() {
  console.log('########################################################################');
  console.log('### AG-208: BATCHED RECAPTURES WITH STRICT PRE-SHOT ASSERTIONS       ###');
  console.log('########################################################################\n');

  const t0 = Date.now();
  console.log('Step 1: Recapturing AG-207 (Flamer J59, Revolver Hip, 40cm Model Audit)...');
  await runRecaptureAG207();

  console.log('\nStep 2: Recapturing AG-202 Round 1 (Woods Stills & 90-Frame Animated GIFs)...');
  await runRecaptureAG202R1();

  const totalMin = ((Date.now() - t0) / 60000).toFixed(2);
  console.log(`\n########################################################################`);
  console.log(`### ALL RECAPTURES COMPLETED SUCCESSFULLY IN ${totalMin} MINUTES ###`);
  console.log(`########################################################################`);
}

main().catch((err) => {
  console.error('\nFATAL ERROR during batched recaptures:', err);
  process.exit(1);
});
