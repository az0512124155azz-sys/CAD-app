# Architecture Documentation

## System Overview

AI Screen Control is a cross-platform desktop application that provides a unified interface for AI-powered screen analysis and control.

### Technology Stack

```
┌─────────────────────────────────────────────────┐
│              React Frontend (Vite)              │
│  - Floating Bubble UI                           │
│  - Chat Interface                               │
│  - Settings Panel                               │
└────────────┬────────────────────────────────────┘
             │ IPC (Tauri Invoke)
┌────────────▼────────────────────────────────────┐
│            Tauri Backend (Rust)                 │
│  - Screenshot Capture                           │
│  - API Integration                              │
│  - Screen Control (Mouse/Keyboard)              │
│  - Window Management                            │
└────────────┬────────────────────────────────────┘
             │ HTTP/HTTPS
┌────────────▼────────────────────────────────────┐
│         External AI APIs                        │
│  - Claude API (Anthropic)                       │
│  - OpenAI API                                   │
│  - Google Gemini API                            │
└─────────────────────────────────────────────────┘
```

## Core Components

### 1. Frontend Layer (React + TypeScript)

#### FloatingBubble Component
- Draggable UI element with menu
- Always accessible, minimal footprint
- Expands to show screenshot and settings buttons
- Badge showing message count

```typescript
// Key props
- onScreenshot: () => void
- onSettings: () => void
- messageCount: number
```

#### ChatInterface Component
- Main chat window with message history
- Screenshot preview
- Input field with send button
- Message display with timestamps
- Loading states

```typescript
// Key features
- Message threading
- Screenshot attachment
- Auto-scroll to latest message
- Keyboard shortcuts (Enter to send)
```

#### SettingsPanel Component
- API key configuration
- Model selection
- Feature toggles
- Information display

```typescript
// Managed data
- API keys (encrypted in localStorage)
- Preferred model
- Feature flags
```

### 2. Backend Layer (Rust + Tauri)

#### Commands Module
- `screenshot`: Captures screen using platform-specific tools
- `send_to_ai`: Sends requests to AI APIs
- `control_mouse`: Moves mouse, clicks buttons
- `control_keyboard`: Types text, presses keys
- `get_window_info`: Returns system information

#### Platform Implementations

**Linux (using xdotool + gnome-screenshot)**
```rust
screenshot() -> PNG file
control_mouse(x, y, button) -> void
control_keyboard(keys, text) -> void
```

**Windows (using PowerShell + Windows APIs)**
```rust
screenshot() -> PNG file (via GDI+)
control_mouse(x, y, button) -> void (via user32)
control_keyboard(keys, text) -> void (via SendKeys)
```

**macOS (using native APIs)**
```rust
screenshot() -> PNG file (screencapture)
control_mouse(x, y, button) -> void (Quartz)
control_keyboard(keys, text) -> void (CGEvent)
```

### 3. Data Flow

```
User Input
    ↓
React Component
    ↓
Tauri Invoke (IPC)
    ↓
Rust Backend
    ↓
System APIs / Network
    ↓
Response
    ↓
React State Update
    ↓
UI Render
```

## Feature Architecture

### Phase 1: Foundation (Current)
- ✅ Screenshot capture
- ✅ AI chat integration
- ✅ Settings management
- ✅ Floating bubble UI
- ✅ Multi-platform support

### Phase 2: Screen Control (Planned)
- 🔜 Mouse movement and clicks
- 🔜 Keyboard input
- 🔜 Window management
- 🔜 Action confirmation UI

### Phase 3: Advanced Analysis (Planned)
- 🔜 Video analysis (YouTube)
- 🔜 Real-time monitoring
- 🔜 OCR text extraction
- 🔜 Object detection

### Phase 4: Automation (Planned)
- 🔜 Task recording and playback
- 🔜 Workflow automation
- 🔜 Scheduled tasks
- 🔜 Plugin system

## API Integration Architecture

### Supported Providers

```
┌──────────────────────────────┐
│      API Provider            │
├──────────────────────────────┤
│ Anthropic Claude             │
│ - Model: claude-3-5-sonnet   │
│ - Vision: ✓ Supported        │
│ - Cost: ~$3/1M input tokens  │
└──────────────────────────────┘

┌──────────────────────────────┐
│      OpenAI GPT              │
│ - Model: gpt-4-vision        │
│ - Vision: ✓ Supported        │
│ - Cost: ~$10/1M input tokens │
└──────────────────────────────┘

┌──────────────────────────────┐
│    Google Gemini             │
│ - Model: gemini-2.0-flash    │
│ - Vision: ✓ Supported        │
│ - Cost: ~$1.25/1M tokens     │
└──────────────────────────────┘
```

