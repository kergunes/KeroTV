#!/usr/bin/env python3
"""
KeroTV V0 local static server.

No third-party packages are required.
Run:
    python server.py

Then open the printed LAN URL in the TV browser.

V0.0.4 also caches a known H.264/MP4 test clip locally so the TV's
decoder can be tested independently from its old HTTPS/TLS stack.
"""

import http.server
import json
import os
import socket
import socketserver
import urllib.request
import unicodedata


PORT = int(os.environ.get("KEROTV_PORT", "8000"))
ROOT = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(ROOT, "media")
SUBTITLE_DIR = os.path.join(ROOT, "subtitles")
WINDOWS_DIR = os.environ.get("WINDIR", r"C:\Windows")
SUBTITLE_FONT_FILE = os.environ.get(
    "KEROTV_SUBTITLE_FONT",
    os.path.join(WINDOWS_DIR, "Fonts", "arial.ttf")
)
MEDIA_FILE = os.path.join(MEDIA_DIR, "kerotv-test.mp4")
MEDIA_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
MEDIA_TYPES = {
    ".mp4": "video/mp4",
    ".m4v": "video/mp4",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
}


def ensure_test_media():
    if os.path.exists(MEDIA_FILE) and os.path.getsize(MEDIA_FILE) > 10000:
        print("Media probe: cached ({0} bytes)".format(os.path.getsize(MEDIA_FILE)))
        return True

    if not os.path.isdir(MEDIA_DIR):
        os.makedirs(MEDIA_DIR)

    print("Media probe: downloading current H.264 sample to PC...")
    request = urllib.request.Request(
        MEDIA_URL,
        headers={"User-Agent": "KeroTV-V0/0.0.4"}
    )

    try:
        response = urllib.request.urlopen(request, timeout=30)
        try:
            with open(MEDIA_FILE, "wb") as target:
                while True:
                    block = response.read(64 * 1024)
                    if not block:
                        break
                    target.write(block)
        finally:
            response.close()

        size = os.path.getsize(MEDIA_FILE)
        print("Media probe: ready ({0} bytes)".format(size))
        return size > 10000
    except Exception as error:
        print("Media probe: download failed: {0}".format(error))
        try:
            if os.path.exists(MEDIA_FILE):
                os.remove(MEDIA_FILE)
        except OSError:
            pass
        return False


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Accept-Ranges", "bytes")
        super().end_headers()

    def do_HEAD(self):
        if self._is_cursor_request():
            self._serve_cursor(False)
        elif self._is_font_request():
            self._serve_font(False)
        elif self._is_media_request():
            self._serve_media(False)
        elif self._is_subtitle_request():
            self._serve_subtitle(False)
        else:
            super().do_HEAD()

    def do_GET(self):
        if self._is_cursor_request():
            self._serve_cursor(True)
        elif self._is_font_request():
            self._serve_font(True)
        elif self._is_media_request():
            self._serve_media(True)
        elif self._is_subtitle_request():
            self._serve_subtitle(True)
        else:
            super().do_GET()

    def _is_cursor_request(self):
        return self.path.split("?", 1)[0] == "/assets/blank-cursor.gif"

    def _serve_cursor(self, send_body):
        # Deliberately visible 32x32 red GIF for the physical Sony cursor test.
        # If the on-screen pointer turns into this red square, CSS custom cursors work.
        payload = bytes([
            71,73,70,56,55,97,32,0,32,0,129,0,0,255,0,0,0,0,0,0,0,0,0,0,0,
            44,0,0,0,0,32,0,32,0,64,8,53,0,1,8,28,72,176,160,193,131,8,19,42,
            92,200,176,161,195,135,16,35,74,156,72,177,162,197,139,24,51,106,
            220,200,177,163,199,143,32,67,138,28,73,178,164,201,147,40,83,170,
            92,201,82,100,64,0,59
        ])
        self.send_response(200)
        self.send_header("Content-Type", "image/gif")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        if send_body:
            self.wfile.write(payload)

    def _is_font_request(self):
        return self.path.split("?", 1)[0] == "/fonts/kerotv-arial.ttf"

    def _serve_font(self, send_body):
        if not os.path.exists(SUBTITLE_FONT_FILE):
            self.send_error(404, "KeroTV subtitle font not found on PC")
            return

        size = os.path.getsize(SUBTITLE_FONT_FILE)
        self.send_response(200)
        self.send_header("Content-Type", "font/ttf")
        self.send_header("Content-Length", str(size))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

        if send_body:
            with open(SUBTITLE_FONT_FILE, "rb") as source:
                while True:
                    chunk = source.read(64 * 1024)
                    if not chunk:
                        break
                    self.wfile.write(chunk)

    def _media_path(self):
        request_path = self.path.split("?", 1)[0]
        if not request_path.startswith("/media/"):
            return None

        filename = request_path[len("/media/"):]
        if not filename or "/" in filename or "\\" in filename or filename in (".", ".."):
            return None

        extension = os.path.splitext(filename)[1].lower()
        if extension not in MEDIA_TYPES:
            return None

        return os.path.join(MEDIA_DIR, filename)

    def _is_media_request(self):
        return self._media_path() is not None

    def _subtitle_path(self):
        request_path = self.path.split("?", 1)[0]
        if not request_path.startswith("/subtitles/"):
            return None

        filename = request_path[len("/subtitles/"):]
        if not filename or "/" in filename or "\\" in filename or filename in (".", ".."):
            return None

        extension = os.path.splitext(filename)[1].lower()
        if extension not in (".srt", ".vtt"):
            return None

        return os.path.join(SUBTITLE_DIR, filename)

    def _is_subtitle_request(self):
        return self._subtitle_path() is not None

    def _text_quality_score(self, text):
        bad_markers = ("Ã", "Ä", "Å", "Â", "�", "Ð", "Þ", "Ý")
        turkish = "çğıİöşüÇĞÖŞÜ"
        score = 0
        for marker in bad_markers:
            score -= text.count(marker) * 12
        for char in turkish:
            score += text.count(char) * 2
        score -= text.count("\x00") * 20
        return score

    def _repair_utf8_mojibake(self, text):
        candidates = [text]
        for encoding in ("cp1252", "cp1254", "latin-1"):
            try:
                repaired = text.encode(encoding).decode("utf-8")
                candidates.append(repaired)
            except (UnicodeEncodeError, UnicodeDecodeError):
                pass
        return max(candidates, key=self._text_quality_score)

    def _decode_subtitle(self, raw):
        candidates = []

        if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
            try:
                candidates.append(raw.decode("utf-16"))
            except UnicodeDecodeError:
                pass

        for encoding in ("utf-8-sig", "cp1254", "iso-8859-9", "cp1252", "latin-1"):
            try:
                decoded = raw.decode(encoding)
                candidates.append(decoded)
            except UnicodeDecodeError:
                pass

        if not candidates:
            return raw.decode("utf-8", errors="replace")

        decoded = max(candidates, key=self._text_quality_score)
        decoded = self._repair_utf8_mojibake(decoded)
        decoded = unicodedata.normalize("NFKC", decoded)
        return unicodedata.normalize("NFC", decoded)

    def _serve_subtitle(self, send_body):
        subtitle_path = self._subtitle_path()
        if not subtitle_path or not os.path.exists(subtitle_path):
            self.send_error(404, "KeroTV subtitle file not found")
            return

        with open(subtitle_path, "rb") as source:
            raw = source.read()

        normalized = self._decode_subtitle(raw).replace("\r\n", "\n").replace("\r", "\n")
        wants_json = "format=json" in self.path.split("?", 1)[-1]

        if wants_json:
            # ensure_ascii keeps the wire payload 7-bit ASCII. This avoids charset
            # bugs in older VEWD/Opera XHR implementations while JSON.parse restores
            # the exact Unicode Turkish characters in JavaScript.
            payload = json.dumps(normalized, ensure_ascii=True).encode("ascii")
            content_type = "application/json; charset=us-ascii"
        else:
            payload = normalized.encode("utf-8")
            content_type = "text/plain; charset=utf-8"

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()

        if send_body:
            self.wfile.write(payload)

    def _serve_media(self, send_body):
        media_path = self._media_path()
        if not media_path or not os.path.exists(media_path):
            self.send_error(404, "KeroTV media file not found")
            return

        extension = os.path.splitext(media_path)[1].lower()
        content_type = MEDIA_TYPES.get(extension, "application/octet-stream")
        size = os.path.getsize(media_path)
        start = 0
        end = size - 1
        partial = False
        range_header = self.headers.get("Range")

        if range_header and range_header.startswith("bytes="):
            requested = range_header[6:].split(",", 1)[0]
            parts = requested.split("-", 1)
            try:
                if parts[0]:
                    start = int(parts[0])
                if len(parts) > 1 and parts[1]:
                    end = int(parts[1])
                if start < 0 or start >= size:
                    raise ValueError("range start outside file")
                if end >= size:
                    end = size - 1
                if end < start:
                    raise ValueError("range end before start")
                partial = True
            except ValueError:
                self.send_response(416)
                self.send_header("Content-Range", "bytes */{0}".format(size))
                self.end_headers()
                return

        length = end - start + 1
        self.send_response(206 if partial else 200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        if partial:
            self.send_header(
                "Content-Range",
                "bytes {0}-{1}/{2}".format(start, end, size)
            )
        self.end_headers()

        if not send_body:
            return

        with open(media_path, "rb") as source:
            source.seek(start)
            remaining = length
            while remaining > 0:
                chunk = source.read(min(64 * 1024, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def discover_lan_ip():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("8.8.8.8", 80))
        return sock.getsockname()[0]
    except OSError:
        try:
            return socket.gethostbyname(socket.gethostname())
        except OSError:
            return "YOUR-PC-IP"
    finally:
        sock.close()


if __name__ == "__main__":
    os.chdir(ROOT)
    media_ready = ensure_test_media()
    ip = discover_lan_ip()

    print("")
    print("KeroTV V0 server")
    print("----------------")
    print("PC: http://127.0.0.1:{0}".format(PORT))
    print("TV: http://{0}:{1}".format(ip, PORT))
    print("LAN H.264 probe: {0}".format("READY" if media_ready else "NOT READY"))
    deadcells_av1 = os.path.join(MEDIA_DIR, "deadcells-av1.mp4")
    deadcells_h264 = os.path.join(MEDIA_DIR, "deadcells-h264.mp4")
    age_ultron_h264 = os.path.join(MEDIA_DIR, "age-of-ultron-h264.mp4")
    age_ultron_srt = os.path.join(SUBTITLE_DIR, "age-of-ultron.srt")
    print("Dead Cells AV1 test: {0}".format("READY" if os.path.exists(deadcells_av1) else "MISSING"))
    print("Dead Cells H.264 control: {0}".format("READY" if os.path.exists(deadcells_h264) else "MISSING"))
    print("Age of Ultron H.264: {0}".format("READY" if os.path.exists(age_ultron_h264) else "MISSING"))
    print("Age of Ultron SRT: {0}".format("READY" if os.path.exists(age_ultron_srt) else "MISSING"))
    print("Subtitle webfont: {0} ({1})".format(
        "READY" if os.path.exists(SUBTITLE_FONT_FILE) else "MISSING",
        SUBTITLE_FONT_FILE
    ))
    print("")
    print("Keep this window open while testing on the TV.")
    print("Press Ctrl+C to stop.")
    print("")

    with ReusableTCPServer(("0.0.0.0", PORT), NoCacheHandler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nKeroTV server stopped.")
