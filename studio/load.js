// studio/load.js — fetch a scene and every clip it plays, from wherever the studio is served
// (CL-64). Paths are relative to this file, so the game, its test page and the renderer all
// find the same files. The browser's side of loadScene(json, clipOf); Node reads files itself.
import { loadScene, sceneClipRefs } from './scene.js';

const BASE = new URL('./', import.meta.url);
const getJson = async (rel) => {
  const r = await fetch(new URL(rel, BASE));
  if (!r.ok) throw new Error(`studio/${rel}: ${r.status}`);
  return r.json();
};

export async function fetchScene(name) {
  const json = await getJson(`scenes/${name}.json`);
  // The actors' clips, and the clips its reacting bodies get up with (their presets name them).
  const refs = sceneClipRefs(json);
  const clips = new Map(await Promise.all(refs.map(async (r) => [r, await getJson(`clips/${r}.json`)])));
  return loadScene(json, (r) => clips.get(r));
}
