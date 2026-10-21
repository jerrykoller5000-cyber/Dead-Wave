// Test-only presentation barrier: wait for a real visible result and finite fades.
export async function waitForPresentation(page, selectors) {
  await page.waitForFunction(list => list.every(selector => {
    const el = document.querySelector(selector);
    if (!el || el.hidden) return false;
    const css = getComputedStyle(el), box = el.getBoundingClientRect();
    return css.display !== 'none' && css.visibility !== 'hidden' && Number(css.opacity) > .95 &&
      box.width > 0 && box.height > 0 && !el.getAnimations().some(animation =>
        animation.playState === 'running' && Number.isFinite(animation.effect?.getComputedTiming().endTime));
  }), selectors, {timeout:15000});
}
