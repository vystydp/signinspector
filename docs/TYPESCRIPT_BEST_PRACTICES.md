# TypeScript Best Practices for SignInspector

This document outlines the TypeScript best practices implemented in SignInspector following 2025 standards.

## Table of Contents

- [TypeScript Configuration](#typescript-configuration)
- [Type Safety Rules](#type-safety-rules)
- [Discriminated Unions](#discriminated-unions)
- [Event System](#event-system)
- [Type Guards](#type-guards)
- [Best Practices Checklist](#best-practices-checklist)

## TypeScript Configuration

### Strict Settings (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  }
}
```

**Key Settings Explained:**

- **`strict: true`** - Enables all strict type checking options
- **`noUncheckedIndexedAccess: true`** - Array and object indexing returns `T | undefined`
- **`exactOptionalPropertyTypes: true`** - Optional properties cannot be set to `undefined` explicitly
- **`noImplicitReturns: true`** - Functions must return in all code paths
- **`noFallthroughCasesInSwitch: true`** - Switch statements must have breaks or returns
- **`noUncheckedSideEffectImports: true`** - Enforces proper type checking for side-effect imports

## Type Safety Rules

### ESLint Configuration

```javascript
{
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',
    '@typescript-eslint/prefer-nullish-coalescing': 'warn',
    '@typescript-eslint/prefer-optional-chain': 'warn'
  }
}
```

### No `any` Policy

**❌ Bad:**
```typescript
function processData(data: any) {
  return data.value;
}
```

**✅ Good:**
```typescript
function processData(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'value' in data) {
    const value = (data as { value: unknown }).value;
    if (typeof value === 'string') {
      return value;
    }
  }
  throw new Error('Invalid data structure');
}
```

### Using `unknown` for External Data

When dealing with external data (API responses, ASN.1 parsing, etc.), use `unknown` and narrow with type guards:

```typescript
// src/lib/core/cms/pkijs-extensions.ts
export function isASN1TimeValue(value: unknown): value is ASN1TimeValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof (value as ASN1TimeValue).toDate === 'function'
  );
}
```

## Discriminated Unions

### Validation States

Instead of using plain strings with optional fields, use discriminated unions for type-safe state handling:

**❌ Old Pattern:**
```typescript
interface ValidationResult {
  status: 'valid' | 'invalid';
  error?: string;
  data?: SomeData;
}

// Problem: Compiler doesn't enforce that error exists when status is 'invalid'
function handle(result: ValidationResult) {
  if (result.status === 'invalid') {
    console.log(result.error); // Could be undefined!
  }
}
```

**✅ New Pattern (Discriminated Union):**
```typescript
type ValidationResult =
  | { kind: 'valid'; data: SomeData; validatedAt: Date }
  | { kind: 'invalid'; error: string; reason: string };

// Compiler enforces correct field access
function handle(result: ValidationResult) {
  if (result.kind === 'invalid') {
    console.log(result.error); // Always defined!
  } else {
    console.log(result.data); // TypeScript knows this is the valid branch
  }
}
```

### Implemented Discriminated Unions

#### ByteIntegrityResult
```typescript
export type ByteIntegrityResult =
  | { kind: 'intact'; verifiedAt: Date }
  | { kind: 'changed'; reason: string; details?: string }
  | { kind: 'not-checked'; reason: string };
```

#### RevisionChangeResult
```typescript
export type RevisionChangeResult =
  | { kind: 'none'; message: string }
  | { kind: 'minor'; changes: string[]; message: string }
  | { kind: 'content'; changes: string[]; message: string; severity: 'warning' | 'error' }
  | { kind: 'unknown'; message: string };
```

#### TrustResult
```typescript
export type TrustResult =
  | { kind: 'trusted'; source: 'system' | 'eu-trust-list' | 'manual'; validatedAt: Date }
  | { kind: 'not-evaluated'; reason: string }
  | { kind: 'weak-algorithm'; algorithm: string; warnings: PolicyWarning[] }
  | { kind: 'unsupported-algorithm'; algorithm: string; oid?: string };
```

### Benefits

1. **Type Safety**: Compiler enforces that you handle all cases
2. **No Optional Chaining**: Fields are guaranteed to exist in each branch
3. **Exhaustive Checking**: TypeScript warns if you miss a case
4. **Self-Documenting**: States and their data are explicit

## Event System

### Type-Safe Events

The event system uses generics and mapped types for complete type safety:

```typescript
// Define event data mapping
export interface EventDataMap {
  signatureSelected: { index: number; signature: SignatureInfo };
  documentLoaded: { filename: string; size: number };
  validationComplete: { result: ValidationResult };
}

// Type-safe event callback
export type EventCallback<T extends SignInspectorEvent> = 
  (data: EventDataMap[T]) => void;

// Usage
viewer.on('validationComplete', (data) => {
  // TypeScript knows data is { result: ValidationResult }
  console.log(data.result.overallStatus);
});
```

### Implementation

```typescript
class EventEmitter {
  on<T extends SignInspectorEvent>(
    event: T,
    callback: EventCallback<T>
  ): () => void {
    // Implementation...
  }

  emit<T extends SignInspectorEvent>(
    event: T,
    data: EventDataMap[T]
  ): void {
    // Implementation enforces correct data type
  }
}
```

## Type Guards

### Creating Type Guards

Type guards provide runtime type checking with TypeScript integration:

```typescript
// src/lib/core/cms/pkijs-extensions.ts

export interface ECPublicKeyValue {
  namedCurve?: string;
  x?: asn1js.Integer;
  y?: asn1js.Integer;
}

export function isECPublicKey(key: unknown): key is ECPublicKeyValue {
  return (
    typeof key === 'object' &&
    key !== null &&
    'namedCurve' in key
  );
}

// Usage
const publicKeyValue = cert.subjectPublicKeyInfo.parsedKey;
if (isECPublicKey(publicKeyValue) && publicKeyValue.namedCurve) {
  // TypeScript knows publicKeyValue is ECPublicKeyValue here
  const curve = publicKeyValue.namedCurve;
}
```

### Common Patterns

#### Checking for Specific Properties
```typescript
function hasProperty<T, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}
```

#### Type Narrowing with typeof
```typescript
function processValue(value: unknown): string {
  if (typeof value === 'string') {
    return value; // TypeScript knows value is string
  }
  if (typeof value === 'number') {
    return value.toString(); // TypeScript knows value is number
  }
  throw new Error('Unsupported type');
}
```

## Best Practices Checklist

### For New Code

- [ ] No `any` types (use `unknown` if truly needed)
- [ ] All public functions have explicit return types
- [ ] Interface for all data structures
- [ ] Use discriminated unions for state machines
- [ ] Type guards for external data validation
- [ ] Prefer readonly properties where applicable

### For Existing Code

- [ ] Replace `any` with proper types or `unknown`
- [ ] Add type guards for runtime validation
- [ ] Convert state flags to discriminated unions
- [ ] Add explicit types to public APIs
- [ ] Enable stricter TypeScript options incrementally

### Code Review Questions

1. Does this code use `any`? Can it use `unknown` instead?
2. Are all code paths properly typed?
3. Should this be a discriminated union?
4. Is external data properly validated?
5. Are types self-documenting?

## Migration Guide

### From `any` to Proper Types

**Before:**
```typescript
function extractField(data: any) {
  return data.valueBlock.value;
}
```

**After:**
```typescript
interface ValueBlock {
  value: unknown;
}

interface ASN1Data {
  valueBlock: ValueBlock;
}

function extractField(data: unknown): unknown {
  if (hasProperty(data, 'valueBlock')) {
    const valueBlock = data.valueBlock;
    if (hasProperty(valueBlock, 'value')) {
      return valueBlock.value;
    }
  }
  throw new Error('Invalid ASN.1 data structure');
}
```

### From Optional Fields to Discriminated Unions

**Before:**
```typescript
interface Result {
  success: boolean;
  data?: Data;
  error?: string;
}
```

**After:**
```typescript
type Result =
  | { success: true; data: Data }
  | { success: false; error: string };
```

## Additional Resources

- [TypeScript Handbook - Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [TypeScript Handbook - Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [TypeScript Best Practices 2025](https://themetaengineer.com/blog/typescript-best-practices-2025)
- [Effective TypeScript Principles](https://www.dennisokeeffe.com/blog/2025-03-16-effective-typescript-principles-in-2025)

## Conclusion

These TypeScript best practices ensure:

1. **Type Safety** - Catch errors at compile time
2. **Maintainability** - Self-documenting code
3. **Refactoring Safety** - Compiler guides changes
4. **Developer Experience** - Better autocomplete and IntelliSense
5. **Runtime Safety** - Type guards validate external data
