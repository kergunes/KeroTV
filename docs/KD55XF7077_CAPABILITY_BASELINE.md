# Sony KD-55XF7077 — KeroTV V0 Capability Baseline

Date: 2026-09-13  
KeroTV V0 tested directly on the target television.

## Target

- Sony KD-55XF7077
- Linux-based Sony Smart TV
- VEWD / Opera browser family
- Non-Android platform

## Rendering / JavaScript

Observed working on the physical TV:

- KeroTV ES5-style shell boots successfully
- HTML/CSS UI renders correctly
- JavaScript execution is stable during V0 tests
- XHR available
- Fetch available
- Promises available
- localStorage available
- sessionStorage available
- WebSocket available
- requestAnimationFrame available
- Fullscreen API reported available
- Flexbox reported available
- CSS Grid: **not supported**

KeroTV should still keep a conservative compatibility floor. Modern APIs being present does not justify introducing a large modern framework/runtime without a reason.

## Remote control

Sony exposes the directional pad primarily as browser pointer/mouse movement rather than ordinary keyboard arrow events.

Verified KeroTV workaround:

- D-pad pointer motion can be translated into deterministic card focus
- OK / remote click is routed to the currently focused KeroTV item rather than the physical cursor target
- Back is captured through the KeroTV history guard
- Back from a panel returns to the KeroTV home screen rather than immediately leaving the page

This pointer-emulation bridge is part of the target-device input layer and must be preserved in V1.

## Persistence

Manual physical-TV test:

- Storage test: **PASS**
- localStorage read/write: supported
- sessionStorage read/write: supported

## Networking

Manual physical-TV test:

- Same-origin XMLHttpRequest: **PASS**
- Direct HTTPS media request: **PASS**

The TV is therefore capable of both local-network application traffic and direct HTTPS media retrieval for the tested source.

## Video / codecs

Browser capability probe:

- H.264 / MP4: `probably`
- WebM VP8: **NO**
- Native HLS: `maybe` from `canPlayType()`, but real playback failed
- HEVC: `probably`

Physical playback tests:

- LAN-served H.264/MP4: **PASS**
- Direct HTTPS H.264/MP4: **PASS**
- Native HLS (.m3u8 via HTML5 video): **FAIL — MEDIA_ERR_SRC_NOT_SUPPORTED (code 4)**

### V1 playback baseline

Primary supported path:

**H.264 video in MP4 over HTTP/HTTPS**

Do not assume native HLS support even when `canPlayType()` returns `maybe`.

HLS can be revisited later through one of these optional paths:

1. Media Source Extensions + a compatible HLS transmuxer/player, if this exact browser supports the required MSE subset.
2. Server-side remux/transmux/proxy into a format the TV already plays reliably.
3. A source-specific alternative MP4 representation.

Native HLS is not required to begin V1.

## Platform hints

Observed capability probe:

- HbbTV user-agent hint: **NO**
- OIPF object factory: **YES**
- OIPF application manager: **NO**
- VEWD / Opera hint: **YES**

OIPF is therefore an optional future investigation surface, not a V1 dependency.

## V0 conclusion

The built-in-browser architecture is viable.

The physical KD-55XF7077 has demonstrated the minimum capabilities required for a real KeroTV application:

- stable web UI rendering;
- controllable remote-first navigation through a Sony pointer compatibility layer;
- working persistence;
- working XHR/networking;
- working H.264/MP4 playback over both LAN HTTP and direct HTTPS;
- working application-level Back behavior.

### V1 direction

KeroTV V1 should stop being a capability probe and become a real TV application:

**Home → content cards/rows → Detail → Player → Back**

Constraints to preserve:

- TV-first 10-foot UI
- deterministic focus navigation
- Sony pointer-emulation input adapter
- conservative JS/CSS compatibility
- H.264/MP4 as the known-good playback baseline
- no CSS Grid dependency
- no native-HLS dependency
