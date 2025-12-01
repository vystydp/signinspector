# SignInspector

**Client-Side PDF Digital Signature Validator | BankID.cz | EU Trusted List | eIDAS | PKCS#7 | PAdES**

SignInspector is a browser-based library for validating digital signatures in PDF documents using **BankID.cz**, **EU Trusted List (eIDAS)**, **PKCS#7/CMS**, and **PAdES** standards. All validation happens **client-side** using the Web Crypto API—your PDFs never leave your device. Built with TypeScript and Svelte for secure, privacy-focused PDF signature verification.

![SignInspector Demo](./static/example.png)

## ✨ Features

- 🔒 **Client-Side Validation** - All processing happens in your browser
- ✅ **Integrity Checks** - Verify documents haven't been modified after signing
- 👤 **Signer Details** - View certificate information and signing metadata
- 📊 **Multiple Signatures** - Support for PDFs with multiple signatures
- 🎨 **Embeddable Viewer** - Easy-to-use viewer component for your web apps
- 🚀 **Zero Dependencies** - Lightweight with no external validation services
- 🔓 **Open Source** - MIT licensed

## 📦 Installation

```bash
npm install @signinspector/core
# or
pnpm add @signinspector/core
# or
yarn add @signinspector/core
```

## 🚀 Usage

### As a Viewer Component

Embed the viewer in your web application:

```typescript
import { SignInspectorViewer } from '@signinspector/core';

// Create viewer instance
const viewer = SignInspectorViewer.create(
  document.getElementById('viewer-container'),
  {
    autoResize: true,
    watermark: true,
    theme: 'light'
  }
);

// Load a PDF file
const fileInput = document.getElementById('pdf-input');
fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  viewer.setDocument(file);
});

// Listen to validation events
viewer.on('validationComplete', (result) => {
  console.log('Validation result:', result);
});
```

### As a Validation Library

Use the core validation functions directly:

```typescript
import { validatePdfBytes, validatePdfFile } from '@signinspector/core';

// Validate from Uint8Array
const pdfBytes = new Uint8Array(/* ... */);
const result = await validatePdfBytes(pdfBytes);

console.log('Overall status:', result.overallStatus);
console.log('Signatures found:', result.signatureCount);
console.log('Document modified:', result.documentModified);

result.signatures.forEach((sig, idx) => {
  console.log(`Signature ${idx + 1}:`);
  console.log('  Signer:', sig.signerName);
  console.log('  Status:', sig.status);
  console.log('  Signed at:', sig.signedAt);
});

// Or validate from File object
const file = document.getElementById('input').files[0];
const result = await validatePdfFile(file);
```

## 📖 API Reference

### SignInspectorViewer

Main viewer class for embedding signature inspection UI.

**Methods:**

- `static create(container: HTMLElement, options?: Partial<ISignInspectorViewerOptions>): SignInspectorViewer`
  - Creates a new viewer instance
- `setDocument(source: Uint8Array | File): Promise<void>`
  - Load and validate a PDF document
- `clear(): void`
  - Clear the viewer content
- `getOptions(): ISignInspectorViewerOptions`
  - Get current viewer options
- `getResult(): ValidationResult | undefined`
  - Get the current validation result
- `on(event: SignInspectorEvent, callback: Function): () => void`
  - Subscribe to events (returns unsubscribe function)
- `off(event: SignInspectorEvent, callback: Function): void`
  - Unsubscribe from events
- `destroy(): void`
  - Clean up and destroy the viewer

**Events:**

- `validationComplete` - Fired when validation finishes
- `documentLoaded` - Fired when a document is loaded
- `signatureSelected` - Fired when a signature is selected

### Validation Functions

- `validatePdfBytes(bytes: Uint8Array): Promise<ValidationResult>`
- `validatePdfFile(file: File): Promise<ValidationResult>`
- `isPdfFile(bytes: Uint8Array): boolean`
- `getStatusText(status: ValidationStatus): string`
- `getStatusColor(status: ValidationStatus): string`

### Types

See [API Documentation](./static/docs/index.html) for full type definitions.

## 🎯 Example

Check out the [live demo](https://signinspector.app) to see SignInspector in action.

## 🏗️ Development

### Prerequisites

- Node.js >= 18
- pnpm >= 8

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Run tests
pnpm run test

# Run integration tests
pnpm run test:integration

# Build library
pnpm run build:lib

# Build demo app
pnpm run build
```

### Scripts

- `pnpm run dev` - Start Vite dev server
- `pnpm run build` - Build library and demo app
- `pnpm run build:lib` - Build library only
- `pnpm run test` - Run unit tests
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:integration` - Run Playwright integration tests
- `pnpm run lint` - Lint code with ESLint
- `pnpm run fmt` - Format code with Prettier
- `pnpm run check` - Type-check Svelte components
- `pnpm run check:all` - Run all checks (lint, format, type-check, test)
- `pnpm run doc` - Generate API documentation
- `pnpm run release` - Create a new release with standard-version

## 🧪 Testing

SignInspector includes comprehensive test coverage:

- **Unit Tests** (Vitest) - Core library functionality
- **Integration Tests** (Playwright) - End-to-end demo app testing

Place test PDF files in `static/examples/` for testing.

## 📝 How It Works

1. **PDF Parsing** - Extracts signature dictionaries and `/ByteRange` data
2. **CMS/PKCS#7 Parsing** - Decodes signature containers and certificates
3. **Signature Verification** - Validates cryptographic signatures using Web Crypto API
4. **Integrity Check** - Verifies document hasn't been modified after signing
5. **Certificate Validation** - Checks certificate validity dates and trust chain

> **Note:** This is a client-side implementation. For production use, consider:
> - Certificate revocation checking (OCSP/CRL)
> - Trusted root certificate validation
> - Timestamp authority verification
> - Additional security hardening

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🌟 Highlights 

- **Security‑focused front‑end architecture** – Fully client‑side PDF signature validation (no file uploads), with clear separation between parsing, cryptography, trust evaluation, and UI layers.
- **Modern TypeScript & SvelteKit stack** – Strong typing across the codebase, Svelte components for the viewer, Playwright/Vitest test suites, and Vite/Tailwind for fast, accessible UI.
- **Standards‑aware signature validation** – Parses PDF `/ByteRange` and CMS/PKCS#7 structures, checks cryptographic integrity, inspects certificate chains, and surfaces human‑readable validation results.
- **Engineering for reliability** – Automated scripts for building, testing, linting, formatting, and generating docs; integration tests cover real signed PDFs in a demo app.
- **Product and UX thinking** – Multi‑language interface, embeddable viewer component, and clear messaging about integrity, trust, and current limitations to support real‑world legal and financial workflows.

## 🙏 Acknowledgments

- Inspired by [Mycelium](https://github.com/kkrysztofiak/ml-mycelium) network visualizer architecture
- Built with [Svelte](https://svelte.dev) and [TypeScript](https://www.typescriptlang.org)
- Uses [Vite](https://vitejs.dev) for build tooling
- Styled with [Tailwind CSS](https://tailwindcss.com)

## 📮 Support

- 🐛 [Report a bug](https://github.com/vystydp/signinspector/issues)
- 💡 [Request a feature](https://github.com/vystydp/signinspector/issues)
- 💬 [Discussions](https://github.com/vystydp/signinspector/discussions)

---

**Made with ❤️ by the SignInspector contributors**
