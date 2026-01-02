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