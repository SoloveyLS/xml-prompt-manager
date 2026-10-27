"""Desktop entry point for the browser-based XML Prompt Manager."""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import socket
from pathlib import Path
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
import webbrowser

ROOT = Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent))
WEB = ROOT / 'web' if getattr(sys, 'frozen', False) else ROOT
VERSION = (WEB / 'VERSION').read_text().strip()
APP_ID = 'xml-prompt-manager'


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB), **kwargs)

    def do_GET(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        if path == '/__app_health':
            body = json.dumps({'app': APP_ID, 'version': VERSION}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        if path == '/':
            self.send_response(302)
            self.send_header('Location', '/xml_prompt_manager.html')
            self.end_headers()
            return
        super().do_GET()

    def send_head(self):
        path = urllib.parse.unquote(urllib.parse.urlsplit(self.path).path)
        parts = Path(path.lstrip('/')).parts
        allowed = {'xml_prompt_manager.html', 'style.css', 'script', 'assets', 'vendor'}
        if (not parts or parts[0] not in allowed
                or any(p.startswith('.') for p in parts)
                or not Path(self.translate_path(self.path)).is_file()):
            self.send_error(404)
            return None
        return super().send_head()

    def log_message(self, *_args):
        pass


class LocalServer(http.server.ThreadingHTTPServer):
    # Windows SO_REUSEADDR allows two active listeners on the same port.
    allow_reuse_address = sys.platform != 'win32'
    daemon_threads = True

    def server_bind(self):
        if sys.platform == 'win32':
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def main():
    parser = argparse.ArgumentParser(description='XML Prompt Manager desktop launcher')
    parser.add_argument('--port', type=int, default=13031)
    parser.add_argument('--headless', action='store_true', help='Run without the launcher window')
    parser.add_argument('--no-browser', action='store_true', help='Do not open the browser automatically')
    args = parser.parse_args()
    url = f'http://127.0.0.1:{args.port}/xml_prompt_manager.html'
    server = None
    try:
        server = LocalServer(('127.0.0.1', args.port), Handler)
    except OSError:
        try:
            with urllib.request.urlopen(f'http://127.0.0.1:{args.port}/__app_health', timeout=2) as response:
                running = json.load(response)
            if running.get('app') != APP_ID or running.get('version') != VERSION:
                raise ValueError('Different app or version')
        except (OSError, ValueError, urllib.error.URLError) as error:
            raise RuntimeError(f'Port {args.port} is already in use. Close that app or use --port NUMBER.') from error
        if not args.no_browser:
            webbrowser.open(url)
        return
    try:
        if args.headless:
            if not args.no_browser:
                threading.Timer(0.3, functools.partial(webbrowser.open, url)).start()
            print(f'XML Prompt Manager {VERSION}: {url}', flush=True)
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                pass
            return

        import tkinter as tk
        from tkinter import ttk
        window = tk.Tk(className='xml-prompt-manager')
        window.title('XML Prompt Manager')
        window.resizable(False, False)
        icon = tk.PhotoImage(file=str(WEB / 'assets' / 'icon.png'))
        window.iconphoto(True, icon)
        if sys.platform == 'win32':
            window.iconbitmap(str(WEB / 'assets' / 'icon.ico'))
        frame = ttk.Frame(window, padding=24)
        frame.pack()
        ttk.Label(frame, text='XML Prompt Manager', font=('', 16, 'bold')).pack(pady=(0, 8))
        ttk.Label(frame, text=f'Version {VERSION}').pack()
        ttk.Label(frame, text='Keep this window open while using the app.').pack(pady=(12, 4))
        ttk.Label(frame, text=url).pack(pady=(0, 16))
        ttk.Button(frame, text='Open app', command=lambda: webbrowser.open(url)).pack(fill='x')
        ttk.Button(frame, text='Quit', command=window.destroy).pack(fill='x', pady=(8, 0))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        if not args.no_browser:
            window.after(200, lambda: webbrowser.open(url))
        try:
            window.mainloop()
        finally:
            server.shutdown()
    finally:
        server.server_close()


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        if '--headless' in sys.argv:
            raise
        import tkinter as tk
        from tkinter import messagebox
        root = tk.Tk()
        root.withdraw()
        messagebox.showerror('XML Prompt Manager', str(error))
        root.destroy()
        sys.exit(1)
