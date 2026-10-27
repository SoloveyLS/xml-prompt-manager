# XML Prompt Builder

A modern web application for crafting and managing XML-tagged prompts optimized for AI models.

## Features

- Live XML Editor: Real-time tag synchronization and auto-completion
- Template System: Save and reuse structure and field templates
- AI-Powered Analysis: Generate questions and analyze prompt interpretation
- Multi-Provider Support: OpenAI, Anthropic, Google AI, Ollama, and custom provider integration
- VSCode-Inspired UX: Resizable panels, keyboard shortcuts, dark theme

## Quick Start

1. **Open in Browser**: Navigate to the project directory and run:
   ```bash
   python -m http.server 8000
   ```
   Then open `http://localhost:8000/xml_prompt_manager.html`

2. **Configure AI**: Switch to the "API Setup" tab and configure your preferred AI provider

3. **Start Building**: Use `<>` to auto-create XML tags, save templates, and analyze with AI

## Keyboard Shortcuts

- `Tab` - Insert indentation (4 spaces)
- `Ctrl`+`/` - Toggle bottom panel
- `Alt`+`Up/Down` - Move selected line(s) up/down
- `Space` - Convert to underscore in tag names

## AI Integration

### Supported Providers
- OpenAI - GPT models
- Anthropic - Claude models
- Google AI - Gemini models
- Ollama - Local models
- Custom providers

### Usage
1. Configure your API settings in the "API Setup" tab
2. Write/edit XML prompts in the main editor
3. Use "Questions" tab to generate improvement suggestions
4. Use "Understanding" tab to analyze how models interpret your prompts

## Template System

**Structure Templates**: Save complete prompt skeletons for reuse
**Field Templates**: Save individual XML field components
- Click templates to use them instantly
- Right-click templates to delete them
- Export/import templates to/from files

## Tips

- XML tags automatically sync (editing opening tag updates closing tag)
- Multi-line selection + Tab indents all lines
- All settings persist between sessions
- Bottom panel is resizable like VSCode's terminal area

## Desktop releases (Linux and Windows)

Download the package for your platform from [Releases](https://github.com/SoloveyLS/xml-prompt-manager/releases). Extract it before launching. Python is bundled.

- **Windows 10/11 x64:** double-click `xml-prompt-manager.exe`. You can create a desktop shortcut or pin the executable to Start.
- **Linux x86_64 (Ubuntu 22.04+ or compatible glibc 2.35+):** run `./xml-prompt-manager`. Optionally run `./install-linux.sh` for an application menu entry and desktop shortcut (the installer uses system Python 3). Keep the extracted folder in place.

The launcher opens your default browser at `http://127.0.0.1:13031/xml_prompt_manager.html`. Keep its small status window open; **Quit** stops the local server. Reopening reuses the running app. Windows executables include the app icon but are unsigned.

The editor's styles are bundled for offline use. AI requests require a reachable provider; browser CORS restrictions continue to apply. Prompts, templates and settings stay in your browser profile: use the same browser, profile and address to retain them across updates.

### Run the launcher from source

```sh
python launcher.py
# Server only:
python launcher.py --headless --no-browser
```

Python 3.10+ is required; the GUI launcher uses Tkinter. Plain web serving as shown above still works. Optional arguments: `--port NUMBER`, `--no-browser`, `--headless`.

### Build native packages

Use Python 3.12 on the target operating system:

```sh
python -m pip install pyinstaller==6.16.0 pyinstaller-hooks-contrib==2026.9
python packaging/build.py
python packaging/smoke.py --gui
```

Archives are written to `dist/`. Tagging a version (`v` followed by `VERSION`) builds Linux and Windows packages on native GitHub Actions runners, checks both executables and launcher windows, and publishes them with SHA-256 checksums. Linux GUI smoke checks need a display or `xvfb-run -a`.

The generated app icon is included in `assets/`. Tailwind browser runtime 4.3.3 and its MIT license are bundled in `vendor/`.