### Request/Response Flow

```
Client App
    ↓
[Format Request]
    ├─ Question
    ├─ Screenshot (base64)
    ├─ API Key
    └─ Model Name
    ↓
[Send HTTP Request]
    ↓
AI API Endpoint
    ↓
[Parse Response]
    ├─ Status Code
    ├─ Content
    └─ Error Handling
    ↓
Update UI with Response
```

## State Management

### Local Storage
```javascript
{
  claude_api_key: "sk-ant-...",
  openai_api_key: "sk-...",
  gemini_api_key: "...",
  preferred_model: "claude-3-5-sonnet",
  chat_history: [...],
  settings: {...}
}
```

### React State
```typescript
// App.tsx
- messages: Message[]
- input: string
- loading: boolean
- apiKey: string
- screenshot: string | null
- isBubbleVisible: boolean
```

## Security Architecture

### Authentication
- API keys stored in browser localStorage (encrypted at rest)
- Keys never logged or sent to external servers
- User responsible for API key security

### Data Privacy
- Screenshots only sent to user's selected API
- No intermediate servers or logging
- Optional offline mode (future)

### Encryption
- TLS 1.3+ for API communications
- localStorage encryption (browser-native)
- No sensitive data in logs

## Performance Architecture

### Optimization Strategies

1. **Code Splitting**
   - React components lazy-loaded
   - Separate bundles for main app and website

2. **Caching**
   - API responses cached locally
   - Screenshot cache (5 minutes)

3. **Memory Management**
   - Message history limit (100 messages)
   - Screenshot cleanup after upload

4. **Asset Optimization**
   - SVG icons (Lucide React)
   - CSS minification
   - Image compression

## Deployment Architecture

### Installation Channels

```
┌─────────────────────────────┐
│   Release Management        │
├─────────────────────────────┤
│ GitHub Releases             │
│ ├─ v1.0.0                  │
│ ├─ Windows .exe             │
│ ├─ macOS .dmg               │
│ └─ Linux .AppImage + .deb   │
└──────┬──────────────────────┘
       │
┌──────▼──────────────────────┐
│   Website Installer         │
├─────────────────────────────┤
│ aiscreen.control            │
│ ├─ Download page            │
│ ├─ Setup guides             │
│ └─ Documentation            │
└─────────────────────────────┘
```

### Update Strategy
- Check for updates on app launch
- User-initiated updates (no auto-update)
- Version stored in `tauri.conf.json`

## Error Handling

### Categories

```
User Errors (Recoverable)
- Invalid API key
- Network timeout
- Missing screenshot

System Errors (Handle gracefully)
- Permission denied
- Out of disk space
- Plugin load failure

Fatal Errors (Crash & report)
- Corrupted config
- Incompatible OS
- Rust panic
```

### Error Flow
```
Error Occurs
    ↓
Log to Console
    ↓
Send to UI
    ↓
Show Error Message
    ↓
Suggest Action
    ↓
Log for Debugging
```

## Future Enhancements

### Short Term (3 months)
- [ ] Screen control implementation
- [ ] Video analysis with Gemini
- [ ] Better error messages
- [ ] Analytics dashboard

### Medium Term (6 months)
- [ ] Plugin system
- [ ] Custom workflows
- [ ] Team collaboration
- [ ] Advanced caching

### Long Term (12 months)
- [ ] Offline mode
- [ ] Self-hosted option
- [ ] Mobile companion app
- [ ] AI model training

## Testing Strategy

### Unit Tests
- Component rendering
- API integration
- Error handling

### Integration Tests
- Screenshot + API
- Settings persistence
- Multi-platform compatibility

### E2E Tests
- Complete workflows
- UI interactions
- Cross-platform execution

## Monitoring & Analytics (Optional)

Future: Non-intrusive telemetry
- Feature usage (opt-in)
- Error reporting (opt-in)
- Performance metrics (opt-in)

---

## Quick Reference

### Key Files
- **Main App**: `src/App.tsx`
- **UI Components**: `src/components/`
- **Backend**: `src-tauri/src/commands.rs`
- **Config**: `src-tauri/tauri.conf.json`

### Important Concepts
- **IPC**: Inter-Process Communication (Tauri ↔ Rust)
- **State**: React component state management
- **Commands**: Tauri commands that invoke Rust functions

### Common Tasks
- Add new feature: Create component + add Tauri command
- Fix bug: Identify if frontend or backend, then fix
- Deploy: Run `npm run tauri-build` for installers

---

For more details, see:
- [README.md](./README.md) - Feature overview
- [SETUP.md](./SETUP.md) - Development setup
- [Source Code](./src/) - Implementation details
