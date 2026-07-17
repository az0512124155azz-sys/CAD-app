# Quick Start Guide

Get AI Screen Control running in 5 minutes!

## For End Users (Installation)

### 1. Download
- Go to [Releases](https://github.com/az0512124155azz-sys/CAD-app/releases)
- Download for your OS:
  - **Windows**: `AIScreenControl-Setup.exe`
  - **macOS**: `AIScreenControl.dmg`
  - **Linux**: `AIScreenControl.AppImage`

### 2. Install
**Windows**: Double-click and follow the wizard  
**macOS**: Open DMG, drag to Applications  
**Linux**: `chmod +x AIScreenControl.AppImage && ./AIScreenControl.AppImage`

### 3. Get API Key
Choose one:
- **Claude**: [console.anthropic.com/keys](https://console.anthropic.com/account/keys)
- **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
- **Gemini**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### 4. Configure
1. Launch the app
2. Click Settings ⚙️
3. Paste your API key
4. Save

### 5. Use!
- 📸 Click camera to screenshot
- 💬 Type your question
- 🚀 Hit Send

**Done!** You're ready to go.

---

## For Developers (Building from Source)

### 1. Clone & Install
```bash
# Clone the repo
git clone https://github.com/az0512124155azz-sys/CAD-app.git
cd CAD-app/ai-screen-control

# Install dependencies
npm install
```

### 2. Start Development
```bash
npm run tauri-dev
```

The app will launch in development mode with hot reload.

### 3. Make Changes
- **Frontend**: Edit files in `src/` → auto-reloads
- **Backend**: Edit `src-tauri/src/` → rebuild required

### 4. Build Installers
```bash
npm run tauri-build
```

Find installers in `src-tauri/target/release/bundle/`

---

## Troubleshooting

### "API key not working"
- ✅ Verify no extra spaces
- ✅ Check API has credits
- ✅ Verify correct API endpoint

### "Screenshot failed"
**Linux**: `sudo apt-get install gnome-screenshot`  
**Windows**: Ensure Windows is updated  
**macOS**: Grant screen recording permission

### "Port 5173 in use"
```bash
# Kill the process
# macOS/Linux
lsof -i :5173 | grep LISTEN | awk '{print $2}' | xargs kill -9

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### "npm install failed"
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

---

## Next Steps

- 📖 Read [README.md](./README.md) for features
- 🛠️ Check [SETUP.md](./SETUP.md) for detailed setup
- 🏗️ See [ARCHITECTURE.md](./ARCHITECTURE.md) for how it works
- 🔗 Browse [website/](./website/) for installer page

---

## Key Shortcuts

| Action | Windows/Linux | macOS |
|--------|---------------|-------|
| Screenshot | Ctrl+Shift+S | Cmd+Shift+S |
| Send Message | Enter | Enter |
| DevTools | Ctrl+Shift+I | Cmd+Option+I |

---

## Common Commands

```bash
# Development
npm run tauri-dev          # Start dev server
npm run build              # Build frontend only
npm run preview            # Preview build

# Production
npm run tauri-build        # Create installers
npm run tauri -- --help    # Tauri help

# Maintenance
npm install                # Install dependencies
npm update                 # Update dependencies
npm cache clean --force    # Clear cache
```

---

## What's Next?

### Coming Soon
- 🎮 Screen control (click, type)
- 🎥 Video analysis (YouTube)
- ⚡ Advanced features

### You Can Help
- 🐛 Report bugs on GitHub
- 💡 Suggest features
- 📝 Contribute code

---

**Questions?** Check [SETUP.md](./SETUP.md) or open a [GitHub Issue](https://github.com/az0512124155azz-sys/CAD-app/issues)

**Happy coding!** 🚀
