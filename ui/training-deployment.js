import { normalizeTrainingWave, TRAINING_WAVE_LIMIT } from './training-wave.js';

// Deployment advances only in active Training time, including a mixed roster.
export function createTrainingDeployment({onChange = () => {}, onDeploy = () => {}} = {}) {
  let pending = null;

  const copy = ({rows, ...plan}) => rows
    ? {...plan, rows:rows.map(row => ({...row}))}
    : plan;
  const read = () => pending ? {...copy(pending), seconds:Math.ceil(pending.remaining)} : null;

  function queue(plan) {
    pending = {...plan, remaining:5};
    onChange(read());
    return true;
  }

  return {
    read,
    start(kind,count) {
      if (pending || typeof kind !== 'string' || !kind || !Number.isFinite(count)) return false;
      return queue({kind, count:Math.max(1,Math.min(TRAINING_WAVE_LIMIT,Math.trunc(count)))});
    },
    startWave(rows,allowedKinds) {
      if (pending) return false;
      const wave = normalizeTrainingWave(rows,allowedKinds);
      if (!wave?.total) return false;
      if (wave.rows.length === 1) return queue(wave.rows[0]);
      return queue({count:wave.total,rows:wave.rows});
    },
    tick(dt) {
      if (!pending || !Number.isFinite(dt) || dt <= 0) return;
      const previous = Math.ceil(pending.remaining);
      pending.remaining = Math.max(0,pending.remaining-dt);
      if (pending.remaining < 1e-8) {
        const {remaining,...ready} = pending;
        pending = null;
        onChange(null);
        onDeploy(ready);
      } else if (Math.ceil(pending.remaining) !== previous) {
        onChange(read());
      }
    },
    cancel() {
      if (!pending) return false;
      pending = null;
      onChange(null);
      return true;
    }
  };
}
