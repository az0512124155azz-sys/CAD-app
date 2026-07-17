# Contributing to AI Screen Control

Thank you for your interest in contributing! We welcome contributions of all kinds.

## Code of Conduct

- Be respectful and inclusive
- Welcome diverse perspectives
- Focus on constructive feedback
- No harassment or discrimination

## How to Contribute

### Reporting Bugs

1. **Check existing issues** - Avoid duplicates
2. **Create a detailed report** with:
   - OS and version
   - App version
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/logs
3. **Be patient** - We'll respond soon

### Suggesting Features

1. **Check roadmap** - It might be planned
2. **Open an issue** with:
   - Clear title
   - Problem description
   - Proposed solution
   - Use cases
3. **Vote on features** - Help us prioritize

### Contributing Code

#### Setup
```bash
# Fork the repo
git clone https://github.com/YOUR_USERNAME/CAD-app.git
cd CAD-app/ai-screen-control

# Install dependencies
npm install

# Create a branch
git checkout -b feature/your-feature
```

#### Development
```bash
# Start dev server
npm run tauri-dev

# Make changes to src/ or src-tauri/src/
# Changes auto-reload (frontend) or require rebuild (backend)

# Test thoroughly
npm run build
```

#### Quality Standards

- **Code style**: Follow existing patterns
- **Comments**: Explain complex logic only
- **Tests**: Add tests for new features
- **Types**: Use TypeScript
- **Performance**: No significant slowdowns

#### Commit Message Format
```
Brief description of change

Longer explanation if needed.
- Bullet point 1
- Bullet point 2

Fixes #123
```

#### Pull Request Process

1. **Before starting**
   - Check issues for similar work
   - Comment on issue to avoid duplication

2. **While working**
   - Write clean, tested code
   - Keep commits organized
   - Update documentation
   - Follow code style

3. **When ready**
   - Push to your fork
   - Open a pull request with:
     - Clear title
     - Description of changes
     - Screenshots/gifs if UI changes
     - Fixes #issue_number
   - Address review feedback
   - Rebase if needed

4. **After approval**
   - Maintainers will merge
   - Your changes live in next release!

### Documentation

Help improve docs:
- Fix typos
- Add examples
- Improve clarity
- Translate guides
- Create tutorials

### Testing

Test on multiple platforms:
- Windows 10/11
- macOS 12+
- Linux (Ubuntu 20.04+)

Report issues found:
- Performance problems
- Compatibility issues
- UI inconsistencies

---

## Development Guidelines

### Frontend (React/TypeScript)

```typescript
// Components should:
- Be functional (hooks)
- Have descriptive names
- Accept typed props
- Be reusable

// Example:
interface MyComponentProps {
  title: string;
  onAction?: () => void;
  disabled?: boolean;
}

export default function MyComponent({
  title,
  onAction,
  disabled = false,
}: MyComponentProps) {
  // Implementation
}
```

### Backend (Rust)

```rust
// Functions should:
- Be async when appropriate
- Return Result types
- Have clear error messages
- Be well-documented

// Example:
#[tauri::command]
pub async fn my_command(input: String) -> Result<String, String> {
  // Implementation
  Ok(result)
}
```

### CSS

```css
/* Styles should:
- Use CSS variables
- Follow BEM naming
- Be responsive
- Support dark mode

Example:
.my-component {
  background: var(--primary);
  padding: var(--spacing);
}
```

---

## Project Structure

```
ai-screen-control/
├── src/                  # React components
├── src-tauri/           # Rust backend
├── website/             # Installation website
├── docs/                # Documentation
├── public/              # Static assets
└── tests/               # Test files
```

---

## Building & Testing

```bash
# Development build
npm run tauri-dev

# Production build
npm run tauri-build

# Type checking
npx tsc --noEmit

# Linting (when added)
npm run lint

# Tests (when added)
npm run test
```

---

## Areas We Need Help

### High Priority
- 🎮 Screen control implementation
- 🎥 Video analysis features
- 📝 Documentation improvements
- 🐛 Bug fixes

### Medium Priority
- 🎨 UI/UX improvements
- ⚡ Performance optimization
- 🔍 Code quality
- 📚 Tutorial creation

### Low Priority
- 🌍 Translations
- 📱 Mobile support
- 🎁 Optional features

---

## Review Process

Pull requests are reviewed for:

1. **Correctness**
   - Does it work?
   - Are there bugs?
   - Is error handling proper?

2. **Quality**
   - Is code clean?
   - Are there tests?
   - Is it documented?

3. **Performance**
   - Any slowdowns?
   - Memory usage?
   - Network impact?

4. **Compatibility**
   - Works on all platforms?
   - No breaking changes?
   - Backward compatible?

---

## Getting Help

- 📖 Read [SETUP.md](./SETUP.md) - Setup guide
- 🏗️ Read [ARCHITECTURE.md](./ARCHITECTURE.md) - How it works
- 💬 GitHub Discussions - Ask questions
- 🐛 GitHub Issues - Report problems

---

## Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- GitHub contributors page

---

## Legal

By contributing, you agree to license your contributions under the MIT License.

---

## Questions?

- Open an issue
- Ask in Discussions
- Email support@aiscreen.control

**Thank you for contributing!** 🚀
