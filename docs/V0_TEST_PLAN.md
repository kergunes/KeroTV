# KeroTV V0 Test Plan

Target: **Sony KD-55XF7077**

The purpose of V0 is to learn the TV's actual capability floor before committing to the application architecture.

## Before the TV test

On a PC on the same network:

1. Pull/clone `kergunes/KeroTV`.
2. Open a terminal in the repository.
3. Run `python server.py`.
4. Keep the terminal open.
5. The server prints a LAN address such as `http://192.168.1.20:8000`.

If Windows Firewall asks, allow Python on the **Private network** only.

## Pass A — Boot and rendering

Open the LAN URL in the Sony browser.

Record:

- Does the KeroTV screen appear?
- Is text readable from normal viewing distance?
- Do all six tiles render?
- Are there obvious layout overlaps or clipping?
- Does the clock update?
- Does the Compatibility tile say DONE?

A blank page is high-priority evidence. Photograph any browser error.

## Pass B — Remote navigation

Without using a mouse or keyboard:

1. Press Left / Right.
2. Press Up / Down.
3. Confirm the orange focus border moves.
4. Press OK on **Remote input**.
5. Press every useful remote button you can find.

Especially test:

- Up
- Down
- Left
- Right
- OK
- Return / Back
- Play
- Pause
- Stop
- Red
- Green
- Yellow
- Blue

Take a photo of the Remote input log.

Important: an unknown keyCode is not a failure. It tells us how to map the Sony remote.

## Pass C — Storage

Open **Storage**.

Record:

- localStorage result
- sessionStorage result

At least one PASS is preferred, but both failing does not kill the project. It changes the future persistence design.

## Pass D — Network

Open **Network**.

Expected result: same-origin XHR can download `README.md`.

If it fails, photograph the exact message. This distinguishes a browser API limitation from an HTTPS/TLS media problem.

## Pass E — Video

Open **Video** and press **Start MP4 test**.

Record:

- H.264/MP4 result from Compatibility
- whether metadata loads
- decoded resolution
- whether playback actually starts
- media error code if it fails
- whether video is smooth enough for normal viewing

The sample is intentionally remote HTTPS media. A failure here can be caused by TLS/network even if the TV decoder supports H.264.

## Pass F — Final report

After all tests:

1. Open **Report**.
2. Capture the complete report, ideally as photos/screenshots.
3. Also capture any strange browser chrome, warnings or input behavior.

This report determines V1.

## V0 → V1 decision

### Green path

Proceed to the real KeroTV shell if:

- the page renders reliably;
- remote navigation is controllable;
- XHR works;
- H.264/MP4 playback works.

### Yellow path

Still viable with architecture changes if:

- Fetch/Promises/Grid are missing;
- only one storage API works;
- Back is intercepted by the TV;
- HLS/HEVC/WebM are unsupported.

These are expected on an older TV.

### Red path

Reconsider the built-in-browser architecture if:

- JavaScript execution is fundamentally unstable;
- D-pad/OK never reaches the page and focus cannot be controlled;
- same-origin HTTP requests are unusable;
- practical video playback cannot be achieved.

If the red path occurs, the next investigation is HbbTV/OIPF surface availability, then external-device fallback—not random Android APK sideloading.
