// CU-57 (P-89): Dead-Wave as a desktop game. A window round the packaged game, nothing else.
//
//  * The game is the folder tools/package.mjs stages (index.html, assets/, core/, ...), installed next to the exe as
//    game/. A custom protocol, dw: (http://dw.localhost/ on Windows), serves it, because file:// won't carry the module
//    imports and the import map. Byte ranges are answered (the intro video seeks).
//  * Saves: the game keeps its profile in localStorage (tt_* keys). Here the profile lives in a file the player can
//    see and copy, Documents\Dead-Wave\profile.json: read at start and seeded into localStorage before the game's own
//    code runs, and every later setItem / removeItem / clear is written back through. The webview's own copy is
//    never trusted over the file.
//  * Fullscreen: the window opens fullscreen; F11 toggles it. Quit (the menu's, window.close()) ends the program.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::borrow::Cow;
use std::collections::BTreeMap;
use std::fs;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Component, Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::http::{header, Request, Response, StatusCode};
use tauri::{Manager, State, WebviewUrl, WebviewWindowBuilder};

struct Profile {
    path: PathBuf,
    map: Mutex<BTreeMap<String, String>>,
    dirty: Mutex<bool>,
}

impl Profile {
    fn load(path: PathBuf) -> Profile {
        let map = fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str::<BTreeMap<String, String>>(&s).ok())
            .unwrap_or_default();
        Profile { path, map: Mutex::new(map), dirty: Mutex::new(false) }
    }
    fn flush(&self) {
        let mut dirty = self.dirty.lock().unwrap();
        if !*dirty {
            return;
        }
        let json = serde_json::to_string_pretty(&*self.map.lock().unwrap()).unwrap_or_else(|_| "{}".into());
        if let Some(dir) = self.path.parent() {
            let _ = fs::create_dir_all(dir);
        }
        // Written beside, then moved over: a crash mid-write leaves the old profile, not half of a new one.
        let tmp = self.path.with_extension("json.tmp");
        if fs::write(&tmp, json).is_ok() && fs::rename(&tmp, &self.path).is_ok() {
            *dirty = false;
        }
    }
}

#[tauri::command]
fn save_set(profile: State<'_, Arc<Profile>>, key: String, value: String) {
    profile.map.lock().unwrap().insert(key, value);
    *profile.dirty.lock().unwrap() = true;
}

#[tauri::command]
fn save_remove(profile: State<'_, Arc<Profile>>, key: String) {
    profile.map.lock().unwrap().remove(&key);
    *profile.dirty.lock().unwrap() = true;
}

#[tauri::command]
fn save_clear(profile: State<'_, Arc<Profile>>) {
    profile.map.lock().unwrap().clear();
    *profile.dirty.lock().unwrap() = true;
}

#[tauri::command]
fn toggle_fullscreen(window: tauri::WebviewWindow) {
    let on = window.is_fullscreen().unwrap_or(false);
    let _ = window.set_fullscreen(!on);
}

#[tauri::command]
fn quit_game(app: tauri::AppHandle, profile: State<'_, Arc<Profile>>) {
    profile.flush();
    app.exit(0);
}

fn mime(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()).as_deref() {
        Some("html") => "text/html; charset=utf-8",
        Some("js") | Some("mjs") => "text/javascript; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("json") => "application/json; charset=utf-8",
        Some("png") => "image/png",
        Some("jpg") | Some("jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("svg") => "image/svg+xml",
        Some("mp3") => "audio/mpeg",
        Some("ogg") => "audio/ogg",
        Some("wav") => "audio/wav",
        Some("mp4") => "video/mp4",
        Some("webm") => "video/webm",
        Some("wasm") => "application/wasm",
        Some("glb") => "model/gltf-binary",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("ttf") => "font/ttf",
        _ => "application/octet-stream",
    }
}

