// Inspector-only waits: cancel a move promptly, and fail a frame request instead of hanging a review forever.
export function abortError(message = 'Inspection cancelled') {
  const e = new Error(message); e.name = 'AbortError'; return e;
}
export function createWaitQueue() {
  const pending = new Set();
  function wait({ at = 0, signal, timeout = 0, label = 'frame' } = {}) {
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const w = { at, resolve: () => finish(resolve), reject: (e) => finish(reject, e) };
      let timer;
      const cancel = () => w.reject(abortError());
      function finish(fn, value) {
        if (!pending.delete(w)) return;
        clearTimeout(timer); signal?.removeEventListener('abort', cancel); fn(value);
      }
      pending.add(w); signal?.addEventListener('abort', cancel, { once: true });
      if (timeout > 0) timer = setTimeout(() => w.reject(new Error('Inspector ' + label + ' timed out after ' + timeout + ' ms; resume the window or reload the inspector')), timeout);
    });
  }
  return { wait, flush: (time = Infinity) => { for (const w of [...pending]) if (time >= w.at) w.resolve(); },
    cancel: (e = abortError()) => { for (const w of [...pending]) w.reject(e); }, get size() { return pending.size; } };
}
export function boundedNumber(value, name, min, max, { integer = false } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n)))
    throw new Error(name + ' must be ' + (integer ? 'an integer ' : '') + 'from ' + min + ' to ' + max);
  return n;
}
