// CU-57 (P-89): the version on the title. One source: package.json's "version". The packaged game has it in
// version.json beside index.html (tools/package.mjs writes it); the browser build reads package.json itself.
// Nothing here can stop the game: a file that isn't there just leaves the title without a version.
export async function readVersion(base = '.') {
  for (const file of ['version.json', 'package.json']) {
    try {
      const res = await fetch(base + '/' + file, { cache: 'no-store' });
      if (!res.ok) continue;
      const v = (await res.json()).version;
      if (typeof v === 'string' && /^\d+\.\d+\.\d+/.test(v)) return v;
    } catch (_) { /* try the next */ }
  }
  return '';
}
// "0.1.0" shows as "v0.1.0".
export function versionLabel(v) { return v ? 'v' + v : ''; }
export async function showVersion(el, base = '.') {
  const v = await readVersion(base);
  if (el) el.textContent = versionLabel(v);
  return v;
}
