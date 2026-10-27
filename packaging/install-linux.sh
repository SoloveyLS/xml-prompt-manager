#!/bin/sh
set -eu
APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APPS_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/applications"
mkdir -p "$APPS_DIR"
python3 - "$APP_DIR" "$APPS_DIR" <<'PY'
from pathlib import Path
import subprocess
import sys
app, apps = map(Path, sys.argv[1:])
def quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('`', '\\`').replace('$', '\\$') + '"'
entry = apps / 'xml-prompt-manager.desktop'
entry.write_text('[Desktop Entry]\nType=Application\nName=XML Prompt Manager\n'
    + 'Exec=' + quote(app / 'xml-prompt-manager') + '\n'
    + 'Icon=' + str(app / 'icon.png') + '\nTerminal=false\n'
    + 'Categories=Development;\nStartupWMClass=xml-prompt-manager\n')
try:
    desktop = Path(subprocess.check_output(['xdg-user-dir', 'DESKTOP'], text=True).strip())
    if desktop.is_dir():
        shortcut = desktop / entry.name
        shortcut.write_bytes(entry.read_bytes())
        shortcut.chmod(0o755)
        subprocess.run(['gio', 'set', str(shortcut), 'metadata::trusted', 'true'], check=False)
except FileNotFoundError:
    pass
print('Installed XML Prompt Manager. You can pin it from the application menu.')
PY
