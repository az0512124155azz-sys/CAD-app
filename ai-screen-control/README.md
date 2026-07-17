# AI Screen Control

Universal AI Assistant for Screen Control & Analysis. Talk to your screen, control it with AI. Works with Claude, GPT, Gemini & more.

## Features

✨ **Screen Capture** - Take instant screenshots and ask AI about them  
💬 **AI Chat** - Chat with Claude, GPT, Gemini, and more  
🎮 **Screen Control** - Control mouse and keyboard with AI commands  
🎥 **Video Analysis** - Analyze YouTube videos and webcam feeds  
💻 **Code Generation** - Write and optimize code with AI assistance  
🔧 **Multi-API Support** - Use your favorite AI provider  
🔒 **Privacy First** - All processing local, optional cloud integration  

## Installation

### Windows
1. Download `AIScreenControl-Setup.exe`
2. Run the installer
3. Follow the installation wizard

### macOS
1. Download `AIScreenControl.dmg`
2. Open the DMG file
3. Drag AI Screen Control to Applications folder

### Linux
**Option 1: AppImage**
```bash
chmod +x AIScreenControl.AppImage
./AIScreenControl.AppImage
```

**Option 2: DEB Package**
```bash
sudo dpkg -i ai-screen-control.deb
```

## Quick Start

1. **Install** the application for your OS
2. **Get an API Key**:
   - Claude: [console.anthropic.com](https://console.anthropic.com/account/keys)
   - OpenAI: [platform.openai.com](https://platform.openai.com/api-keys)
   - Google Gemini: [aistudio.google.com](https://aistudio.google.com/app/apikey)

3. **Launch** AI Screen Control
4. **Settings** → Paste your API key
5. **Screenshot** → Ask questions!

## Usage

### Taking Screenshots
- Click the camera button in the floating bubble
- Or use: `Ctrl+Shift+S` (Windows/Linux) / `Cmd+Shift+S` (macOS)

### Asking Questions
- Type any question about what's on your screen
- Examples:
  - "What's the title of this page?"
  - "Who won the game?"
  - "Summarize this article"
  - "What's the error in this code?"

### Screen Control
- Ask AI to perform actions:
  - "Click the blue button"
  - "Type hello world"
  - "Scroll down"
  - "Close this tab"

### Video Analysis
- Open a YouTube video
- Ask AI to analyze it (requires Gemini API)
- "What's the main topic of this video?"
- "Summarize the key points"

## Configuration

### Supported APIs
- **Claude** (Recommended) - Best for general tasks
- **OpenAI GPT-4** - Excellent for everything
- **Google Gemini** - Best for vision/video tasks
- **Anthropic Claude Haiku** - Fast & affordable

### Environment Variables
```bash
CLAUDE_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

## Privacy & Security

- ✅ Screenshots processed locally first
- ✅ Only sent to your chosen API provider
- ✅ No data stored on our servers
- ✅ API keys never logged or shared
- ✅ Open source - verify the code yourself

## Building from Source

### Requirements
- Node.js 18+
- Rust 1.70+
- npm or yarn

### Build Steps
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Build for your platform
npm run tauri-build
```

## Troubleshooting

### Screenshot not working?
- **Linux**: Install `gnome-screenshot` or `import` (ImageMagick)
- **Windows**: Ensure Windows is up to date
- **macOS**: Grant screen recording permission in Privacy Settings

### API Key not working?
- Verify the key is correct (no extra spaces)
- Check if you have API credits remaining
- Ensure the API endpoint is accessible

### Permission errors?
- Grant the application necessary permissions in system settings
- On macOS: System Preferences → Privacy & Security

## Development

### Project Structure
```
ai-screen-control/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── styles/            # CSS files
│   └── App.tsx            # Main app
├── src-tauri/            # Rust backend
│   ├── src/              # Rust code
│   └── Cargo.toml        # Rust dependencies
├── website/              # Installation website
└── vite.config.ts        # Vite config
```

### Running in Development
```bash
npm run tauri-dev
```

## Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - See LICENSE file

## Support

- 📧 Email: support@aiscreen.control
- 🐛 Issues: GitHub Issues
- 💬 Discussions: GitHub Discussions
- 🌐 Website: [aiscreen.control](https://aiscreen.control)

## Roadmap

- ✅ v1.0 - Core features (Screenshot, Chat, Settings)
- 🔜 v1.1 - Screen control (Mouse, Keyboard)
- 🔜 v1.2 - Video analysis (YouTube, Webcam)
- 🔜 v1.3 - Advanced features (Recording, Automation)
- 🔜 v2.0 - Plugin system & API

## Credits

Built with:
- [Tauri](https://tauri.app/) - Desktop framework
- [React](https://react.dev/) - UI library
- [Anthropic Claude](https://www.anthropic.com/) - AI API
- [Vite](https://vitejs.dev/) - Build tool

---

Made with ❤️ for AI enthusiasts
