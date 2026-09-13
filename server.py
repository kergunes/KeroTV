#!/usr/bin/env python3
"""
KeroTV V0 local static server.

No third-party packages are required.
Run:
    python server.py

Then open the printed LAN URL in the TV browser.
"""

import http.server
import os
import socket
import socketserver


PORT = int(os.environ.get("KEROTV_PORT", "8000"))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


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
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    ip = discover_lan_ip()

    print("")
    print("KeroTV V0 server")
    print("----------------")
    print("PC: http://127.0.0.1:{0}".format(PORT))
    print("TV: http://{0}:{1}".format(ip, PORT))
    print("")
    print("Keep this window open while testing on the TV.")
    print("Press Ctrl+C to stop.")
    print("")

    with ReusableTCPServer(("0.0.0.0", PORT), NoCacheHandler) as server:
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nKeroTV server stopped.")
