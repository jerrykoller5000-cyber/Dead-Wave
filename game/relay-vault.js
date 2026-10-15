// game/relay-vault.js — CL-184: what the relay's supply vault sends up its lift, by the day it is opened (Claude's).
//
// Jerry (2026-10-12): "we are going to have the Locker turn into almost a small building. It will bring up your reward
// from a little elevator shaft. The rewards get greater and greater depending on what day you do them ... If you do it
// on the final day you get a crazy rare weapon ... a red katana."
// CL-185 (Jerry, 2026-10-12): "The amount of work for day one is still not adequate to the prize. My vote for day one
// is a weapon. Actually I think all days should be stuff that the player does not have. It acts a bit like a mystery
// box unlocking gear/weapons that you do not currently have. Its a gamble on what is going to show up from the
// underground storage facility. Except the final day."
//
// So each tier is a pool, and the vault draws from it only what he does not have yet: a gun (it comes up loaded, its
// reserve full), a second gun for a pair, a piece of kit, the machete, or a build's plans. If the tier's pool is all
// his already it reaches up a tier, then down; only if there is nothing left anywhere does it send cash. The final day
// is the red katana, whatever he has. The vault opens once a run, so the day is the gamble: early and small, or hold out
// for the heavy stores (and go without the radio's calls and the sites it shows meanwhile).
//
// Pure: index.html says what he can still be given (can(item)) and applies what comes back.
//
//   VAULT_FINAL_DAY, VAULT_TIERS     the roadmap (docs: the handoff CL-185 has it as a table)
//   vaultTierFor(day)                the tier for that day
//   vaultReward(day, can, rand)      { tier, label, items } — can({ kind, id }) true when he does not have it yet
//     items: { kind: 'weapon' | 'pair' | 'gear' | 'blade' | 'blueprint' | 'katana', id } or { kind: 'cash', amount }

export const VAULT_FINAL_DAY = 20;

const W = (id) => Object.freeze({ kind: 'weapon', id });
const G = (id) => Object.freeze({ kind: 'gear', id });
const B = (id) => Object.freeze({ kind: 'blueprint', id });
const P = (id) => Object.freeze({ kind: 'pair', id });
const MACHETE = Object.freeze({ kind: 'blade', id: 'machete' });

export const VAULT_TIERS = Object.freeze([
  Object.freeze({ id: 'footlocker', from: 1, label: 'Footlocker', draws: 1, cash: 120,
    pool: Object.freeze([W('uzi'), W('shotgun'), W('revolver')]) }),
  Object.freeze({ id: 'quartermaster', from: 4, label: 'Quartermaster', draws: 1, cash: 200,
    pool: Object.freeze([W('m4'), W('ak'), W('chainsaw'), MACHETE, G('vest'), G('helmet'), G('laser'), G('flashlight'), P('pistol'), B('light')]) }),
  Object.freeze({ id: 'armoury', from: 8, label: 'Armoury', draws: 1, cash: 320,
    pool: Object.freeze([W('aa12'), W('sniper'), W('flamer'), W('launcher'), G('nvg'), G('pads'), P('uzi'), P('revolver'), B('flame'), B('mine')]) }),
  Object.freeze({ id: 'heavy', from: 12, label: 'Heavy stores', draws: 1, cash: 480,
    pool: Object.freeze([W('minigun'), W('launcher'), W('sniper'), W('aa12'), B('heavy'), B('mortar'), B('m240')]) }),
  Object.freeze({ id: 'cache', from: 16, label: 'Black cache', draws: 2, cash: 700,
    pool: Object.freeze([W('minigun'), W('aa12'), W('launcher'), W('sniper'), W('flamer'), B('heavy'), B('mortar'), B('m240'), G('nvg')]) }),
  Object.freeze({ id: 'katana', from: VAULT_FINAL_DAY, label: 'The red katana', draws: 0, cash: 0, katana: true, pool: Object.freeze([]) })
]);

export function vaultTierFor(day) {
  const d = Math.max(1, Math.floor(Number(day) || 1));
  let tier = VAULT_TIERS[0];
  for (const t of VAULT_TIERS) if (d >= t.from) tier = t;
  return tier;
}

const same = (a, b) => a.kind === b.kind && a.id === b.id;

export function vaultReward(day, can = () => true, rand = Math.random) {
  const tier = vaultTierFor(day);
  if (tier.katana) return { tier: tier.id, label: tier.label, items: [{ kind: 'katana', id: 'katana' }] };
  const i0 = VAULT_TIERS.indexOf(tier);
  // This tier's pool first, then the ones above it (never the final day's), then the ones below.
  const order = [i0];
  for (let i = i0 + 1; i < VAULT_TIERS.length; i++) if (!VAULT_TIERS[i].katana) order.push(i);
  for (let i = i0 - 1; i >= 0; i--) order.push(i);
  const items = [];
  for (let n = 0; n < tier.draws; n++) {
    let pick = null;
    for (const i of order) {
      const open = VAULT_TIERS[i].pool.filter((it) => !items.some((x) => same(x, it)) && can(it));
      if (open.length) { pick = open[Math.min(open.length - 1, Math.floor(rand() * open.length))]; break; }
    }
    if (!pick) break;
    items.push({ kind: pick.kind, id: pick.id });
  }
  if (!items.length) items.push({ kind: 'cash', amount: tier.cash });
  return { tier: tier.id, label: tier.label, items };
}
