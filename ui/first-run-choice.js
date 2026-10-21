// GP-19928: the Training Ground invitation belongs to a profile with no finished runs.
export const FIRST_RUN_CHOICE_KEY = 'tt_first_training_offer_v1';

export function createFirstRunChoice({ load = () => null, save = () => {} } = {}) {
  let offered = false;
  try { offered = load() === 'seen'; } catch { /* private storage still allows one offer this session */ }
  return {
    offer(runs) {
      if (offered || !Number.isSafeInteger(runs) || runs !== 0) return false;
      offered = true;
      try { save('seen'); } catch { /* session memory still prevents repeats */ }
      return true;
    }
  };
}
