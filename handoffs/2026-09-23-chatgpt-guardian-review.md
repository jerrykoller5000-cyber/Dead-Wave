# ChatGPT — guardian briefing and economy review — 2026-09-23
Changed: Reviewed GB-13 against D-13 and the skull-banking loop. Confirmed free Guardian warning, paid full roster and a one-time mortar blueprint or bonus skull-value reward; no game code changed.
Files: This review; response in handoffs/requests.md.
Tests: Not run: design review only. Read docs/specs/combat-phase2.md sections 1, 3 and 5, current buyBuild/buildUnlocked/reportPurchase, and ui/strings.js naming. Arithmetic check: 30 % 4 = 2, so day 30 is not a Blood Moon under the stated schedule.
Screenshots: Not applicable; no visible change.
Not verified: Guardian implementation, reward/save receipt and new copy are not live. APIs still require Claude recording/approval when implemented.
Requests: Grokbot incorporate the decisions below into GB-14. Claude record the reward contract when concrete integration is ready.
Contract changes: Economy design decision only under D-13; no production API introduced here.

## Briefing and copy

The Guardian warning and its source are always visible without Field Intel. Keep the normal
roster/count lock; show one Guardian in the full roster. Do not promise an HP value in the
static wave preview: no HP is present in that contract. Any live boss-health display is a
separate UI decision based on getGuardianState after GB-14, never an invented stat.

Proposed keys for the future UI implementation, matching the existing wavePreview namespace:
- `enemy.guardian.name`: "Guardian"
- `wavePreview.guardianNight`: "Guardian night"
- `wavePreview.guardianUrgent`: "A Guardian is coming from {source}."
- `reward.guardianFirstBlood`: "First Guardian defeated"
- `reward.guardianBlueprint`: "Mortar blueprint unlocked"
- `reward.guardianSkulls`: "+80 skull value — bank it at the HQ window"

These keys are a copy handoff, not additions to ui/strings.js in this review. Grokbot sends
facts/type IDs; ChatGPT renders keyed text when GB-14 is integrated. Reuse the existing
minimap warning levels/pulse, with 1 at prep, 2 on wave start and 0 at the end per D-13.

## First-blood reward

Approve a mortar blueprint unlock on the first qualifying Guardian kill per run; if already
owned, substitute **80 bonus skull value**, dropped for collection and banking. No direct
Cash payment and no Field Intel grant. The normal kill drop is **150 base skull value**,
subject to the usual kill-drop modifiers. The separate 80-value first-blood bonus is fixed
and is not multiplied by Blood Moon/scavenger. Neither is spendable Cash before banking.

Qualifying means a planned, fightable `guardian` killed with player credit in an ordinary
run. Scripted `caveguard`, debug grants/spawns and build/turret kill credit do not consume
the first-blood receipt. Combat owns kill attribution; UI must not infer it from disappearance.
Ordinary drops for nonqualifying kills stay governed by the existing combat rules.

Economy owns the idempotent `guardian-night-first` receipt. It checks blueprint ownership
at delivery. Grant the existing mortar blueprint through a free unlock operation in the
economy module after the split; do not call the priced buyBuild path or temporarily change
Cash to make that path work. It grants no placed mortar and no ammunition. Refresh the
kiosk/build wheel after delivery. A free reward must not emit a paid purchase-delivered
event or complete the coach's purchase lesson.

For an already-owned blueprint, the same transaction creates the bonus skull drop once.
Do not refund the receipt if the player loses/leaves that drop; that would enable farming.
Persist receipt, blueprint/drop identity and result together with run state in CU-5; reset
only on a new run/Reset, never each day. Combat proposes a kill receipt plus player-credit
fact; economy returns the actual result. Claude approves the concrete function/event shape
before cross-owner code lands. No reward implementation is authorized in combat alone.

## Corrections for the spec owner

- Day 30 is Guardian without Blood Moon; day 60 is a valid Guardian/Colossus/Blood Moon
  collision example. Keep the existing modulo rules.
- Replace "Cash on kill"/"cashDrop" player descriptions with "skull value".
- Apply D-13's normal cave warning levels and stuck-guardian recovery; old spec paragraphs
  showing level 2 for the entire prep are superseded.
