# Contributing to SignInspector

Thank you for your interest in contributing to SignInspector! We welcome contributions from the community.

## 🤝 Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) before contributing.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/signinspector.git
   cd signinspector
   ```
3. **Install dependencies**:
   ```bash
   pnpm install
   ```
4. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/my-new-feature
   ```

## 💻 Development Workflow

### Running the Development Server

```bash
pnpm run dev
```

This starts the Vite dev server at `http://localhost:5173`.

### Running Tests

```bash
# Unit tests
pnpm run test

# Watch mode
pnpm run test:watch

# Integration tests
pnpm run test:integration
```

### Code Quality

Before submitting a PR, ensure your code passes all checks:

```bash
pnpm run check:all
```

This runs:
- ESLint (linting)
- Prettier (formatting)
- Svelte-check (type checking)
- Vitest (unit tests)

### Building

```bash
# Build library
pnpm run build:lib

# Build demo app
pnpm run build
```

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Example:
```bash
git commit -m "feat: add support for encrypted PDFs"
git commit -m "fix: correct signature validation for long documents"
```

## 🔍 Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new features
3. **Ensure all tests pass**: `pnpm run check:all`
4. **Update CHANGELOG.md** if making significant changes
5. **Create a Pull Request** with a clear description

### PR Title Format

Use the same format as commit messages:
```
feat: add OCSP revocation checking
fix: handle malformed certificate extensions
```

## 🐛 Reporting Bugs

When reporting bugs, please include:

- **Description** - Clear description of the issue
- **Steps to reproduce** - How to reproduce the bug
- **Expected behavior** - What should happen
- **Actual behavior** - What actually happens
- **Environment** - Browser, OS, Node version
- **Sample PDF** (if possible) - Attach or link to a problematic PDF

## 💡 Feature Requests

We welcome feature requests! Please:

1. Check if the feature already exists or has been requested
2. Describe the feature clearly
3. Explain the use case
4. Consider implementation complexity

## 📚 Documentation

Documentation improvements are always welcome:

- **README.md** - Main documentation
- **API docs** - TypeDoc comments in source code
- **Examples** - Add usage examples

## 🧪 Testing Guidelines

- Write tests for all new features
- Ensure existing tests pass
- Aim for high code coverage
- Test edge cases and error handling

### Test File Locations

- Unit tests: `src/lib/**/*.test.ts`
- Integration tests: `tests/**/*.test.ts`

## 🏗️ Project Structure

```
signinspector/
├── src/
│   ├── lib/              # Core library code
│   │   ├── index.ts      # Main exports
│   │   ├── types.ts      # TypeScript types
│   │   ├── pdf.ts        # PDF parsing
│   │   ├── cms.ts        # CMS/PKCS#7 validation
│   │   ├── validator.ts  # Validation orchestrator
│   │   ├── viewer.ts     # Viewer class
│   │   ├── events.ts     # Event system
│   │   └── std.ts        # Utilities
│   ├── routes/           # Demo app routes (SvelteKit)
│   └── app.css           # Global styles
├── static/               # Static assets
├── tests/                # Integration tests
└── docs/                 # Generated API documentation
```

## 🔐 Security

If you discover a security vulnerability, please email the maintainers directly rather than opening a public issue.

## ❓ Questions?

- Open a [Discussion](https://github.com/vystydp/signinspector/discussions)
- Check existing [Issues](https://github.com/vystydp/signinspector/issues)

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to SignInspector! 🎉
