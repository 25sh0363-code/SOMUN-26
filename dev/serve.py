#!/usr/bin/env python3
"""Static server for local verification — 127.0.0.1:3000, SPA fallback, no cache.
Lives in tracked dev/ so sandbox resets can't wipe it (scripts/ was gitignored)."""
import http.server
import os
import socketserver

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        path = self.translate_path(self.path.split("?")[0])
        if not os.path.exists(path) and "." not in os.path.basename(path):
            self.path = "/index.html"  # hash-router deep links land on the app
        return super().send_head()


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == "__main__":
    with Server(("127.0.0.1", 3000), Handler) as httpd:
        print("serving on http://127.0.0.1:3000")
        httpd.serve_forever()
