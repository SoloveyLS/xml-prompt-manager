"""Build a standalone desktop executable and platform archive."""
from pathlib import Path
import platform
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
VERSION = (ROOT / 'VERSION').read_text().strip()
WINDOWS = sys.platform == 'win32'
OS = 'windows' if WINDOWS else 'linux'
ARCH = 'x86_64' if platform.machine().lower() in ('amd64', 'x86_64') else platform.machine().lower()
WORK = ROOT / 'build' / 'desktop'
WEB = WORK / 'web'
shutil.rmtree(WORK, ignore_errors=True)
WEB.mkdir(parents=True)
for name in ('xml_prompt_manager.html', 'style.css', 'VERSION'):
    shutil.copy2(ROOT / name, WEB / name)
for name in ('script', 'assets', 'vendor'):
    shutil.copytree(ROOT / name, WEB / name, ignore=shutil.ignore_patterns('*.backup', '__pycache__'))
subprocess.run([
    sys.executable, '-m', 'PyInstaller', '--noconfirm', '--clean', '--onefile', '--windowed',
    '--name', 'xml-prompt-manager', '--icon', str(ROOT / 'assets' / 'icon.ico'),
    '--add-data', f'{WEB}:web', '--distpath', str(WORK / 'dist'),
    '--workpath', str(WORK / 'pyinstaller'), '--specpath', str(WORK),
    str(ROOT / 'launcher.py'),
], check=True, cwd=ROOT)
name = f'xml-prompt-manager-{VERSION}-{OS}-{ARCH}'
package = WORK / name
package.mkdir()
exe = 'xml-prompt-manager.exe' if WINDOWS else 'xml-prompt-manager'
shutil.copy2(WORK / 'dist' / exe, package / exe)
shutil.copy2(ROOT / 'packaging' / 'README.txt', package / 'README.txt')
shutil.copy2(ROOT / 'assets' / 'icon.png', package / 'icon.png')
shutil.copy2(ROOT / 'vendor' / 'TAILWIND-LICENSE.txt', package / 'TAILWIND-LICENSE.txt')
python_license = Path(sys.base_prefix) / 'LICENSE.txt'
if python_license.exists():
    shutil.copy2(python_license, package / 'PYTHON-LICENSE.txt')
if not WINDOWS:
    shutil.copy2(ROOT / 'packaging' / 'install-linux.sh', package / 'install-linux.sh')
    (package / 'install-linux.sh').chmod(0o755)
    (package / exe).chmod(0o755)
out = ROOT / 'dist'
out.mkdir(exist_ok=True)
archive = shutil.make_archive(str(out / name), 'zip' if WINDOWS else 'gztar', WORK, name)
print(archive)
