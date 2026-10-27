"""Exercise the built executable over HTTP on its native build platform."""
import json
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

root = Path(__file__).resolve().parents[1]
exe = root / 'build' / 'desktop' / 'dist' / ('xml-prompt-manager.exe' if sys.platform == 'win32' else 'xml-prompt-manager')
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
base = f'http://127.0.0.1:{port}'

def stop(process):
    if sys.platform == 'win32':
        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)
    else:
        process.terminate()
    process.wait(timeout=10)


process = subprocess.Popen([str(exe), '--headless', '--no-browser', '--port', str(port)])
try:
    for _ in range(200):
        try:
            with urllib.request.urlopen(base + '/__app_health', timeout=1) as response:
                health = json.load(response)
            break
        except (OSError, urllib.error.URLError):
            if process.poll() is not None:
                raise RuntimeError(f'Executable exited with {process.returncode}')
            time.sleep(0.1)
    else:
        raise RuntimeError('Executable did not start')
    assert health == {'app': 'xml-prompt-manager', 'version': (root / 'VERSION').read_text().strip()}
    for path in ('xml_prompt_manager.html', 'style.css', 'script/script.js', 'assets/icon.png', 'assets/icon.ico', 'vendor/tailwind-browser-4.3.3.js'):
        with urllib.request.urlopen(base + '/' + path, timeout=5) as response:
            assert response.read() == (root / path).read_bytes(), path
    with urllib.request.urlopen(base + '/', timeout=5) as response:
        assert response.url.endswith('/xml_prompt_manager.html')
    for path in ('/.git/config', '/launcher.py', '/script/', '/assets/../VERSION'):
        try:
            urllib.request.urlopen(base + path, timeout=5)
        except urllib.error.HTTPError as error:
            assert error.code == 404
        else:
            raise AssertionError(f'Unexpected served file: {path}')
    subprocess.run([str(exe), '--headless', '--no-browser', '--port', str(port)], check=True, timeout=20)
    print('Standalone executable smoke checks passed.')
finally:
    stop(process)

if '--gui' in sys.argv:
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    base = f'http://127.0.0.1:{port}'
    process = subprocess.Popen([str(exe), '--no-browser', '--port', str(port)])
    try:
        for _ in range(200):
            try:
                with urllib.request.urlopen(base + '/__app_health', timeout=1) as response:
                    assert json.load(response)['app'] == 'xml-prompt-manager'
                break
            except (OSError, urllib.error.URLError):
                if process.poll() is not None:
                    raise RuntimeError(f'GUI launcher exited with {process.returncode}')
                time.sleep(0.1)
        else:
            raise RuntimeError('GUI launcher did not initialize')
        print('GUI launcher and icon initialization passed.')
    finally:
        stop(process)
