# ElevenLabs music batch (CL-163)

Jerry, 2026-10-10: "we are going to try the same eleven labs thing for all music as well ... a Metal/Chiptune hybrid.
Think Doom 1 brought up to the modern age ... organize all the music into one folder and then have sub folders with
tracks. Then use the same method that ChatGPT used for batch creation."

**Double-click `Start music batch.cmd`** (or `Make one take of everything.cmd`, which skips the menu and makes one round: one take of every track). Choice 1 makes a 2-track test (the wave-alarm sting and night 20), 2/3/4 make
one, two or four takes of all 45 tracks. Type YES, then paste the API key (hidden; never saved). The key
needs **Music** access (ElevenLabs > Developers > API Keys). The Music API is for paid plans.

- **Where the takes go:** straight into `z-music/<group>/<track>/<track>-takeN-<fingerprint>.mp3` (MP3 44.1 kHz,
  192 kbps), where Jerry listens and deletes the bad ones. Receipts: `z-music/.elevenlabs-progress.json` (keep it).
- **What is sent:** `z-music/PROMPTS-MUSIC.md` lists every prompt. Model `music_v2_5`. Calm tracks, day fights,
  endings and stings are a text prompt with `force_instrumental`. The 20 night songs and the heart fight are a
  *composition plan* of seven sections (stalk, drop A, riff B, break, drop A2, bridge, climax), each a whole number of
  bars at the song's tempo, the same layout the game's section director already uses (`music.json` sections), so a
  picked take can drop into that slot. Every section's negative styles include vocals.
- **Cost:** one take of everything is 96.0 minutes. The estimate uses 1000 credits a minute (ElevenLabs
  publishes minutes per plan, not a credit rate; that works out at roughly 750-900 credits a minute, so the estimate is
  on the high side). Your plan decides the real price; the website shows it before generating. Set a credit limit
  on the API key for a hard cap.
- **Rounds:** take 1 of every track first, then take 2, and so on. Choosing 4 after 2 only makes takes 3 and 4.
- **Deleting a take** never makes it again (`--allow-moved-clips true`, as in GP-186). Ctrl+C stops; launching again resumes.

## The tool
`batch-music.mjs` and `run-music.mjs` are ChatGPT's GP-182/GP-189 runner (`review/elevenlabs-batch`) copied, with only
the music parts changed: the endpoint (`POST /v1/music`), the request body (a prompt or a composition plan), the
length range (3 s to 10 min), a longer timeout, a larger size limit, and the song id kept in each receipt (so a take
can be extended or inpainted later). Receipts, locks, the budget gate, resume, error handling and History recovery are
his, unchanged. `manifest-music.json` is written by Claude's generator (CL-163; it also writes `PROMPTS-MUSIC.md` and
each folder's `_prompt.txt`). `node --test music.test.mjs`: 5 offline tests, simulated network, no credits.

```powershell
node run-music.mjs plan --scope all --variants 2          # what two takes of everything would be
node run-music.mjs plan --group nights --variants 1       # just the nights
```

Sources checked 2026-10-10: [Compose music API](https://elevenlabs.io/docs/api-reference/music/compose),
[Music cookbook](https://elevenlabs.io/docs/eleven-api/guides/cookbooks/music), [API pricing](https://elevenlabs.io/pricing/api),
[How much does Eleven Music cost?](https://help.elevenlabs.io/hc/en-us/articles/37821528996497-How-much-does-Eleven-Music-cost),
[Music v2.5](https://elevenlabs.io/blog/music-v2-5-model).
