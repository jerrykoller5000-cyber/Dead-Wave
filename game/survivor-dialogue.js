// game/survivor-dialogue.js — AI-1 (Antigravity 3, Jerry direct):
// Canonical Fourth-Pool reactive dialogue (docs/story.md §5) + contextual roof/combat/rescue
// reactivity for Cpl. Dana Okafor, Sgt. Eli Brandt, and Spc. Evan Pike.
// Rules (docs/story.md §5):
//   - Dry military voice, short lines, never from the marine, never mocking the nine fallen.
//   - Every Threshold soldier is a man (he/him).
//   - Tag lines (heavy) and night lines (light) never play on the same morning.
//   - Falls back cleanly to canonical `story.survivor.<who>.roof` when no context override applies.

export const SURVIVOR_CANON_NAMES = Object.freeze({
  okafor: 'Cpl. Dana Okafor',
  brandt: 'Sgt. Eli Brandt',
  pike: 'Spc. Pike'
});

// Specific fallen-soldier tag lines (docs/story.md §5, Fourth Pool v3)
const TAG_LINES = Object.freeze({
  'iron:0': { // Sato
    okafor: "Sato pulled the fuse. If he hadn't, there'd be no relay to fix.",
    brandt: 'Sato was on the radio when it started. He never stopped talking. I never heard what he said.',
    pike: "He owed me twenty. Keep the tag. We're square."
  },
  'root:0': { // Hale
    okafor: 'The captain. Four marks on the back. He was counting too.',
    brandt: "Hale sent me up the tower. That's why I'm here and he isn't.",
    pike: 'Captain Hale. Never saw him sit down. Not once in four days.'
  },
  'wet:0': { // Clarke
    okafor: 'That ring goes over the mountains. Not to you.',
    brandt: "Clarke drove the wall in. Every panel. He'd want to know it held.",
    pike: "Not yours. The ring. Don't ask."
  },
  'iron:1': { // Price (Pike's bunkmate)
    okafor: "Price. Pike's bunkmate. Tell him yourself.",
    brandt: "Jonah fixed my gun the day before. It's the one I've got.",
    pike: "You found Jonah. Thank you. Don't tell Brandt I cried."
  },
  'wet:1': { // Kowalski
    okafor: 'Nineteen. He lied about that on the form. Everyone knew.',
    brandt: 'The kid. Mended his own chain with wire the first night. Said it was for luck.',
    pike: 'Kowalski. He thought the wall was for bears.'
  }
});

const GENERIC_TAG_LINES = Object.freeze({
  okafor: "Whose? ... Right. Put it on the wall. I'll do the rest.",
  brandt: 'I counted them going down. Thank you for counting them coming back.',
  pike: "That's one. Don't tell me the rest. I'll do them one at a time."
});

const ALL_NINE_LINES = Object.freeze({
  okafor: "Nine. All of them. Now bring yourself home too, and that's twelve.",
  brandt: 'Nine. You brought all nine back up. I owed them that. Now I owe you.',
  pike: "Nine. That's the whole platoon on one wall. Don't let it fall off."
});

const NIGHT6_LINES = Object.freeze({
  okafor: "Six nights. That's one more than we got. Don't get used to it.",
  brandt: 'Threshold never saw a sixth night. You did. I watched it.',
  pike: "Six. That's a record. I checked. There was nobody to check with, but I checked."
});

const SIEGE_LINES = Object.freeze({
  okafor: "Two nights. I'm not sleeping. Neither are you.",
  brandt: 'Heron can see us from up there. I hope she likes what she sees.',
  pike: "Two nights. If that plane's late I'm swimming."
});

// Named nights (morning after: prevDay = day - 1)
const NAMED_NIGHT_LINES = Object.freeze({
  brute: {
    okafor: 'Brute Force. They said that about the fourth night too.',
    brandt: 'Heavy ones took half a belt each. Keep the wall tight.',
    pike: 'Those big ones hit like a deuce-and-a-half. Good thing I check the bolts.'
  },
  demon: {
    okafor: 'Fire on the treeline. Keep water close if they come back.',
    brandt: "Demon Night. I heard the name come up on the radio once. Didn't know it was a thing yet.",
    pike: 'Something burning tried to climb the south sandbags. Smelled like bad wiring.'
  },
  guardian: {
    okafor: 'It bled white into the dirt and ran straight back toward the lake.',
    brandt: 'Put sixty rounds into that thing. Slowed it down. Only slowed it down.',
    pike: "Red Guardian. It's the same one. I keep telling people it's the same one."
  },
  fog: {
    okafor: 'Lake fog gets into bandages. Check your seals.',
    brandt: "Couldn't see past the wire. Fired on muzzle sound and prayer.",
    pike: 'Fog like that, even the generator sounds nervous.'
  },
  swarm: {
    okafor: 'Too many at once. Kept counting until the barrel got hot.',
    brandt: 'Burned two cans last night. Still owe them nine.',
    pike: 'They came over the ridge like ants. Wall held. Barely.'
  }
});

