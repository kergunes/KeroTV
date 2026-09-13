# KeroTV

KeroTV is a TV-first web client and compatibility experiment for the Sony KD-55XF7077.

## V0 — Capability Probe

V0 deliberately avoids frameworks and build tooling. The shell is written in conservative HTML/CSS and ES5-style JavaScript so the TV browser can boot the app even if modern APIs are missing.

V0 answers the questions that matter before building the real product:

- Does the built-in browser render the app reliably?
- Which JavaScript/browser APIs exist?
- Do D-pad, OK and Back keys reach JavaScript?
- Does local/session storage work?
- Which media codecs does the browser claim to support?
- Can an MP4 stream load and play?
- What viewport, screen size and user agent does the TV expose?
- Are there HbbTV / OIPF / Vewd / Opera platform hints?

## V1 — First real vertical slice

The default launch screen is now the real remote-first loop:

**Home → content card → Detail → Play → Back**

V1 uses a small static catalog and the verified local H.264/MP4 path. It intentionally has no framework, build step, CSS Grid dependency, native HLS dependency, account system, or backend. V0 findings remain documented in `docs/V0_TEST_PLAN.md` and `docs/KD55XF7077_CAPABILITY_BASELINE.md`.

## Run on the local network

1. Clone the repository on a computer connected to the same network as the TV.
2. Run: `python server.py`
3. Note the LAN URL printed by the server, for example `http://192.168.1.20:8000`.
4. Open that URL in the Sony TV browser.
5. Use only the TV remote for the first pass.

The server uses Python's standard library only.

## V0 test order

1. Confirm the home screen renders without a blank page.
2. Move focus with Up / Down / Left / Right.
3. Press OK on **Remote input** and verify key codes appear.
4. Run **Storage** and confirm values can be written and read.
5. Open **Video** and start the MP4 playback test.
6. Open **Report** and photograph/copy the final report.

Detailed procedure: `docs/V0_TEST_PLAN.md`.

## Pass criteria for moving to V1

KeroTV can move from capability probing to a real TV shell if:

- the page remains stable and readable;
- D-pad + OK are usable for deterministic navigation;
- Back can be handled or has an acceptable browser-level fallback;
- at least one persistence mechanism works, or we can replace persistence with device pairing;
- H.264/MP4 playback works either directly in the browser or through an acceptable fallback.

A failure in a modern feature such as Fetch, Promises, CSS Grid, WebSocket or HLS is **not** a V0 failure. The real app will be designed around the confirmed capability floor.

## Architecture rule

Do not add React, Vue, Next.js, transpilers or a large dependency chain until the KD-55XF7077 capability report is known. V0's job is to discover the platform, not to guess it.

## Current target device

- Sony KD-55XF7077
- non-Android Sony Smart TV platform
- built-in browser
- remote-first / 10-foot UI

## V1 status

Implemented and desktop-checkable: Home, deterministic focus, static content data, Detail, local MP4 Player, loading/error/playing status, internal Back stack, focus restoration, safe-area spacing, and the Sony pointer-emulation adapter. Physical TV playback and remote behavior still require `docs/V1_TEST_CHECKLIST.md`.


## Local codec lab

KeroTV can serve personal test clips from the local `media/` folder without committing them to GitHub.

For the Dead Cells AV1 vs H.264 test, use these exact filenames:

- `media/deadcells-av1.mp4` — original NVIDIA AV1 + AAC capture
- `media/deadcells-h264.mp4` — optional H.264 + AAC control copy

The Home screen exposes both under **Codec Lab**. Missing files simply produce a player error until copied into place.

`server.py` serves supported local media files with HTTP byte-range support, so seeking/streaming uses the same path as the verified KeroTV MP4 test.

## KeroTV subtitle overlay

KeroTV now has its own ES5-compatible SRT renderer. Subtitles are **not** embedded into the MP4 and are not delegated to the Sony DLNA player.

The playback path is:

`H.264 MP4 -> browser video element`  
`SRT -> KeroTV server -> UTF-8 normalization -> JavaScript cue parser -> on-screen overlay`

The server accepts UTF-8 SRT and also falls back to Windows Turkish `CP1254` (plus CP1252) before serving subtitle text as UTF-8.

Two Subtitle Lab entries are exposed on Home:

- **H.264 + SRT Proof** uses the already verified `media/kerotv-test.mp4` plus `subtitles/kerotv-h264-proof.srt`.
- **Age of Ultron · H.264 + SRT** expects:
  - `media/age-of-ultron-h264.mp4`
  - `subtitles/age-of-ultron.srt`

The Age of Ultron files stay local and are not committed to GitHub.

## Remote-first custom media player

KeroTV no longer depends on the browser's native video controls for the main playback UX. Video decoding remains native, but transport, subtitles, fullscreen and remote interaction are owned by KeroTV.

Player controls:
- Left / Right: seek -10 / +10 seconds
- OK: play/pause or activate the highlighted control
- Up / Down: move across the custom control strip
- Subtitle - / +: adjust subtitle size from 30px to 80px; the preference is stored locally
- Back: leave playback
- Fullscreen: KeroTV fullscreen keeps subtitle and custom controls in the same layer

On Sony pointer-style remotes, KeroTV attempts Pointer Lock in fullscreen. If the browser supports it, directional input keeps producing relative motion even when the hidden pointer would otherwise hit a screen edge.

## Picture modes and graphics-plane diagnostics

The player now has a persistent **Fit / Zoom** picture mode.

- **Fit** preserves the whole frame. Cinemascope sources such as 1920x800 will have letterbox bars on a 16:9 TV.
- **Zoom** fills the 16:9 screen without distortion, but crops the left and right sides of wider cinema content.

The player also reports source video resolution, browser UI viewport, screen-reported resolution, and device pixel ratio. This is used to distinguish native video-plane quality from the Sony/Vewd browser graphics plane. The general UI has been retuned with larger text and thicker primitives for a 720p-class TV graphics plane.
