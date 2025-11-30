# SignInspector Architecture

## Overview

SignInspector follows a clean, layered architecture that separates core validation logic from UI concerns. This makes the codebase maintainable, testable, and reusable.

## Directory Structure

```
src/
├── lib/
│   ├── core/                    # Framework-agnostic validation logic
│   │   ├── pdf/                 # PDF parsing and extraction
│   │   │   ├── parser.ts        # PdfParser class, signature extraction
│   │   │   └── types.ts         # PDF-specific types (ExtractedSignature, DocumentMetadata)
│   │   ├── cms/                 # CMS/PKCS#7 signature validation
│   │   │   ├── cms.ts           # Lightweight CMS parser
│   │   │   ├── cms-pkijs.ts    # PKI.js-based CMS validation
│   │   │   └── oids.ts          # OID constants and mappings
│   │   ├── trust/               # Certificate trust evaluation
│   │   │   ├── trust.ts         # Trust lookup functions
│   │   │   └── trusted-roots.eu.ts  # EU Trusted List snapshot
│   │   ├── integrity/           # Document integrity analysis
│   │   │   └── integrity.ts     # ByteRange + revision analysis
│   │   ├── validation/          # Validation orchestration
│   │   │   ├── validator.ts     # Main validation logic
│   │   │   └── mapping.ts       # Core → UI status mapping
│   │   ├── types.ts             # Core validation types
│   │   └── index.ts             # Core API exports
│   │
│   ├── ui/                      # UI components and viewer
│   │   ├── viewer.ts            # SignInspectorViewer class
│   │   ├── components/          # Reusable Svelte components (future)
│   │   └── stores/              # Svelte stores (future)
│   │
│   ├── i18n/                    # Internationalization
│   │   └── i18n.ts              # Translation functions and stores
│   │
│   ├── config/                  # Configuration (future)
│   │   └── algorithm-policy.ts  # Algorithm security policies
│   │
│   ├── types.ts                 # UI-specific types (re-exports core types)
│   ├── events.ts                # Event emitter utility
│   ├── std.ts                   # Standard utilities (hex, hash, etc.)
│   └── index.ts                 # Main library exports
│
├── routes/                      # SvelteKit routes
│   ├── +layout.svelte           # Root layout with i18n
│   └── +page.svelte             # Main validator UI
│
└── app.d.ts                     # TypeScript declarations

tests/
├── unit/                        # Unit tests
│   ├── pdf.test.ts
│   ├── validator.test.ts
│   ├── std.test.ts
│   └── events.test.ts
└── fixtures/                    # Test PDF files
    ├── valid/                   # Valid signed PDFs
    ├── modified/                # Modified after signing
    ├── edge-cases/              # Edge cases (multiple sigs, unsigned, etc.)
    └── algorithms/              # Different crypto algorithms

static/
├── locales/                     # Translation JSON files
│   ├── en.json
│   ├── cs.json
│   ├── zh.json
│   └── ru.json
└── examples/                    # Sample signed PDFs
```

## Architectural Layers

### 1. Core Layer (`src/lib/core/`)

**Purpose**: Framework-agnostic validation logic that can be reused in any environment (browser, Node.js, etc.)

**Characteristics**:
- No UI dependencies
- No framework dependencies (except for i18n which is injected)
- Pure TypeScript/JavaScript
- Highly testable
- Can be published as standalone npm package

**Modules**:

- **`pdf/`**: PDF parsing, signature extraction, metadata reading
- **`cms/`**: CMS/PKCS#7 signature verification using Web Crypto API and PKI.js
- **`trust/`**: Certificate trust lookup against EU Trusted List
- **`integrity/`**: Dual-axis integrity analysis (bytes + revisions)
- **`validation/`**: Orchestrates all validation steps, produces `ValidationResult`

### 2. UI Layer (`src/lib/ui/`)

**Purpose**: User interface components and viewer API

**Characteristics**:
- Depends on core layer
- Svelte components
- Event-driven architecture
- Embeddable viewer widget

**Components** (future):
- `UploadArea.svelte` - File upload zone
- `StatusBanner.svelte` - Overall validation status
- `SignatureCard.svelte` - Individual signature display
- `TrustDetails.svelte` - Certificate trust information
- `AlgorithmBadge.svelte` - Algorithm display with warnings

### 3. Internationalization (`src/lib/i18n/`)

**Purpose**: Multi-language support

**Features**:
- Browser language auto-detection
- Manual locale selection with localStorage persistence
- Lazy loading of translation files
- Svelte reactive stores for translations

**Supported Languages**:
- English (en)
- Czech (cs) - Primary EU market
- Chinese Simplified (zh)
- Russian (ru)

### 4. Routes Layer (`src/routes/`)

**Purpose**: SvelteKit application routes

**Current Routes**:
- `/` - Main validator interface
- Future: `/docs/`, `/faq/`

## Data Flow

```
User uploads PDF
      ↓
SignInspectorViewer (UI)
      ↓
validatePdfBytes (validation/)
      ↓
┌─────────────┬────────────────┬──────────────┐
│ PdfParser   │ validateCms    │ lookupTrust  │
│ (pdf/)      │ (cms/)         │ (trust/)     │
└─────────────┴────────────────┴──────────────┘
      ↓
analyzeIntegrity (integrity/)
      ↓
ValidationResult
      ↓
getStatusText/Color (mapping/)
      ↓
UI components display results
```

## Type System

### Core Types (`src/lib/core/types.ts`)

