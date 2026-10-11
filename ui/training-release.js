// The containment gate follows active Training time, including pause and cancellation.
export function createTrainingRelease({ onChange = () => {} } = {}) {
  let active = false, elapsed = 0, amount = 0;
  const read = () => ({ active, amount, flashing: active, lit: active && elapsed % .6 < .3 });
  const emit = () => onChange(read());
  return {
    read,
    begin() { active = true; elapsed = 0; emit(); },
    reset() { active = false; elapsed = 0; amount = 0; emit(); },
    tick(dt, pending, entering = 0) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      elapsed += dt;
      if (pending) {
        active = true;
        const remaining = pending.remaining - dt;
        amount = remaining < 1e-8 ? 1 : Math.max(amount, Math.min(1, Math.max(0, (1.2 - remaining) / 1.2)));
      } else if (entering > 0) { active = true; amount = 1; }
      else { amount = Math.max(0, amount - dt / 1.2); active = amount > 0; }
      emit();
    }
  };
}