// Urgent crisp barks when spoken to DURING a wave (awake === true)
const ALERT_TALK_LINES = Object.freeze({
  okafor: "Keep moving — I've got your back from up here! Climb up if you're bleeding!",
  brandt: "Eyes on the wire! I've got the east line pinned!",
  pike: "Watch the walls! I'm picking off whatever chews on the fence!"
});

// Post-heal dry medic line (shown when Okafor just patched you up)
export const OKAFOR_HEAL_LINES = Object.freeze([
  "Hold still. Fresh dressing, clean tape. Don't waste it.",
  "Sit tight. You're leaking over my roof. There — back in the fight.",
  'Stitched and taped. Eleven people I lost here — not losing the thirteenth.'
]);

// Comrade camaraderie lines (rotated when >=2 survivors are on the roof and no milestone fires)
const CREW_LINES = Object.freeze({
  okafor: [
    "Brandt's back on the belt. Feels less like a tomb up here.",
    'All three of us still breathing. I would not have bet on that.',
    "Pike's ankle is still swollen. Don't tell him I noticed."
  ],
  brandt: [
    "Okafor patched my leg the first hour up. Still won't let me stand on it all day.",
    "Pike's keeping the walls together with wire and spite. Good kid.",
    'From the tower the stones under the lake blink. In order. Every night. I wrote it down somewhere.'
  ],
  pike: [
    "Okafor checked my ankle twice already. I told him it's fine. It's not fine.",
    "Brandt hasn't moved two feet from that 240 since dawn. Pretty sure he sleeps holding the spade grip.",
    'I kept the trucks running that hauled this wall in. Built to keep things out. Turns out it keeps us in.'
  ]
});

function namedNightKind(day) {
  const prev = (day | 0) - 1;
  if (prev === 6 || prev === 12 || prev === 18) return 'guardian';
  if (prev === 9) return 'brute';
  if (prev === 14) return 'fog';
  if (prev === 15) return 'demon';
  if (prev === 17) return 'swarm';
  return null;
}

/**
 * Pick the highest-priority contextual roof dialogue line for a survivor.
 * Returns `{ line, mood, key }` or `null` to fall back to `story.survivor.<who>.roof`.
 * Respects `docs/story.md §5`: tag lines (heavy) take priority over night lines (light) and
 * never double up on the same morning; seen milestones are tracked per run via `seenSet`.
 */
