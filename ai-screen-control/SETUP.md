# Developer Setup Guide

Complete guide to set up and run AI Screen Control from source.

## Prerequisites

### Required
- **Node.js** 18.0.0 or higher
- **npm** 8.0.0 or higher
- **Rust** 1.70.0 or higher
- **Cargo** (installed with Rust)

### Optional
- **Git** (for version control)
- **Visual Studio Code** (recommended IDE)

### Platform-Specific Requirements

#### Windows
- Windows 7 or higher
- Visual C++ Build Tools (for Rust compilation)
- [Download from Microsoft](https://visualstudio.microsoft.com/visual-cpp-build-tools/)

#### macOS
- macOS 10.13 (High Sierra) or higher
- Xcode Command Line Tools:
  ```bash
  xcode-select --install
  ```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev
```

#### Linux (Fedora/RHEL)
```bash
sudo dnf install -y \
  gcc \
  g++ \
  make \
  openssl-devel \
  gtk3-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel
```

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/az0512124155azz-sys/CAD-app.git
cd CAD-app/ai-screen-control
```

### 2. Install Node Dependencies
```bash
npm install
```

This installs:
- React & React DOM
- Tauri CLI & API
- Vite (build tool)
- TypeScript
- Lucide React (icons)

### 3. Install Rust Dependencies
```bash
cargo fetch
```

## Development

### Start Development Server
```bash
npm run tauri-dev
```

This command:
1. Starts the Vite dev server on http://localhost:5173
2. Compiles the Rust backend
3. Launches the Tauri desktop application
4. Enables hot module reloading for React code

**Expected output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  press h to show help

✔ Finished Tauri Core build
```

### Build for Production
```bash
npm run tauri-build
```

This will:
1. Build React production bundle
2. Compile Rust backend (optimized)
3. Create installer for your platform:
   - Windows: `MSI` installer
   - macOS: `DMG` file
   - Linux: `AppImage` + `DEB` package

**Build artifacts location:**
- Windows: `src-tauri/target/release/bundle/msi/`
- macOS: `src-tauri/target/release/bundle/dmg/`
- Linux: `src-tauri/target/release/bundle/appimage/` + `deb/`

## Configuration

### Environment Variables
Create a `.env` file in the project root:

```bash
# Optional: Default API provider (claude, openai, gemini)
VITE_DEFAULT_API=claude

# Optional: API key (for testing, not recommended for production)
VITE_API_KEY=sk-ant-...
```

### Tauri Configuration
Edit `src-tauri/tauri.conf.json`:

```json
{
  "build": {
    "devUrl": "http://localhost:5173",
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "AI Screen Control",
      "width": 400,
      "height": 500
    }]
  }
}
```

## Development Workflow

### 1. Make Changes
- Frontend: Edit files in `src/`
- Backend: Edit files in `src-tauri/src/`
- Website: Edit files in `website/`

### 2. Hot Reload (Frontend Only)
The Vite dev server automatically reloads React changes.

### 3. Rebuild Rust (If Changed)
```bash
npm run tauri-build
```

### 4. Test
```bash
npm run build
npm run preview
```

### 5. Deploy
```bash
npm run tauri-build
```

## Project Structure

```
ai-screen-control/
├── src/
│   ├── components/
│   │   ├── FloatingBubble.tsx      # Draggable bubble UI
│   │   ├── ChatInterface.tsx       # Main chat window
│   │   └── SettingsPanel.tsx       # Settings modal
│   ├── styles/
│   │   ├── FloatingBubble.css
│   │   ├── ChatInterface.css
│   │   └── SettingsPanel.css
│   ├── App.tsx                     # Main React app
│   ├── App.css
│   └── main.tsx                    # React entry point
│
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                 # Tauri entry point
│   │   └── commands.rs             # Tauri commands
│   ├── Cargo.toml                  # Rust dependencies
│   ├── build.rs
│   └── tauri.conf.json             # Tauri config
│
├── website/
│   ├── index.html                  # Landing page
│   ├── styles.css
│   └── script.js
│
├── index.html                      # Vite entry point
├── vite.config.ts                  # Vite config
├── tsconfig.json                   # TypeScript config
├── package.json                    # Node dependencies
├── README.md                        # Project README
└── SETUP.md                         # This file
```

## Troubleshooting

### npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Rust compilation errors
```bash
# Update Rust
rustup update

# Clean build
cargo clean
npm run tauri-build
```

### Port 5173 already in use
```bash
# Change port in vite.config.ts
# Or kill the process using the port

# macOS/Linux
lsof -i :5173
kill -9 <PID>

# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Screenshot not working
- **Linux**: `sudo apt-get install gnome-screenshot`
- **Windows**: Check Windows is up to date
- **macOS**: Grant screen recording permission

### API request fails
1. Check API key is valid
2. Check internet connection
3. Check API endpoint is accessible
4. Review API quota usage

## Testing

### Unit Tests (Coming Soon)
```bash
npm run test
```

### E2E Tests (Coming Soon)
```bash
npm run test:e2e
```

### Manual Testing Checklist
- [ ] Screenshot capture works
- [ ] Chat sends messages
- [ ] API key saves correctly
- [ ] Settings panel opens
- [ ] Floating bubble is draggable
- [ ] Window resizes correctly

## Performance Tips

1. **Development**: Use fast mode
   ```bash
   npm run tauri-dev -- --fast
   ```

2. **Build**: Enable optimizations
   ```bash
   npm run tauri-build -- --release
   ```

3. **Code splitting**: Vite auto-splits large chunks

## Debugging

### Browser DevTools
- In development: `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (macOS)
- Inspect elements, check console for errors

### Rust Debugging
- Set `RUST_LOG=debug` environment variable
- Check console output in development server

### Network Debugging
- Use browser DevTools Network tab
- Check API requests and responses

## Next Steps

1. **Read the README.md** for feature documentation
2. **Check website/** for installation instructions
3. **Review src/App.tsx** to understand app structure
4. **Explore src-tauri/src/commands.rs** for backend functionality

## Getting Help

- 📖 [Tauri Docs](https://tauri.app/v1/guides/getting-started/prerequisites)
- 🔍 [React Docs](https://react.dev)
- 🦀 [Rust Book](https://doc.rust-lang.org/book/)
- 💬 [GitHub Issues](https://github.com/az0512124155azz-sys/CAD-app/issues)

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make changes
4. Test thoroughly
5. Submit a pull request

---

Happy coding! 🚀