- `ValidationStatus` - Overall validation result
- `ValidationResult` - Complete validation output
- `SignatureInfo` - Individual signature details
- `CertificateInfo` - X.509 certificate data
- `ByteIntegrityStatus` - Cryptographic integrity (INTACT/CHANGED)
- `RevisionChangeType` - PDF revision analysis (NONE/MINOR/CONTENT)
- `TrustStatus` - Trust evaluation result
- `AlgorithmInfo` - Cryptographic algorithm details
- `PolicyWarning` - Security policy warnings

### PDF Types (`src/lib/core/pdf/types.ts`)

- `ExtractedSignature` - Raw signature data from PDF
- `DocumentMetadata` - PDF metadata (title, author, etc.)

### UI Types (`src/lib/types.ts`)

- `ISignInspectorViewerOptions` - Viewer configuration
- `IEventSignatureSelected` - Signature selection event
- `SignInspectorEvent` - Event types

## Testing Strategy

### Unit Tests (`tests/unit/`)

- Test core logic in isolation
- No UI dependencies
- Fast execution
- High coverage

### E2E Tests (`tests/e2e/`) - Future

- Playwright for full browser testing
- Test user workflows
- Visual regression testing

### Test Fixtures (`tests/fixtures/`) - Future

- Canonical signed PDFs
- Valid EU signatures
- Modified documents
- Edge cases

## Import Patterns

### For Core Modules

```typescript
// Import core validation
import { validatePdfBytes } from '$lib/core/validation/validator';

// Import types
import type { ValidationResult, SignatureInfo } from '$lib/core/types';

// Import PDF parsing
import { PdfParser } from '$lib/core/pdf/parser';

// Import CMS validation
import { validateCmsSignature } from '$lib/core/cms/cms-pkijs';

// Import trust lookup
import { lookupTrust } from '$lib/core/trust/trust';

// Import integrity analysis
import { analyzeIntegrity } from '$lib/core/integrity/integrity';
```

### For UI Components

```typescript
// Import viewer
import { SignInspectorViewer } from '$lib/ui/viewer';

// Import mapping helpers
import { getStatusText, getStatusColor } from '$lib/core/validation/mapping';
```

### For Utilities

```typescript
// Import utilities
import { hexToBytes, sha256 } from '$lib/std';
import { EventEmitter } from '$lib/events';
```

### For i18n

```typescript
// Import translation functions
import { t, tStore, setLocale } from '$lib/i18n/i18n';
```

## Build Output

The project builds to:
- `build/` - Static site (GitHub Pages)
- `.svelte-kit/output/` - SvelteKit intermediate output
- `static/docs/` - TypeDoc API documentation

## Completed Enhancements

### ✅ UI Components Extraction

Extracted reusable components from `+page.svelte`:
- ✅ `<UploadArea>` - Drag & drop file upload
- ✅ `<LanguageSelector>` - Multi-language selector with flags
- ✅ `<BankIdBanner>` - Localized BankID.cz promotion
- ✅ `<FeatureGrid>` - Feature showcase grid
- 📋 `<StatusBanner>` - Overall validation display (future)
- 📋 `<SignatureCard>` - Individual signature component (future)
- 📋 `<TrustDetails>` - Certificate trust visualization (future)
- 📋 `<AlgorithmBadge>` - Algorithm display with security warnings (future)

### ✅ Test Fixtures Structure

Created `tests/fixtures/`:
- ✅ `valid/` - Sample PDFs with valid signatures
- ✅ `modified/` - PDFs modified after signing
- ✅ `edge-cases/` - Edge cases (multiple sigs, unsigned, corrupted)
- ✅ `algorithms/` - Different cryptographic algorithms
- 📋 Add actual PDF samples (awaiting test documents)

### Future Enhancements

#### Configuration Module

Create `src/lib/config/`:
- `algorithm-policy.ts` - Define weak/strong algorithm policies
- `app-config.ts` - Application-wide settings

#### Additional Components

- `<StatusBanner>` - Overall validation status display
- `<SignatureCard>` - Individual signature information card
- `<TrustDetails>` - Detailed certificate trust panel
- `<AlgorithmBadge>` - Algorithm badge with security indicators

### Stores Architecture

Create `src/lib/ui/stores/`:
- `validationStore.ts` - Centralized validation state
- `settingsStore.ts` - User preferences

## Benefits of This Architecture

1. **Separation of Concerns**: Core logic independent of UI
2. **Testability**: Easy to unit test pure functions
3. **Reusability**: Core can be used in Node.js, browser, or CLI
4. **Maintainability**: Clear module boundaries
5. **Scalability**: Easy to add new features without conflicts
6. **Type Safety**: Comprehensive TypeScript types throughout
7. **Documentation**: Self-documenting structure

## Migration Notes

The restructuring moved:
- `src/lib/pdf.ts` → `src/lib/core/pdf/parser.ts`
- `src/lib/cms.ts` → `src/lib/core/cms/cms.ts`
- `src/lib/cms-pkijs.ts` → `src/lib/core/cms/cms-pkijs.ts`
- `src/lib/trust.ts` → `src/lib/core/trust/trust.ts`
- `src/lib/trusted-roots.ts` → `src/lib/core/trust/trusted-roots.eu.ts`
- `src/lib/validator.ts` → `src/lib/core/validation/validator.ts`
- `src/lib/viewer.ts` → `src/lib/ui/viewer.ts`
- `src/lib/i18n.ts` → `src/lib/i18n/i18n.ts`
- Test files → `tests/unit/`

All imports have been updated accordingly.
