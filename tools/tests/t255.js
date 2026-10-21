// t255 - CU-147: the smoking idle holds the filter at the lips and points the ember away from the face.
(async () => {
  const T = window.TT, out = [];
  const ok = (condition, message) => out.push((condition ? 'PASS ' : 'FAIL ') + message);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  try {
    await startMatch(T, 'Smoking pose');
    T.clearZombies();
    const idle = T.marineIdleDbg();
    // Enter through the pack phase like the game does. Jumping straight from an
    // armed frame to smoking skipped the four-second holster/relax transition.
    Object.assign(idle.state, { quiet: 25.01, phase: 'pack', time: 0, lit: false });
    const transitionStarted = Date.now();
    while ((idle.state.phase !== 'smoking' || idle.state.time < 1) && Date.now() - transitionStarted < 30000) {
      await wait(50);
    }
    if (idle.state.phase !== 'smoking') throw new Error('the pack-to-smoke transition did not finish');

    const cigarette = idle.props.cig;
    const marine = cigarette.parent.parent;
    const wrist = marine.userData.elbowRG.userData.wrist;
    const hand = wrist.userData.hand;
    const handPoint = (name) => {
      const point = cigarette.position.clone();
      hand.point(name, point);
      point.sub(wrist.position);
      return wrist.localToWorld(point);
    };
    const mouth = cigarette.position.clone().fromArray(cigarette.userData.mouth);
    const solvedPinchDistance = cigarette.position.clone().fromArray(cigarette.userData.pinch).distanceTo(mouth);
    const wristMiss = cigarette.position.clone().fromArray(cigarette.userData.wristActual)
      .distanceTo(cigarette.position.clone().fromArray(cigarette.userData.wristTarget));
    const pinch = handPoint('indexTip').add(handPoint('middleTip')).multiplyScalar(0.5);
    const palm = handPoint('palm');
    const lip = cigarette.position.clone().set(0, 0, 0);
    const ember = cigarette.position.clone().set(0, 0, cigarette.children[2].position.z);
    cigarette.localToWorld(lip);
    cigarette.localToWorld(ember);
    const headForward = cigarette.position.clone().set(0, 0, 1)
      .applyQuaternion(marine.userData.headG.getWorldQuaternion(cigarette.quaternion.clone()));

    const lipError = lip.distanceTo(mouth);
    const emberDistance = ember.distanceTo(mouth);
    const pinchDistance = pinch.distanceTo(mouth);
    const palmClearance = palm.distanceTo(mouth);
    out.push('INFO smoking pinch: solved ' + (solvedPinchDistance * 100).toFixed(1) +
      ' cm, sampled ' + (pinchDistance * 100).toFixed(1) + ' cm, wrist miss ' +
      (wristMiss * 100).toFixed(1) + ' cm; shoulder target/actual ' +
      (cigarette.userData.targetReach * 100).toFixed(1) + '/' +
      (cigarette.userData.actualReach * 100).toFixed(1) + ' cm; hand offset ' +
      (cigarette.userData.handOffset * 100).toFixed(1) + ' cm');
    ok(idle.state.lit && cigarette.visible, 'the cigarette is lit and visible');
    ok(lipError < 0.004, 'the filter meets the lips (' + (lipError * 100).toFixed(2) + ' cm error)');
    ok(emberDistance > 0.055 && ember.clone().sub(mouth).dot(headForward) > 0.055,
      'the ember points forward, away from the face (' + (emberDistance * 100).toFixed(1) + ' cm from lips)');
    ok(pinchDistance >= 0.012 && pinchDistance <= 0.035,
      'the completed runtime frame keeps the fingertip pinch outside the face (' + (pinchDistance * 100).toFixed(1) + ' cm from lips)');
    ok(palmClearance > 0.09,
      'the palm clears the face (' + (palmClearance * 100).toFixed(1) + ' cm from lips)');
  } catch (error) {
    out.push('FAIL threw: ' + (error && (error.stack || error.message) || error));
  }
  return out.join('\n');
})()