fn plain(status: StatusCode, text: &'static str) -> Response<Cow<'static, [u8]>> {
    Response::builder()
        .status(status)
        .header(header::CONTENT_TYPE, "text/plain; charset=utf-8")
        .body(Cow::Borrowed(text.as_bytes()))
        .unwrap()
}

// "bytes=a-b", "bytes=a-" or "bytes=-n" against a file of `len` bytes -> the inclusive range, or None for a bad one.
fn parse_range(h: &str, len: u64) -> Option<(u64, u64)> {
    let spec = h.strip_prefix("bytes=")?.split(',').next()?.trim();
    let (a, b) = spec.split_once('-')?;
    if len == 0 {
        return None;
    }
    let (start, end) = if a.is_empty() {
        let n: u64 = b.parse().ok()?;
        (len.saturating_sub(n), len - 1)
    } else {
        let s: u64 = a.parse().ok()?;
        let e: u64 = if b.is_empty() { len - 1 } else { b.parse().ok()? };
        (s, e.min(len - 1))
    };
    if start > end || start >= len { None } else { Some((start, end)) }
}

fn serve_game(root: &Path, req: &Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let raw = req.uri().path();
    let decoded = percent_decode(raw.trim_start_matches('/'));
    let rel = if decoded.is_empty() { "index.html".to_string() } else { decoded };
    let rel_path = Path::new(&rel);
    // Nothing outside the game folder: no "..", no drive or root parts.
    if rel_path.components().any(|c| !matches!(c, Component::Normal(_))) {
        return plain(StatusCode::FORBIDDEN, "no");
    }
    let file = root.join(rel_path);
    let Ok(mut f) = fs::File::open(&file) else { return plain(StatusCode::NOT_FOUND, "not found") };
    let Ok(meta) = f.metadata() else { return plain(StatusCode::NOT_FOUND, "not found") };
    if !meta.is_file() {
        return plain(StatusCode::NOT_FOUND, "not found");
    }
    let len = meta.len();
    let base = |status: StatusCode| {
        Response::builder()
            .status(status)
            .header(header::CONTENT_TYPE, mime(&file))
            .header(header::ACCEPT_RANGES, "bytes")
            .header(header::CACHE_CONTROL, "no-cache")
            .header(header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
    };
    if let Some(h) = req.headers().get(header::RANGE).and_then(|v| v.to_str().ok()) {
        return match parse_range(h, len) {
            Some((a, b)) => {
                let mut buf = vec![0u8; (b - a + 1) as usize];
                if f.seek(SeekFrom::Start(a)).is_err() || f.read_exact(&mut buf).is_err() {
                    return plain(StatusCode::INTERNAL_SERVER_ERROR, "read failed");
                }
                base(StatusCode::PARTIAL_CONTENT)
                    .header(header::CONTENT_RANGE, format!("bytes {}-{}/{}", a, b, len))
                    .body(Cow::Owned(buf))
                    .unwrap()
            }
            None => Response::builder()
                .status(StatusCode::RANGE_NOT_SATISFIABLE)
                .header(header::CONTENT_RANGE, format!("bytes */{}", len))
                .body(Cow::Borrowed(&b""[..]))
                .unwrap(),
        };
    }
    let mut buf = Vec::with_capacity(len as usize);
    if f.read_to_end(&mut buf).is_err() {
        return plain(StatusCode::INTERNAL_SERVER_ERROR, "read failed");
    }
    base(StatusCode::OK).body(Cow::Owned(buf)).unwrap()
}

fn percent_decode(s: &str) -> String {
    let b = s.as_bytes();
    let mut out = Vec::with_capacity(b.len());
    let mut i = 0;
    while i < b.len() {
        if b[i] == b'%' && i + 2 < b.len() {
            if let Ok(v) = u8::from_str_radix(&s[i + 1..i + 3], 16) {
                out.push(v);
                i += 3;
                continue;
            }
        }
        out.push(b[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

// Runs in the page before any of the game's own code: seeds localStorage from the profile file, writes later
// changes back, F11 for fullscreen, and a window.close() that really closes.
fn init_script(profile: &BTreeMap<String, String>) -> String {
    let seed = serde_json::to_string(profile).unwrap_or_else(|_| "{}".into());
    format!(
        r#"(function () {{
  var seed = {seed};
  var invoke = function (cmd, args) {{ try {{ return window.__TAURI_INTERNALS__.invoke(cmd, args || {{}}); }} catch (e) {{ return null; }} }};
  try {{
    var proto = Storage.prototype, set = proto.setItem, remove = proto.removeItem, clear = proto.clear;
    clear.call(localStorage);
    for (var k in seed) set.call(localStorage, k, seed[k]);
    proto.setItem = function (k, v) {{ set.call(this, k, v); if (this === localStorage) invoke('save_set', {{ key: String(k), value: String(v) }}); }};
    proto.removeItem = function (k) {{ remove.call(this, k); if (this === localStorage) invoke('save_remove', {{ key: String(k) }}); }};
    proto.clear = function () {{ clear.call(this); if (this === localStorage) invoke('save_clear'); }};
  }} catch (e) {{}}
  window.close = function () {{ invoke('quit_game'); }};
  window.addEventListener('keydown', function (e) {{ if (e.code === 'F11') {{ e.preventDefault(); invoke('toggle_fullscreen'); }} }}, true);
  window.__DW_DESKTOP__ = true;
}})();"#
    )
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_set, save_remove, save_clear, toggle_fullscreen, quit_game])
        .register_uri_scheme_protocol("dw", |ctx, req| {
            let root = ctx
                .app_handle()
                .path()
                .resource_dir()
                .map(|d| d.join("game"))
                .unwrap_or_else(|_| PathBuf::from("game"));
            serve_game(&root, &req)
        })
        .setup(|app| {
            // DW_PROFILE_DIR points the profile somewhere else (desktop/smoke.mjs uses a scratch folder, so it can't touch a
            // real profile); otherwise it is Documents\Dead-Wave.
            let dir = match std::env::var("DW_PROFILE_DIR") {
                Ok(d) if !d.is_empty() => PathBuf::from(d),
                _ => app.path().document_dir().unwrap_or_else(|_| PathBuf::from(".")).join("Dead-Wave"),
            };
            let profile = Arc::new(Profile::load(dir.join("profile.json")));
            let script = init_script(&profile.map.lock().unwrap());
            app.manage(profile.clone());
            // Written a second after the last change, and on the way out.
            let writer = profile.clone();
            std::thread::spawn(move || loop {
                std::thread::sleep(Duration::from_secs(1));
                writer.flush();
            });
            // DW_DEBUG=1 opens the game's ?debug=1 (the test hooks, window.TT) for desktop/smoke.mjs; a player never sets it.
            let debug = std::env::var("DW_DEBUG").map(|v| !v.is_empty()).unwrap_or(false);
            let url = format!(
                "{}/index.html{}",
                if cfg!(windows) { "http://dw.localhost" } else { "dw://localhost" },
                if debug { "?debug=1" } else { "" }
            );
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse().unwrap()))
                .title("Dead-Wave")
                .inner_size(1280.0, 720.0)
                .fullscreen(true)
                .initialization_script(&script)
                .build()?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(p) = window.app_handle().try_state::<Arc<Profile>>() {
                    p.flush();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("Dead-Wave could not start");
}
