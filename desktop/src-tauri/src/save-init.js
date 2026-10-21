// CU-149: runs before the game, on every load of the desktop window.
// The profile file is seeded into localStorage once per process. A reload (F5) keeps
// whatever the game wrote this session; the launch snapshot must not overwrite it.
// sessionStorage survives that reload and is empty when the window is opened again.
(function () {
  var seed = __DW_SEED__;
  var invoke = function (cmd, args) { try { return window.__TAURI_INTERNALS__.invoke(cmd, args || {}); } catch (e) { return null; } };
  try {
    var proto = Storage.prototype, set = proto.setItem, remove = proto.removeItem, clear = proto.clear;
    proto.setItem = function (k, v) { set.call(this, k, v); if (this === localStorage) invoke('save_set', { key: String(k), value: String(v) }); };
    proto.removeItem = function (k) { remove.call(this, k); if (this === localStorage) invoke('save_remove', { key: String(k) }); };
    proto.clear = function () { clear.call(this); if (this === localStorage) invoke('save_clear'); };
    var again = false;
    try { again = sessionStorage.getItem('dw_desktop_booted') === '1'; } catch (e) {}
    if (!again) {
      clear.call(localStorage);
      for (var k in seed) if (Object.prototype.hasOwnProperty.call(seed, k)) set.call(localStorage, k, seed[k]);
      try { sessionStorage.setItem('dw_desktop_booted', '1'); } catch (e) {}
    }
  } catch (e) {}
  window.close = function () { invoke('quit_game'); };
  window.addEventListener('keydown', function (e) { if (e.code === 'F11') { e.preventDefault(); invoke('toggle_fullscreen'); } }, true);
  window.__DW_DESKTOP__ = true;
})();
