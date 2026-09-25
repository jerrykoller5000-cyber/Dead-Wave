// Shared match start for the behaviour checks. run-all.mjs evaluates this into the page
// before the check, so a test can call startMatch(T, 'Name') without pasting the recipe.
//
// Play does nothing without a callsign. Prep is not the same as control: the insertion
// still owns the marine for about nine seconds of game time after the phase flips, longer
// on a slow machine. The insertion camera takes `deploying` off the body when it hands
// control back, so that is what this waits for.
async function startMatch(T, name) {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const nameEl = document.getElementById('playerName');
  if (nameEl) nameEl.value = name || 'TestMarine';
  const play = document.getElementById('modeHunt');
  if (play) play.click();
  let prep = false;
  for (let i = 0; i < 80; i++) {
    await wait(200);
    if (T.getPhase && T.getPhase() === 'prep') { prep = true; break; }
  }
  if (!prep) throw new Error('startMatch: the match never reached prep');
  await wait(300);
  let landed = false;
  for (let i = 0; i < 600; i++) {
    if (!document.body.classList.contains('deploying')) { landed = true; break; }
    await wait(100);
  }
  if (!landed) throw new Error('startMatch: the insertion still had the camera after 60 s');
  await wait(300);
}
globalThis.startMatch = startMatch;
