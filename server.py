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
import os
import socket
import socketserver
import urllib.request


PORT = int(os.environ.get("KEROTV_PORT", "8000"))
ROOT = os.path.dirname(os.path.abspath(__file__))
MEDIA_DIR = os.path.join(ROOT, "media")
MEDIA_FILE = os.path.join(MEDIA_DIR, "kerotv-test.mp4")
MEDIA_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"


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
        if self._is_media_request():
            self._serve_media(False)
        else:
            super().do_HEAD()

    def do_GET(self):
        if self._is_media_request():
            self._serve_media(True)
        else:
            super().do_GET()

    def _is_media_request(self):
        return self.path.split("?", 1)[0] == "/media/kerotv-test.mp4"

    def _serve_media(self, send_body):
        if not os.path.exists(MEDIA_FILE):
            self.send_error(404, "KeroTV test media is not cached on the PC")
            return

        size = os.path.getsize(MEDIA_FILE)
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
        self.send_header("Content-Type", "video/mp4")
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

        with open(MEDIA_FILE, "rb") as source:
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
    print("")
    print("Keep this window open while testing on the TV.")
    print("Press Ctrl+C to stop.")
    print("")

    with ReusableTCPServer(("0.0.0.0", PORT), NoCacheHandler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nKeroTV server stopped.")
