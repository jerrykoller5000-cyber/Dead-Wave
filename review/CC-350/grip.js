    // CC-350 (for Claude 5's CE-12 draw and holster in third person): where a carried gun's pistol grip is on him, in world space,
    // with the stowed gun's world rotation: from its copy fitted on its spot (slung, at the hip, on the pack). While the gun is in
    // his hands its spot still knows where it goes back to (the cached copy at that spot). Null when he doesn't carry it.
    const _cgM = new THREE.Matrix4();
    function carryGripWorld(kind, outPos, outQuat) {
      const rig = carryRig, H = WEAPON_HOLD[kind];
      if (!rig || !kind) return null;
      const shown = (o) => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
      const load = carriedLoadout();
      const spots = [...rig.slings.map((s, i) => [s, 'sling' + i, load.primary[i]]), [rig.hip, 'hip', 'pistol'], [rig.hipPair, 'hipPair', rig.hipPair.g.visible ? 'pistol' : null],
        ...rig.holsters.map((h, i) => [h, 'holster' + i, h.g.visible ? h.fitKind : null]), ...rig.pairs.map((h, i) => [h, 'pair' + i, h.g.visible ? h.fitKind : null])];
      for (const [spot, key, lives] of spots) {
        if (!spot || !spot.g || lives !== kind || !shown(spot.g.parent)) continue;
        const copy = spot.kind === kind && spot.gun ? spot.gun : rig.copies.get(key + ':' + kind + '+' + gunLookKey(kind));
        const inner = copy && copy.children[0];
        if (!inner) continue;
        spot.g.updateWorldMatrix(true, false); copy.updateMatrix(); inner.updateMatrix();
        _cgM.multiplyMatrices(spot.g.matrixWorld, copy.matrix).multiply(inner.matrix);
        if (outPos) { if (H && Array.isArray(H.grip)) outPos.set(H.grip[0], H.grip[1], H.grip[2]).applyMatrix4(_cgM); else outPos.setFromMatrixPosition(_cgM); }
        if (outQuat) _cgM.decompose(_dpS, outQuat, _dpF);
        return { key, station: spot.station || (key.startsWith('sling') ? 'back' : 'hip') };
      }
      return null;
    }
