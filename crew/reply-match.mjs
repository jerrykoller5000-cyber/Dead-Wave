// Pure request selection for crew.mjs. The parser supplies normalized recipient IDs.
const addressedTo = (request, agent) => request.to.includes(agent) || request.to.includes('all');
const sameIdentity = (a, b) => a.date === b.date && a.title === b.title &&
  a.from === b.from && a.to.join('\0') === b.to.join('\0');

export function chooseReplyRequest(requests, agent, which, {all = false, since = ''} = {}) {
  const mine = requests.filter(r => addressedTo(r, agent));
  const open = mine.filter(r => r.status === 'OPEN');
  const recent = all ? open : open.filter(r => r.date >= since);
  let hit;
  if (/^\d+$/.test(which)) {
    hit = recent[Number(which) - 1];
    return {hit, error: hit ? null : `No open request numbered ${which} for ${agent}.`};
  }
  const phrase = which.toLowerCase();
  const found = [...open].reverse().filter(r => r.title.toLowerCase().includes(phrase));
  if (found.length > 1 && !found.every(r => r.title === found[0].title)) {
    return {hit:null, error:`"${which}" matches ${found.length} requests; use more words or the number`, matches:found};
  }
  hit = found[0] || [...mine].reverse().find(r => r.title.toLowerCase().includes(phrase));
  return {hit, error:hit ? null : `No request addressed to ${agent} whose title has "${which}".`};
}

export function refindReplyRequest(before, current, hit) {
  // Distinguish two otherwise identical requests by their order in the source snapshot.
  const ordinal = before.filter(r => sameIdentity(r, hit) && r.start <= hit.start).length - 1;
  return current.filter(r => sameIdentity(r, hit))[ordinal] || null;
}
