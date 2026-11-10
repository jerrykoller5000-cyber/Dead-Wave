// query: gates=1&chaingates=1
// t332 — GP-20034: in the gated story line the machete is found in the depot
// shed, never sold by the kiosk or issued by the relay vault.
(async () => {
  const T = window.TT, out = [];
  const ok = (yes, label) => out.push((yes ? 'PASS ' : 'FAIL ') + label);
  try {
    await startMatch(T, 'Blade Find');
    T.setDay(4);
    T.addCash(1000);
    T.openShop(true);
    T.setShopTabDbg('upgrades');
    const names = () => [...document.querySelectorAll('#shopList .perk .name')].map((e) => e.textContent.trim());
    ok(!names().some((name) => /^Machete\b/i.test(name)), 'gated kiosk has no machete row');
    const cash = T.getBank();
    T.buyMachete();
    ok(T.getBank() === cash && !T.isMacheteOwned(), 'direct kiosk purchase cannot grant the gated machete');
    T.closeShop();
    T.setPhase && T.setPhase('prep');
    T.openMenuDbg('armory');
    const saw = document.querySelector('#armoryPanel [data-offer-gun="chainsaw"]');
    const sawBuy = saw && saw.querySelector('[data-buy-gun="chainsaw"]');
    ok(!!saw && !!sawBuy && !sawBuy.disabled, 'chainsaw remains for sale on the gun shelf');
    T.closeMenuDbg('armory');

    let vaultOfferedBlade = false, draws = 0;
    for (let i = 0; i < 60; i++) {
      const reward = T.relayDbg.rewardFor(4);
      if (!reward) break;
      draws++;
      if (reward.items.some((it) => it.kind === 'blade')) vaultOfferedBlade = true;
    }
    ok(draws === 60 && !vaultOfferedBlade, 'gated relay vault never offers the machete across 60 draws');
  } catch (e) { ok(false, 't332 threw: ' + String((e && e.stack) || e).slice(0, 400)); }
  return out.join('\n');
})()