export function pickSurvivorRoofLine(who, ctx = {}) {
  if (!who || !SURVIVOR_CANON_NAMES[who]) return null;
  const day = ctx.day | 0;
  const seen = ctx.seen instanceof Set ? ctx.seen : null;
  const once = (key) => !seen || !seen.has(`${who}:${key}`);
  const mark = (key) => { if (seen) seen.add(`${who}:${key}`); };

  // 1. Active combat wave: crisp urgent tactical line
  if (ctx.awake) {
    return { line: ALERT_TALK_LINES[who], mood: 'combat', key: 'alert' };
  }

  // 2. All 9 dog tags recovered on the wall (heavy, top priority once)
  const totalTags = Array.isArray(ctx.allTags) ? ctx.allTags.length : (ctx.tagCount | 0);
  if (totalTags >= 9 && once('all9')) {
    mark('all9');
    return { line: ALL_NINE_LINES[who], mood: 'heavy', key: 'all9' };
  }

  // 3. A fallen teammate's dog tag came up yesterday / recently (heavy — suppresses light night lines!)
  const recentTags = Array.isArray(ctx.recentTags) ? ctx.recentTags : [];
  let hadGenericCandidate = false;
  for (const tagId of recentTags) {
    if (TAG_LINES[tagId] && TAG_LINES[tagId][who]) {
      if (once('tag:' + tagId)) {
        mark('tag:' + tagId);
        return { line: TAG_LINES[tagId][who], mood: 'heavy', key: 'tag:' + tagId };
      }
    } else if (tagId) {
      hadGenericCandidate = true;
    }
  }
  if (hadGenericCandidate && once('tag-any:' + day)) {
    mark('tag-any:' + day);
    return { line: GENERIC_TAG_LINES[who], mood: 'heavy', key: 'tag-any:' + day };
  }

  // 4. Night 18 Siege survived (morning of Day 19)
  if (day === 19 && once('siege18')) {
    mark('siege18');
    return { line: SIEGE_LINES[who], mood: 'milestone', key: 'siege18' };
  }

  // 5. Night 6 passed (morning of Day 7 — outlasted FOB Threshold!)
  if (day === 7 && once('night6')) {
    mark('night6');
    return { line: NIGHT6_LINES[who], mood: 'milestone', key: 'night6' };
  }

  // 6. Named night, the morning after (light)
  const nightKind = namedNightKind(day);
  if (nightKind && NAMED_NIGHT_LINES[nightKind]?.[who] && once(`night:${nightKind}:${day}`)) {
    mark(`night:${nightKind}:${day}`);
    return { line: NAMED_NIGHT_LINES[nightKind][who], mood: 'light', key: `night:${nightKind}:${day}` };
  }

  // 7. Player has low HP and Okafor hasn't healed yet or Brandt/Pike notice
  if (ctx.playerHpFrac != null && ctx.playerHpFrac < 0.45 && who !== 'okafor' && ctx.hasOkafor && once(`hurt:${day}`)) {
    mark(`hurt:${day}`);
    return {
      line: who === 'brandt'
        ? "You're bleeding. Go see Okafor on the north deck before the alarm hits."
        : 'You look rough. Okafor has clean gauze on the north side — go let him patch you up.',
      mood: 'care',
      key: `hurt:${day}`
    };
  }

  // 8. Multi-survivor camaraderie rotation after first canonical roof talk
  const talkCount = ctx.talkCount | 0;
  const crewWhos = Array.isArray(ctx.crewWhos) ? ctx.crewWhos : [];
  if (talkCount >= 1 && crewWhos.length >= 2) {
    const pool = [];
    if (who === 'okafor') {
      if (crewWhos.includes('brandt')) pool.push(CREW_LINES.okafor[0]);
      if (crewWhos.length >= 3) pool.push(CREW_LINES.okafor[1]);
      if (crewWhos.includes('pike')) pool.push(CREW_LINES.okafor[2]);
    } else if (who === 'brandt') {
      if (crewWhos.includes('okafor')) pool.push(CREW_LINES.brandt[0]);
      if (crewWhos.includes('pike')) pool.push(CREW_LINES.brandt[1]);
      pool.push(CREW_LINES.brandt[2]);
    } else if (who === 'pike') {
      if (crewWhos.includes('okafor')) pool.push(CREW_LINES.pike[0]);
      if (crewWhos.includes('brandt')) pool.push(CREW_LINES.pike[1]);
      pool.push(CREW_LINES.pike[2]);
    }
    if (pool.length) {
      const idx = (talkCount - 1) % pool.length;
      return { line: pool[idx], mood: 'crew', key: `crew:${idx}` };
    }
  }

  // Fallback: null tells caller to use canonical `story.survivor.<who>.roof`
  return null;
}

// Compass sector label from HQ center (consistent with ui/bounties.js: -X east, +Z north, wait:
// in world coords +X is right/east on minimap? Let's use clear relative bearings: North/South/East/West).
export function bearingLabel(dx, dz) {
  if (Math.abs(dx) > Math.abs(dz)) return dx >= 0 ? 'east' : 'west';
  return dz >= 0 ? 'north' : 'south';
}

// Tactical combat callouts (used with strict cooldown throttling so they feel sharp, never noisy)
export function combatCalloutFor(who, kind, dir) {
  const dirStr = dir || 'perimeter';
  if (kind === 'boss') {
    if (who === 'brandt') return `Heavy contact on the ${dirStr} — opening up with the 240!`;
    if (who === 'okafor') return `Big one pushing ${dirStr} — stay clear of its reach!`;
    return `Heavy incoming on the ${dirStr} — watch the walls!`;
  }
  if (kind === 'bomber') {
    if (who === 'pike') return `Bomber on the ${dirStr}! Taking it before it hits the wall!`;
    if (who === 'brandt') return `Bloater on the ${dirStr} — dropping it!`;
    return `Explosive dead ${dirStr} — back off!`;
  }
  if (kind === 'reload') {
    if (who === 'brandt') return 'Changing belt on the 240 — two seconds!';
    if (who === 'okafor') return 'Swapping mags!';
    return 'Reloading — hold the line!';
  }
  if (kind === 'meddrop') {
    return 'Tossed a field kit down in the yard — look for the green chem-light!';
  }
  if (kind === 'dawnRepair') {
    return `Patched up the worst wall wear before sunrise. Saved you some scrap.`;
  }
  return null;
}
