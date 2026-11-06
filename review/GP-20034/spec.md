# GP-20034 quest answers before implementation

Read `docs/quest-design.md` and `docs/specs/story-chain.md` before this work. Scope is the D-116 gated story line under `?gates=1`; the existing ungated shop and relay vault continue to work as before. The eight lead sites and their order come from the existing story-chain spec.

1. **Why does it exist?** Captain Hale prepared sealed work orders for the twelve during Threshold's quiet days. The post fell before they could finish them. The mast vines and crashed-truck blockage grew from the abandoned valley and now require tools left at earlier sites.
2. **Why should the player care?** The next order gives one concrete place and task, the machete opens the relay approach, and the winch clears the hikers' trail. The orders let the thirteenth Gravewalker continue the twelve's work without a generic task list.
3. **How does it connect?** Each order names one of the established leads (generator, relay, medical, missing, truck, search, old man, below) and one of the twelve who left evidence there. The vine blade is found at Price's depot shed; the winch comes from the convoy escort truck after the medical run.
4. **What changes afterward?** Under gated mode the machete is a find, no longer a kiosk or vault reward; the picked-up blade opens the vine gate. The winch process clears the blocked trail. Stamping an order done releases the next sealed order at dawn; completion leaves a marked board card and opened path. The existing ungated reward path remains intact.
5. **What makes it memorable?** The dead commander's next order comes from a rattling HQ teleprinter at dawn, after a living soldier stamps the previous paper done. The final dead-man note explains why a timer kept feeding orders after Hale died.

Design constraints: short player-facing lines, one clear action per prompt, commander's military voice without joking about the dead, no revelations beyond `docs/story.md` §12, and no new world placement in this task. Claude's CL-303 owns the pickup and winch world implementation; this task changes their text and the machete's two alternate acquisition channels.
