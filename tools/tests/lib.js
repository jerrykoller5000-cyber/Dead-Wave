// Shared match start for the behaviour checks. run-all.mjs evaluates this into the page
// before the check, so a test can call startMatch(T, 'Name') without pasting the recipe.
//
// Play does nothing without a callsign. Prep is not the same as control: the insertion
// still owns the marine for about nine seconds after the phase flips, and anything that
// waits on the live loop has to sit that out.
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
  await wait(10000);
}
globalThis.startMatch = startMatch;
