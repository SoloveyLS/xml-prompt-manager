XML Prompt Manager 0.1.1

Windows (64 bit, Windows 10/11):
  Extract the ZIP and double-click xml-prompt-manager.exe.
  Python is bundled; no separate Python installation is needed.
  To pin it, right-click the EXE and choose Pin to Start, or create a
  desktop shortcut using Send to > Desktop (show more options on Windows 11).
  Keep the extracted folder in a permanent location before making shortcuts.

Linux (x86_64, Ubuntu 22.04 or newer / compatible glibc 2.35+ desktop):
  Extract the tar.gz and run ./xml-prompt-manager.
  Optional: run ./install-linux.sh to install a user application menu entry
  and desktop shortcut. The extracted folder must stay in place afterwards.
  No separate Python installation is needed.

The launcher opens the app in your default browser at
http://127.0.0.1:13031/xml_prompt_manager.html
Keep the small launcher window open; Quit stops its local server.
Opening the launcher again reuses an existing instance.
The editor and its bundled styles work offline. AI features need a reachable
provider and your own API configuration. Browser restrictions still apply
to direct AI provider requests, as they do in the web version.

Prompts, templates and settings remain in your browser profile's local storage.
Use the same browser, profile and address to retain them across updates.
Export templates before moving to another browser or machine.
Command-line options: --port NUMBER, --headless, --no-browser.

Windows may show SmartScreen because these binaries are not code-signed.
Source and releases: https://github.com/SoloveyLS/xml-prompt-manager
