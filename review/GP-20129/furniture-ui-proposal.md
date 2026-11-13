# KR-7 furniture choice — proposed callback contract

Awaiting Director approval in requests.md. C6's model API is planned for ~06:00Z; no shell/model integration is authorized yet.

Armory receives optional `getFurniture(kind) -> null | {current, list:[{key,name}]}` and `onFurniture(kind,key) -> boolean`. Defaults return null/false, so current callers keep the existing UI. A nonempty list draws a text-button group before finishes, reports selected state with aria-pressed, and refreshes only after an accepted change. Rejected changes retain the shown selection. All player copy lives in strings.js.

Shell adapter supplies wood/synthetic only for ak, persists the selected key with appearance state, updates all live KR-7 copies with C6's named-group setter, and includes furniture in gunLookKey so preview/carried caches invalidate. Existing finish choice remains stored; only C6's synthetic material has the furniture paint role. Saved appearances lacking this key use wood. No cash charge or additional unlock is proposed: Jerry requested an appearance choice.

UI fixture furniture.html exercises wood default, synthetic/wood changes, rejected callback, repeat rendering, other-gun absence, and narrow layout. Its stub callback is explicitly UI-only; it cannot verify persistence, clone refresh, real geometry or paint coverage. Those require the approved shell adapter and landed C6 model before GP-20129 can close.
