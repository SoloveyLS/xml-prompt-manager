Standalone desktop packages for the current XML Prompt Manager web app.

- Linux x86_64: extract the tar.gz, then run `xml-prompt-manager`. Optional application menu and desktop shortcut installer included.
- Windows 10/11 x64: extract the ZIP, then open `xml-prompt-manager.exe`.
- Approved app icon included in the launcher, executable, browser tab and packages.
- Bundled Python runtime and styles; no Python installation or CDN access required.
- Launcher opens the app at `http://127.0.0.1:13031/xml_prompt_manager.html` and provides Open app / Quit controls.
- Existing instances are reused; other applications occupying the port produce a clear error.

Keep the launcher window open while using the app. Settings remain in the browser profile; use the same browser and address to retain them. AI requests still require your configured provider. Windows binaries are unsigned. Linux packages target Ubuntu 22.04 or newer / compatible glibc 2.35+ systems.

`SHA256SUMS.txt` contains checksums for the downloadable packages. Both executables receive HTTP and bundled-asset smoke checks on their native GitHub runners before publication.
