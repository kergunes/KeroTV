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

