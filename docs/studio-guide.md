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

## 6. The motion lab (how things react when they're hit)

1. Double-click `Open Motion Lab.bat` in the game folder. A page opens with a zombie standing on a
   green floor.
2. Pick a body at the top left: `zombie/shambler`, `zombie/feral`, `zombie/brute` or `marine/marine`.
3. Pick a weapon, then click the body where it hits. Or press **From the front**, **From the side** or
   **From behind**: the weapon hits the body where the crew's checks aim it (the chest; the shoulder
   for a brute's swing; the hips for a grenade; the head for a killing shot).
4. An arrow shows where the hit landed and which way it pushed. A longer arrow is a harder hit.
   The **power** slider under the weapons makes the weapon hit softer or harder (a quarter to three
   times): slide it until a stagger turns into a fall, and you know how close the body is to falling.
   Tick **Show its points** to see the body the way the physics sees it: white is where its points
   are, green is where its animation wants them.
5. **The bar at the bottom** holds the last six seconds. The marks on it are what happened: red is a
   hit, yellow a stagger step, purple a fall, blue getting up, green back to normal, grey dead.
   - Click or drag on the bar to stop at that moment and look at it. Turn the camera while it's
     stopped.
   - **Play** plays on from there. **Replay** plays from just before the hit.
   - **◀ frame** and **frame ▶** move one frame. The keyboard does the same: Space stops and plays,
     the arrow keys move a frame, R replays, L goes back to live.
   - The speed buttons (**1×**, **½×**, **¼×**, **⅒×**, or the slider, down to 0.05×) set how fast it
     plays. Slow motion looks smoothest in a replay.
   - **Live** goes back to the body as it is now.
6. **Compare** puts a second body beside the first. Every hit lands on both, the same way, at the same
   moment. Pick another body to see them side by side, or pick **B: the file's numbers, A: your
   sliders** to see your slider changes next to the preset as it is.
7. The **muscle** sliders change body A. You don't need to get numbers right: move one until it looks
   better, then say so in a note. The note records the slider for the agent.
   - **Reactions already approved** (once the crew has written down what you approved): **Check them**
     plays every approved hit on the body in a moment and shows a grid: a tick where it still does
     what you approved, a cross where it doesn't. With the sliders moved it checks the sliders too, so
     you can see if a change you like breaks something you already said was right.
8. **Again, the same way** stands the bodies up and hits them the same way again. **Stand up** resets
   them.
9. Write your note bottom right and press **Save note for the crew**. A picture of the screen goes
   with it: what you see, six small pictures of the reaction from the hit on, the bar, and a line
   saying what you did. Stop the bar on the moment you mean before you save, and the big picture is
   that moment. Untick the box to leave the picture out. Press
   **It's good** when a body reacts the way you want. The note goes on the crew panel with the body's
   owner (Grokbot for the zombies and the marine).
   - **Notes so far**, above the box, says where your notes on this body stand: waiting, being worked
     on, or answered with a new version to look at. Click it to read them and the answers.
   - The body's review folder has a page now (`review/motion-<body>/index.html`, the crew panel's
     "Open"): your notes with their pictures and the answers, newest first.
10. **Save as scene** keeps what just happened (the hits since the body last stood still) as a scene
    the crew can render frame by frame. Give it a name or leave the one it suggests.

If the page says "Couldn't save here", it was opened some other way than the .bat file. It copies the
note (and shows the picture to save) for you to paste into the file it names.

**Shift-drag** a body to hold it by the point you grab, and let go to drop it. **Take a part off** takes an
arm, a leg or the head off; **Stand up** puts it back.

## 7. The model lab (how things look)

**Open it.** Double-click `Open Model Lab.bat` in the game folder. Pick a model at the top left: the
fuel drum, the evac boat, the spider or the zombie. Each is a file the crew writes (docs/studio.md §11).

**Look at it.**
- Drag to turn round it. The wheel zooms. Drag with the right button to slide.
- **Turntable** turns it for you.
- **Look from**: *front*, *side*, *back* and *top* show it straight on, with a ruler in metres up the
  left. *¾ front* and *¾ back* are the way an eye sees it.
- The grey figure beside it is exactly **1.75 m** tall. The box under it can show the marine instead
  (the studio's marine is 1.56 m to the top of his cap).
- **Grid** is a metre grid on the ground.

**Light.** *Day* is the game's noon. *Night* is the game at night with the goggles up: very dark, on
purpose. *Night vision* is the game's green, goggles down.

**Parts.** The list on the left is every part in the file. Click one and it lights up orange on the
model, every copy of it. Hold **Shift** and click the model to find which part something is. Click a
colour under *Materials* to light up everything made of it. *Joints* shows the skeleton: yellow dots
where parts hang, blue dots where the game hangs a light or a flame. *Joint names* names them.
**Parts in colour, numbered** paints every part its own colour with its number, the same number as in
the list: say "part 12 is too long" and whoever reads your note knows exactly which.

**A creature with a body** (the spider, the zombie): pick a weapon and click where it hits.
*Stand it up* puts it back. *Lose a limb* takes an arm, a leg or the head off.

**Your note.** Write it in the box on the right and press **Save note for the crew**. It goes into
`review\model-<name>\notes.md` with a picture of exactly what you're looking at, and the model's
owner answers there. **It's good** says it's approved. If the lab can't save (it was opened some other
way), it shows the note and copies it: paste it at the top of `notes.md`, under the box.

Your notes so far are under the box, each with its picture. *see what was looked at* opens the lab
the way it was when you wrote it.

**While an agent works on a model**, keep the lab open: it changes by itself a second or two after
the file is saved. When the file has changed since the version in the review folder, the lab says
so, and **Show v1 as a ghost** draws the old one over the new in blue lines.

**The review folder.** `review\model-<name>\index.html` shows the latest sheet beside the one before,
what changed between them, and the notes. Write in `notes.md` there as for any animation.

Keys: `1`-`6` the views, `F` fit, `T` turntable, `W` wireframe, `J` joints, `N` names, `P` parts in
colour, `G` grid, `L` the next light, `Esc` clear the pick.

## For the crew

Jerry's notes come before your queue. The commands are in `docs/studio.md` §5:
`crew.mjs review`, `review take <asset>`, then render a new version, then
`review answer <asset> <agent> "<what changed>"`. When Jerry gives a note in chat instead, write it
into the folder's `notes.md` under a `## date - Jerry - vN` line, then carry on as above.
