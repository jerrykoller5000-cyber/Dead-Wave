# The studio: Jerry's guide

The crew can't play the game the way you do, so the studio gives us pictures of every animation
and gives you one place to tell us what's wrong. You watch, you write a few plain sentences, and the
agent who owns that animation fixes it and shows you the new version. That's the whole job.

## 1. Where to look

Every animation has its own folder in `Tiny Trek\review\`. Right now there are five, all the cave
guardian:

| Folder | What it is |
| --- | --- |
| `guardian-drag` | dragging you into the cave. **Start here.** |
| `guardian-gallop` | the chase on all fours |
| `guardian-pounce` | the grab at your leg |
| `guardian-throw` | throwing you out of the cave |
| `guardian` | the model turning round, no animation |

Open a folder and double-click `index.html`. It opens in your browser. You don't need the game
running. (The crew panel lists the same folders under **Review folders**, with links.)

The page shows the newest version first, with the version before it underneath, so you can compare
them. Each version has two things.

**The strip** is a grid of still frames, with the time in the corner of each one. The frames of our
creature and the frames of a real human doing the same kind of move (from your Quaternius pack) are
taken at the same moments, so you can compare the timing and the weight. The marine stands beside
them for size. A red border means the numbers found a problem in that frame: a joint that jumps
too far in one frame (a "snap"), or a planted foot that slides.

**The video** plays the animation at full speed, then at quarter speed, from the side, then from
the game camera.

## 2. How to write a note

In the same folder, open `notes.md` in Notepad. The box at the top explains it again; leave it
there. Below the box, write one line that starts with `##` and says the date, your name and the
version you watched. The version is the big `v2` (or `v3`, and so on) at the top of the page.
Then write your note underneath it:

```
## 2026-09-26 - Jerry - v2
It kneels the whole time. It should lean into the pull, like it's hauling a sled.
The arm holding you looks stiff.
```

Save the file. That's all.

Some things help us most:

- **Say what it should feel like.** "Heavy", "desperate", "like hauling a sled", "like a big cat".
  That tells us more than the angle of a joint.
- **Point at a moment when you can.** "At 0.45 s the arm pops" or "the third frame". The times are
  on the strip.
- **One note can hold several things.** Write them as separate sentences.
- **Write "good" when it's right.** That closes the folder.

Dashes, dots or bars in the `##` line all work, and if you forget the date, that's fine too.
The line only needs the `##` and the version.

## 3. What happens next

1. The crew panel shows **your note is waiting** next to the folder. Under **Your move** there is a
   **Start Claude** line with a **Copy prompt** button (the folder's owner; for the guardian that's
   me). Paste it into that agent's chat, the same as starting any task. If the agent is already
   working, it picks the note up by itself: `crew.mjs next` puts your notes first.
2. The agent changes the animation and makes a new version. You'll see `v3` in the folder.
3. The agent writes its answer under your note, saying what changed:
   ```
   > claude · v3 · 2026-09-26: leans from the ankles now; both feet dig in on each heave
   ```
4. The panel shows **Look at guardian-drag v3** under Your move, with an **Open** button.
5. You watch v3 and write the next note, or "good".

## 4. Comparing versions

`index.html` shows the newest version and the one before it. Every older version is still in its
own folder (`v1`, `v2`, ...), with its strip, its video and the animation itself. Nothing is lost,
so you can always say "go back to v2's arms" or "v4 was better than v5".

## 5. If something looks wrong

- **Your note doesn't show on the panel.** Check the line above it starts with `##` and has the
  version (`v2`). Refresh the panel. The panel reads the folders again every 10 seconds.
- **A folder isn't on the panel.** The panel learns about new folders when any agent runs a crew
  command. Tell whoever you're talking to.
- **You'd rather just say it in chat.** That's fine. The agent writes your words into `notes.md`
  for you, so they're on record.

## For the crew

Jerry's notes come before your queue. The commands are in `docs/studio.md` §5:
`crew.mjs review`, `review take <asset>`, then render a new version, then
`review answer <asset> <agent> "<what changed>"`. When Jerry gives a note in chat instead, write it
into the folder's `notes.md` under a `## date - Jerry - vN` line, then carry on as above.
