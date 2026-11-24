// AG-415: PGB Field Orientation CRT UI controller for the Training Ground optional tutorial.
// Mounts the non-blocking entry offer card, compact #trainingHud button, live top-right
// Orientation Tracker HUD, screen-space waypoint pointer, module completion toast, and
// full interactive 10-module CRT Syllabus Drawer.

import { text, hasText } from './strings.js';

const say = (key, params = {}, fallback = '') => {
  if (!key || !hasText(key)) return fallback || String(key || '');
  try { return text(key, params); } catch (_) { return fallback || String(key); }
};

function el(doc, tag, cls, txt) {
  const n = doc.createElement(tag);
  if (cls) n.className = cls;
  if (txt != null) n.textContent = txt;
  return n;
}

function btn(doc, cls, txt, onClick) {
  const b = el(doc, 'button', cls, txt);
  b.type = 'button';
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onClick(e);
  });
  return b;
}

function directionArrow(dx, dy) {
  const ang = Math.atan2(dy, dx);
  const dirs = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
  const idx = ((Math.round(ang / (Math.PI / 4)) % 8) + 8) % 8;
  return dirs[idx];
}

export function mountTrainingTutorial({
  doc = document,
  engine,
  onAssist = () => {},
  onDrawerChange = () => {},
  onCue = () => {},
} = {}) {
  const hudHost = doc.getElementById('hud') || doc.body;
  const trainingHud = doc.getElementById('trainingHud');

  // 1. Compact Orientation button inside #trainingHud
  const hudBtn = btn(doc, '', say('tutorial.hudBtn', {}, 'Orientation'), () => {
    onCue('open');
    openDrawer();
  });
  hudBtn.id = 'trainingTutorialHudBtn';
  hudBtn.hidden = true;
  if (trainingHud) trainingHud.append(hudBtn);

  // 2. Non-blocking Entry Offer Card
  const offer = el(doc, 'aside', 'tt-plate');
  offer.id = 'trainingTutorialOffer';
  offer.hidden = true;
  offer.setAttribute('role', 'region');
  offer.setAttribute('aria-label', say('tutorial.offer.title'));
  const offerEyebrow = el(doc, 'p', 'tt-eyebrow', say('tutorial.offer.eyebrow'));
  const offerTitle = el(doc, 'h3', '', say('tutorial.offer.title'));
  const offerBody = el(doc, 'p', '', say('tutorial.offer.body'));
  const offerActions = el(doc, 'div', 'tt-offer-actions');
  const offerStart = btn(doc, 'tt-btn tt-primary', say('tutorial.offer.start'), () => {
    onCue('open');
    offerForced = false;
    offer.hidden = true;
    engine.start();
    render();
  });
  const offerSyllabus = btn(doc, 'tt-btn', say('tutorial.offer.syllabus'), () => {
    onCue('open');
    offerForced = false;
    offer.hidden = true;
    engine.dismissOffer();
    openDrawer();
  });
  const offerDismiss = btn(doc, 'tt-btn', say('tutorial.offer.dismiss'), () => {
    onCue('open');
    offerForced = false;
    offer.hidden = true;
    engine.dismissOffer();
    render();
  });
  offerActions.append(offerStart, offerSyllabus, offerDismiss);
  const offerHint = el(doc, 'p', 'tt-shortcut', say('tutorial.offer.shortcut'));
  offer.append(offerEyebrow, offerTitle, offerBody, offerActions, offerHint);
  hudHost.append(offer);

  // 3. Live Orientation Tracker HUD
  const tracker = el(doc, 'aside', 'tt-plate');
  tracker.id = 'trainingTutorial';
  tracker.hidden = true;
  tracker.setAttribute('role', 'region');
  tracker.setAttribute('aria-label', say('tutorial.title'));

  const head = el(doc, 'div', 'tt-head');
  const headMeta = el(doc, 'div', 'tt-head-meta');
  const trEyebrow = el(doc, 'p', 'tt-eyebrow', say('tutorial.eyebrow'));
  const trModLine = el(doc, 'p', 'tt-mod-line', '');
  headMeta.append(trEyebrow, trModLine);

  const headBtns = el(doc, 'div', 'tt-head-btns');
  const btnCollapse = btn(doc, 'tt-btn tt-mini', say('tutorial.btn.collapse'), () => {
    onCue('open');
    engine.setCollapsed(!engine.snapshot().collapsed);
    render();
  });
  const btnSyllabusTop = btn(doc, 'tt-btn tt-mini', say('tutorial.btn.modules'), () => {
    onCue('open');
    openDrawer();
  });
  const btnExitTop = btn(doc, 'tt-btn tt-mini tt-danger', say('tutorial.btn.exit'), () => {
    onCue('open');
    engine.stop();
    render();
  });
  headBtns.append(btnCollapse, btnSyllabusTop, btnExitTop);
  head.append(headMeta, headBtns);

  const bodyWrap = el(doc, 'div', 'tt-body-wrap');
  const bodyScroll = el(doc, 'div', 'tt-body-scroll');
  const progBar = el(doc, 'div', 'tt-progress-bar');
  const progFill = el(doc, 'div', 'tt-progress-fill');
  progBar.append(progFill);

  const trTitle = el(doc, 'h3', 'tt-step-title', '');
  const trBody = el(doc, 'p', 'tt-step-body', '');
  const trKeys = el(doc, 'div', 'tt-keys');
  const trTasks = el(doc, 'ul', 'tt-tasks');
  const trBriefing = el(doc, 'ul', 'tt-briefing');
  const trDoneBanner = el(doc, 'div', 'tt-done-banner', say('tutorial.stepComplete'));
  trDoneBanner.hidden = true;
  const trNote = el(doc, 'p', 'tt-note', '');

  let currentAssistId = null;
  const btnAssist = btn(doc, 'tt-btn tt-assist', '', () => {
    if (!currentAssistId) return;
    onCue('open');
    onAssist(currentAssistId, engine.snapshot());
    render();
  });
  btnAssist.hidden = true;

  const actions = el(doc, 'div', 'tt-actions');
  const btnPrev = btn(doc, 'tt-btn', say('tutorial.btn.prev'), () => {
    onCue('open');
    engine.prev();
    render();
  });
  const btnSkip = btn(doc, 'tt-btn', say('tutorial.btn.skip'), () => {
    onCue('open');
    engine.skip();
    render();
  });
  const btnContinue = btn(doc, 'tt-btn tt-primary', say('tutorial.btn.continue'), () => {
    onCue('open');
    const snap = engine.snapshot();
    if (snap.step?.isGraduation) {
      engine.stop();
    } else {
      engine.next(true);
    }
    render();
  });
  const btnReplay = btn(doc, 'tt-btn', say('tutorial.btn.replay'), () => {
    onCue('open');
    engine.resetProgress();
    engine.start('move.walk');
    render();
  });
  btnReplay.hidden = true;
  actions.append(btnPrev, btnSkip, el(doc, 'span', 'tt-spacer'), btnReplay, btnContinue);

  bodyScroll.append(trTitle, trBody, trKeys, trTasks, trBriefing, trDoneBanner, trNote);
  bodyWrap.append(progBar, bodyScroll, btnAssist, actions);
  tracker.append(head, bodyWrap);
  hudHost.append(tracker);

  // 4. Screen-space Waypoint Pointer
  const pointer = el(doc, 'div');
  pointer.id = 'trainingTutorialPointer';
  pointer.hidden = true;
  const ptrArrow = el(doc, 'span', 'tt-ptr-arrow', '→');
  const ptrText = el(doc, 'span', 'tt-ptr-text', '');
  pointer.append(ptrArrow, ptrText);
  hudHost.append(pointer);

  // 5. Module Complete Toast
  const toast = el(doc, 'div');
  toast.id = 'trainingTutorialToast';
  toast.hidden = true;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  hudHost.append(toast);

  // 6. Full CRT Syllabus Drawer Modal
  const drawer = el(doc, 'section');
  drawer.id = 'trainingTutorialDrawer';
  drawer.hidden = true;
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-labelledby', 'trainingTutorialDrawerTitle');

  const drawerCard = el(doc, 'div', 'tt-plate tt-drawer-card');
  const drawerHead = el(doc, 'header', 'tt-drawer-head');
  const drawerEyebrow = el(doc, 'p', 'tt-eyebrow', say('tutorial.eyebrow'));
  const drawerTitle = el(doc, 'h2', '', say('tutorial.drawer.title'));
  drawerTitle.id = 'trainingTutorialDrawerTitle';
  const drawerSub = el(doc, 'p', '', say('tutorial.drawer.subtitle'));
  const drawerSummary = el(doc, 'div', 'tt-drawer-summary');
  const drawerBar = el(doc, 'div', 'tt-progress-bar');
  const drawerFill = el(doc, 'div', 'tt-progress-fill');
  drawerBar.append(drawerFill);
  const drawerOut = el(doc, 'output', '', '');
  drawerSummary.append(drawerBar, drawerOut);
  drawerHead.append(drawerEyebrow, drawerTitle, drawerSub, drawerSummary);

  const drawerGrid = el(doc, 'div', 'tt-drawer-grid');

  const drawerFoot = el(doc, 'footer', 'tt-drawer-foot');
  const footLeft = el(doc, 'div', 'tt-drawer-foot-group');
  const footRight = el(doc, 'div', 'tt-drawer-foot-group');

  let resetArmed = false;
  const btnReset = btn(doc, 'tt-btn tt-danger', say('tutorial.btn.reset'), () => {
    onCue('open');
    if (!resetArmed) {
      resetArmed = true;
      btnReset.textContent = say('tutorial.btn.resetConfirm');
      return;
    }
    resetArmed = false;
    btnReset.textContent = say('tutorial.btn.reset');
    engine.resetProgress();
    renderDrawer();
    render();
  });
  const btnFreePractice = btn(doc, 'tt-btn', say('tutorial.offer.dismiss'), () => {
    onCue('open');
    engine.dismissOffer();
    engine.stop();
    closeDrawer();
    render();
  });
  const btnDrawerStart = btn(doc, 'tt-btn tt-primary', say('tutorial.offer.start'), () => {
    onCue('open');
    closeDrawer();
    engine.start();
    render();
  });
  const btnDrawerClose = btn(doc, 'tt-btn', say('tutorial.btn.close'), () => {
    onCue('open');
    closeDrawer();
  });
  footLeft.append(btnReset, btnFreePractice);
  footRight.append(btnDrawerStart, btnDrawerClose);
  drawerFoot.append(footLeft, footRight);

  drawerCard.append(drawerHead, drawerGrid, drawerFoot);
  drawer.append(drawerCard);
  doc.body.append(drawer);

  // Backdrop click closes drawer
  drawer.addEventListener('click', (e) => {
    if (e.target === drawer) {
      onCue('open');
      closeDrawer();
    }
  });

  // State
  let trainingVisible = false;
  let allowAutoOffer = true;
  let offerForced = false;
  let drawerOpen = false;
  let toastTimer = 0;
  let lastRenderSig = '';

  function openDrawer() {
    if (!trainingVisible) return;
    resetArmed = false;
    btnReset.textContent = say('tutorial.btn.reset');
    drawerOpen = true;
    drawer.hidden = false;
    offer.hidden = true;
    render(true);
    renderDrawer();
    onDrawerChange(true);
    btnDrawerClose.focus({ preventScroll: true });
  }

  function closeDrawer() {
    if (!drawerOpen) return;
    resetArmed = false;
    btnReset.textContent = say('tutorial.btn.reset');
    drawerOpen = false;
    drawer.hidden = true;
    onDrawerChange(false);
    render();
  }

  function showToast(msg, seconds = 2.6) {
    if (!msg || !trainingVisible) return;
    toast.textContent = msg;
    toast.hidden = false;
    toastTimer = seconds;
  }

  function renderDrawer() {
    const snap = engine.snapshot();
    drawerFill.style.width = snap.percent + '%';
    drawerOut.textContent = say('tutorial.overallProgress', {
      done: snap.completedCount,
      total: snap.totalTrackable,
      percent: snap.percent,
    });
    btnDrawerStart.textContent = snap.active
      ? say('tutorial.btn.continue')
      : snap.completedCount > 0 && !snap.graduated
        ? say('tutorial.offer.resume')
        : say('tutorial.offer.start');
    btnFreePractice.hidden = !snap.active;

    drawerGrid.replaceChildren();
    for (const mod of snap.modules) {
      const card = el(doc, 'section', 'tt-mod-card' + (mod.complete ? ' is-complete' : '') + (snap.active && snap.module?.id === mod.id ? ' is-current' : ''));
      const top = el(doc, 'div', 'tt-mod-top');
      const titleBox = el(doc, 'div');
      const numLabel = mod.complete
        ? `${String(mod.index + 1).padStart(2, '0')} · ${say('tutorial.drawer.moduleDone')}`
        : `${String(mod.index + 1).padStart(2, '0')} · ${mod.done}/${mod.total}`;
      titleBox.append(
        el(doc, 'div', 'tt-mod-num', numLabel),
        el(doc, 'h3', '', say(mod.titleKey)),
      );
      const runBtn = btn(doc, 'tt-btn tt-mini' + (snap.active && snap.module?.id === mod.id ? ' tt-primary' : ''),
        snap.active && snap.module?.id === mod.id ? say('tutorial.drawer.resumeModule') : say('tutorial.drawer.startModule'),
        () => {
          onCue('open');
          closeDrawer();
          engine.jumpToModule(mod.id);
          render();
        });
      top.append(titleBox, runBtn);
      const desc = el(doc, 'p', 'tt-mod-desc', say(mod.descKey));
      const chips = el(doc, 'div', 'tt-step-chips');
      for (const st of mod.steps) {
        const prefix = st.complete ? '✓ ' : '';
        const chip = btn(doc, 'tt-step-chip' + (st.complete ? ' done' : '') + (st.current ? ' current' : ''),
          prefix + say(st.titleKey),
          () => {
            onCue('open');
            closeDrawer();
            engine.jumpToStep(st.id);
            render();
          });
        chip.dataset.tutorialStep = st.id;
        chips.append(chip);
      }
      card.append(top, desc, chips);
      drawerGrid.append(card);
    }
  }

  function render(force = false) {
    const snap = engine.snapshot();
    hudBtn.hidden = !trainingVisible;
    if (trainingVisible) {
      hudBtn.classList.toggle('is-active', snap.active);
      hudBtn.classList.toggle('is-done', snap.graduated && !snap.active);
      hudBtn.textContent = snap.graduated
        ? say('tutorial.hudBtnDone')
        : snap.completedCount > 0 || snap.active
          ? say('tutorial.hudBtnProgress', { percent: snap.percent })
          : say('tutorial.hudBtn');
    }

    const showOfferCard = trainingVisible && !drawerOpen && !snap.active && (offerForced || (allowAutoOffer && snap.shouldOffer));
    offer.hidden = !showOfferCard;
    if (showOfferCard) {
      offerStart.textContent = snap.completedCount > 0 ? say('tutorial.offer.resume') : say('tutorial.offer.start');
    }

    const showTracker = trainingVisible && snap.active && !drawerOpen;
    tracker.hidden = !showTracker;
    if (!showTracker) {
      pointer.hidden = true;
      lastRenderSig = '';
      return;
    }

    const s = snap.step;
    const sig = JSON.stringify([
      snap.collapsed,
      snap.stepDone,
      snap.percent,
      s.id,
      s.tasks.map((t) => [t.done, t.progress?.cur ?? -1]),
    ]);
    if (!force && sig === lastRenderSig) return;
    lastRenderSig = sig;

    tracker.classList.toggle('is-done', snap.stepDone || s.isGraduation);
    tracker.classList.toggle('is-collapsed', snap.collapsed);
    btnCollapse.textContent = say(snap.collapsed ? 'tutorial.btn.expand' : 'tutorial.btn.collapse');

    trModLine.textContent = say('tutorial.moduleProgress', {
      current: snap.module.index + 1,
      total: snap.module.total,
      step: s.stepIndex + 1,
      steps: s.moduleStepCount,
    }) + ' · ' + say(snap.module.titleKey);

    progFill.style.width = snap.percent + '%';
    trTitle.textContent = say(s.titleKey);
    trBody.textContent = say(s.bodyKey);

    trKeys.replaceChildren();
    for (const k of s.keys || []) {
      trKeys.append(el(doc, 'span', 'tt-key-chip', say('tutorial.key.' + k, {}, k)));
    }

    trTasks.replaceChildren();
    for (const t of s.tasks || []) {
      const li = el(doc, 'li', 'tt-task' + (t.done ? ' done' : ''));
      const box = el(doc, 'span', 'tt-task-box', t.done ? '✓' : '');
      const lbl = el(doc, 'span', '', say(t.labelKey));
      const prog = el(doc, 'span', 'tt-task-prog',
        t.progress ? `${t.progress.cur}/${t.progress.max}${t.progress.unit || ''}` : '');
      li.append(box, lbl, prog);
      trTasks.append(li);
    }

    trBriefing.replaceChildren();
    if (s.briefingBullets) {
      for (const bKey of s.briefingBullets) {
        trBriefing.append(el(doc, 'li', '', say(bKey)));
      }
    }

    trDoneBanner.hidden = !snap.stepDone;
    trNote.textContent = say(s.noteKey);
    trNote.hidden = !trNote.textContent;

    if (s.assist && !snap.stepDone) {
      currentAssistId = s.assist.id;
      btnAssist.textContent = say(s.assist.labelKey);
      btnAssist.hidden = false;
    } else {
      currentAssistId = null;
      btnAssist.hidden = true;
    }

    btnPrev.disabled = snap.currentIndex <= 0;
    btnSkip.hidden = s.manualContinue || s.isGraduation || snap.stepDone;
    btnContinue.hidden = !s.manualContinue && !snap.stepDone;
    btnContinue.textContent = say(s.isGraduation ? 'tutorial.btn.finish' : 'tutorial.btn.continue');
    btnReplay.hidden = !s.isGraduation;
  }

  function updateModalState(modalOpen) {
    doc.body.classList.toggle('training-tutorial-modal-open', !!(trainingVisible && engine.isActive() && modalOpen));
  }

  function updatePointer(info) {
    if (!trainingVisible || !engine.isActive() || drawerOpen || !info || !info.visible) {
      pointer.hidden = true;
      return;
    }
    pointer.hidden = false;
    pointer.classList.toggle('is-arrived', !!info.arrived);
    const label = say(info.labelKey, {}, info.labelKey || '');
    ptrText.textContent = info.arrived
      ? say('tutorial.waypoint.arrived', { label })
      : say('tutorial.waypoint.dist', { label, meters: Math.max(1, Math.round(info.dist || 0)) });
    ptrArrow.textContent = info.arrived ? '◆' : (info.onScreen ? '▼' : directionArrow(info.dx || 0, info.dy || 0));
    pointer.style.left = Math.round(info.x) + 'px';
    pointer.style.top = Math.round(info.y) + 'px';
  }

  function tickUi(dt) {
    if (toastTimer > 0) {
      toastTimer -= Math.max(0, dt || 0);
      if (toastTimer <= 0) {
        toastTimer = 0;
        toast.hidden = true;
      }
    }
  }

  function setTrainingVisible(on, { allowOffer = true } = {}) {
    trainingVisible = !!on;
    allowAutoOffer = !!allowOffer;
    if (!trainingVisible) {
      offerForced = false;
      closeDrawer();
      toast.hidden = true;
      toastTimer = 0;
      pointer.hidden = true;
      doc.body.classList.remove('training-tutorial-modal-open');
    }
    render(true);
  }

  function showOffer(force = true) {
    if (!trainingVisible) return;
    offerForced = !!force;
    render(true);
  }

  return {
    render,
    renderDrawer,
    setTrainingVisible,
    showOffer,
    openDrawer,
    closeDrawer,
    isDrawerOpen: () => drawerOpen,
    showToast,
    updatePointer,
    updateModalState,
    tickUi,
    elements: { hudBtn, offer, tracker, pointer, toast, drawer },
    dispose() {
      hudBtn.remove();
      offer.remove();
      tracker.remove();
      pointer.remove();
      toast.remove();
      drawer.remove();
      doc.body.classList.remove('training-tutorial-modal-open');
    },
  };
}
