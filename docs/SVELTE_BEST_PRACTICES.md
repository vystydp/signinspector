# Svelte/SvelteKit Best Practices for SignInspector

This document outlines the Svelte and SvelteKit best practices implemented in SignInspector, focusing on component architecture, reactivity, accessibility, and modern patterns.

## Table of Contents

- [Component Architecture](#component-architecture)
- [Reactive Patterns](#reactive-patterns)
- [Accessibility (a11y)](#accessibility-a11y)
- [Styling Conventions](#styling-conventions)
- [Performance](#performance)
- [Testing](#testing)

## Component Architecture

### Separation of Concerns

**Principle**: Keep components lean and focused on UI, move business logic to core modules.

```
src/
├── lib/
│   ├── core/              # Business logic (framework-agnostic)
│   │   ├── pdf/          # PDF parsing
│   │   ├── cms/          # Cryptographic validation
│   │   ├── validation/   # Validation orchestration
│   │   └── types.ts      # Type definitions
│   ├── ui/               # UI layer (Svelte-specific)
│   │   ├── components/   # Reusable components
│   │   ├── stores/       # Svelte stores
│   │   └── viewer.ts     # UI orchestration
│   └── i18n/             # Internationalization
└── routes/               # SvelteKit pages
```

### Component Design

#### ✅ Good Component

```svelte
<!-- UploadArea.svelte -->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tStore } from '$lib/i18n/i18n';

  // Clear, typed interface
  const dispatch = createEventDispatcher<{
    fileSelected: File;
  }>();

  // Local UI state only
  let isDragging = false;
  let fileInput: HTMLInputElement;

  // Simple event handlers
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    const file = e.dataTransfer?.files[0];
    if (file && file.type === 'application/pdf') {
      dispatch('fileSelected', file);
    }
  }
</script>

<!-- Semantic HTML with accessibility -->
<div
  role="button"
  tabindex="0"
  aria-label={$tStore('upload.uploadArea')}
  on:drop={handleDrop}
  on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAction()}
>
  <!-- Content -->
</div>
```

**Why This Works:**
- Clear purpose (file upload UI)
- No business logic (just dispatches events)
- Proper TypeScript types
- Accessible (ARIA attributes, keyboard support)
- Internationalized

#### ❌ Bad Component

```svelte
<!-- Don't do this -->
<script lang="ts">
  // ❌ Mixing UI and business logic
  import { validatePdfBytes } from '$lib/core/validation/validator';
  import { extractSignatures } from '$lib/core/pdf/parser';
  
  // ❌ Too many responsibilities
  let file: File;
  let validationResult: any; // ❌ No proper types
  let isValidating = false;
  let showDetails = false;
  let selectedSignature = 0;

  // ❌ Complex business logic in component
  async function handleFile(f: File) {
    const bytes = await f.arrayBuffer();
    const signatures = extractSignatures(new Uint8Array(bytes));
    validationResult = await validatePdfBytes(new Uint8Array(bytes));
    // ... more logic
  }
</script>
```

### Component Composition

Break large components into smaller, focused ones:

```svelte
<!-- +page.svelte -->
<script lang="ts">
  import UploadArea from '$lib/ui/components/UploadArea.svelte';
  import LanguageSelector from '$lib/ui/components/LanguageSelector.svelte';
  import BankIdBanner from '$lib/ui/components/BankIdBanner.svelte';
  import FeatureGrid from '$lib/ui/components/FeatureGrid.svelte';

  function handleFileSelected(event: CustomEvent<File>) {
    viewer?.setDocument(event.detail);
  }
</script>

<UploadArea on:fileSelected={handleFileSelected} />
<BankIdBanner />
<FeatureGrid />
<LanguageSelector {currentLocale} on:localeChange={switchLocale} />
```

## Reactive Patterns

### Reactive Statements ($:)

Use reactive statements for derived values:

```svelte
<script lang="ts">
  import { localeStore } from '$lib/i18n/i18n';

  // ✅ Reactive to store changes
  $: currentLocale = $localeStore;
  
  // ✅ Computed property
  $: isValid = validationResult?.overallStatus === 'VALID';
  
  // ✅ Side effect with dependency
  $: if (currentLocale && typeof document !== 'undefined') {
    document.documentElement.lang = currentLocale;
  }
</script>
```

### Stores

Use stores for shared state, not props drilling:

```typescript
// src/lib/i18n/i18n.ts
import { writable, derived } from 'svelte/store';

export const localeStore = writable<string>('en');

export const tStore = derived(
  localeStore,
  ($locale) => (key: string) => getTranslation($locale, key)
);
```

**Usage in Components:**
```svelte
<script lang="ts">
  import { tStore } from '$lib/i18n/i18n';
</script>

<h1>{$tStore('app.title')}</h1>
<p>{$tStore('app.subtitle')}</p>
```

### Avoiding Common Pitfalls

#### ❌ Manual Subscriptions
```svelte
<script lang="ts">
  import { myStore } from './stores';
  
  let value;
  const unsubscribe = myStore.subscribe(v => value = v);
  onDestroy(unsubscribe);
</script>
```

#### ✅ Auto-subscription
```svelte
<script lang="ts">
  import { myStore } from './stores';
</script>

<p>{$myStore}</p>
```

## Accessibility (a11y)

### ARIA Attributes

Always provide proper ARIA labels for interactive elements:

```svelte
<!-- Upload area -->
<div
  role="button"
  tabindex="0"
  aria-label={$tStore('upload.uploadArea')}
  on:click={handleClick}
  on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleClick()}
>
  <!-- Content -->
</div>

<!-- Language selector -->
<button
  aria-label="Select language"
  aria-expanded={showLangSelector}
  aria-haspopup="true"
>
  {currentLanguage.name}
</button>

<!-- Live region for announcements -->
<div aria-live="polite" aria-atomic="true" class="sr-only" id="status-announcer">
  {statusMessage}
</div>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```svelte
<div
  role="button"
  tabindex="0"
  on:click={action}
  on:keydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  }}
>
```

### Focus Management

Provide visible focus indicators:

```css
.button {
  @apply focus-visible:outline 
         focus-visible:outline-2 
         focus-visible:outline-offset-4 
         focus-visible:outline-blue-600;
}
```

### Screen Reader Support

#### Hidden but Accessible Text
```svelte
<h2 class="sr-only">Validation Results</h2>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
  }
</style>
```

#### Semantic HTML
```svelte
<!-- ✅ Use semantic elements -->
<main>
  <section aria-labelledby="results-heading">
    <h2 id="results-heading">Validation Results</h2>
    <!-- Content -->
  </section>
</main>

<!-- ❌ Don't use divs for everything -->
<div class="main-content">
  <div class="section">
    <div class="heading">Validation Results</div>
  </div>
</div>
```

### Lang Attribute

Always set the correct language:

```svelte
<!-- +layout.svelte -->
<script lang="ts">
  import { localeStore } from '$lib/i18n/i18n';
  $: currentLocale = $localeStore;

  $: if (typeof document !== 'undefined' && currentLocale) {
    document.documentElement.lang = currentLocale;
  }
</script>

<svelte:head>
  {#if currentLocale}
    <html lang={currentLocale} />
  {/if}
</svelte:head>
```

### Color Contrast

Ensure WCAG AA compliance (4.5:1 for normal text, 3:1 for large text):

```css
/* ✅ Good contrast */
.text-primary {
  color: #1e40af; /* Blue-800 on white = 7.96:1 */
}

/* ❌ Poor contrast */
.text-light {
  color: #93c5fd; /* Blue-300 on white = 2.38:1 - fails WCAG */
}
```

## Styling Conventions

### Tailwind CSS

Use Tailwind utility classes for consistency:

```svelte
<div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
  <h1 class="text-3xl font-bold text-gray-900">
    {$tStore('app.title')}
  </h1>
</div>
```

### Responsive Design

Use responsive prefixes:

```svelte
<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
  <!-- Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns -->
</div>

<span class="hidden sm:inline">Desktop Text</span>
<span class="inline sm:hidden">Mobile Text</span>
```

### Component-Scoped Styles

Use scoped styles for component-specific needs:

```svelte
<style>
  .custom-gradient {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  /* Scoped to this component only */
  .button:hover {
    transform: translateY(-2px);
  }
</style>
```

### Global Styles

Use `:global()` sparingly:

```svelte
<style>
  /* Only for truly global concerns */
  :global(body) {
    font-family: 'Inter', sans-serif;
  }

  /* Prefer scoped styles otherwise */
  .card {
    border-radius: 0.5rem;
  }
</style>
```

## Performance

### Avoid Unnecessary Reactivity

```svelte
<script lang="ts">
  // ❌ This recalculates on every component update
  $: expensiveValue = data.map(item => complexCalculation(item));

  // ✅ Use derived store for shared computations
  import { derived } from 'svelte/store';
  const expensiveValue = derived(dataStore, $data => 
    $data.map(item => complexCalculation(item))
  );

  // ✅ Or memoize in the component
  let cachedData = data;
  let cachedValue = data.map(item => complexCalculation(item));
  $: if (data !== cachedData) {
    cachedData = data;
    cachedValue = data.map(item => complexCalculation(item));
  }
</script>
```

### Lazy Loading

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let HeavyComponent;

  onMount(async () => {
    const module = await import('./HeavyComponent.svelte');
    HeavyComponent = module.default;
  });
</script>

{#if HeavyComponent}
  <svelte:component this={HeavyComponent} />
{/if}
```

### Event Handler Performance

```svelte
<script lang="ts">
  // ✅ Declare handler once
  function handleClick() {
    // ...
  }
</script>

<button on:click={handleClick}>Click</button>

<!-- ❌ Creates new function on every render -->
<button on:click={() => doSomething()}>Click</button>
```

## Testing

### Component Testing Structure

```typescript
// UploadArea.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import UploadArea from './UploadArea.svelte';

describe('UploadArea', () => {
  it('dispatches fileSelected event when file is dropped', async () => {
    const { component, container } = render(UploadArea);
    const uploadArea = container.querySelector('[role="button"]');

    let dispatchedFile: File | null = null;
    component.$on('fileSelected', (e) => {
      dispatchedFile = e.detail;
    });

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await fireEvent.drop(uploadArea!, {
      dataTransfer: { files: [file] }
    });

    expect(dispatchedFile).toBe(file);
  });
});
```

## Checklist for New Components

### Functionality
- [ ] Single, clear responsibility
- [ ] Typed props with TypeScript
- [ ] Typed events with `createEventDispatcher<T>`
- [ ] No business logic (use core modules)
- [ ] Reactive statements for derived values

### Accessibility
- [ ] Semantic HTML elements
- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation (Enter, Space, Tab)
- [ ] Focus indicators visible
- [ ] Screen reader tested
- [ ] Color contrast meets WCAG AA

### Internationalization
- [ ] All user-facing text uses `$tStore()`
- [ ] No hardcoded strings
- [ ] Translation keys added to all language files

### Styling
- [ ] Tailwind utilities for layout
- [ ] Responsive design (mobile-first)
- [ ] Consistent spacing and colors
- [ ] Hover/focus states

### Performance
- [ ] No unnecessary reactivity
- [ ] Event handlers declared once
- [ ] Heavy computations memoized
- [ ] Lazy loading considered

## Code Review Checklist

When reviewing Svelte components:

1. **Architecture**: Is business logic in core modules, not components?
2. **Types**: Are props and events properly typed?
3. **Accessibility**: Can this be used with keyboard only? Screen reader?
4. **Reactivity**: Are reactive statements necessary and efficient?
5. **Internationalization**: Are all strings translated?
6. **Styling**: Consistent with design system?
7. **Testing**: Are critical paths tested?

## Additional Resources

- [Svelte Best Practices](https://svelte.dev/docs/svelte/overview)
- [SvelteKit Docs](https://svelte.dev/docs/kit)
- [Svelte Accessibility](https://svelte.dev/docs/kit/accessibility)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Svelte Testing Library](https://testing-library.com/docs/svelte-testing-library/intro/)

## Conclusion

Following these Svelte best practices ensures:

1. **Maintainable Components** - Clear separation of concerns
2. **Accessible UI** - Works for all users
3. **Type Safety** - Catch errors early with TypeScript
4. **Performance** - Efficient reactivity and rendering
5. **Internationalization** - Ready for global audiences
6. **Testability** - Easy to write and maintain tests
