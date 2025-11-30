<script lang="ts">
  import { SignInspectorViewer } from '$lib/ui/viewer';
  import { onMount } from 'svelte';
  import { tStore, localeStore, getCurrentLocale, setLocale } from '$lib/i18n/i18n';
  import { base } from '$app/paths';

  // UI Components
  import UploadArea from '$lib/ui/components/UploadArea.svelte';
  import LanguageSelector from '$lib/ui/components/LanguageSelector.svelte';
  import BankIdBanner from '$lib/ui/components/BankIdBanner.svelte';
  import FeatureGrid from '$lib/ui/components/FeatureGrid.svelte';

  let viewerContainer: HTMLElement;
  let viewer: SignInspectorViewer | undefined;
  let showLangSelector = false;
  let showScrollToTop = false;

  $: t = $tStore;
  $: currentLocale = $localeStore;

  onMount(() => {
    const handleScroll = () => {
      showScrollToTop = window.scrollY > 300;
    };
    window.addEventListener('scroll', handleScroll);

    viewer = SignInspectorViewer.create(viewerContainer, {
      autoResize: true,
      watermark: true,
    });

    return () => {
      viewer?.destroy();
      window.removeEventListener('scroll', handleScroll);
    };
  });

  async function switchLocale(locale: string) {
    await setLocale(locale);
    showLangSelector = false;
    location.reload();
  }

  function handleFileSelected(event: CustomEvent<File>) {
    const file = event.detail;
    if (file && viewer) {
      viewer.setDocument(file);
      // Scroll to the viewer section after a short delay to allow rendering
      setTimeout(() => {
        viewerContainer?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
</script>

<svelte:head>
  <title
    >SignInspector – Client-Side PDF Signature & EU Trusted List Validator | BankID.cz eIDAS</title
  >
  <meta
    name="description"
    content="Client-side PDF digital signature validator for BankID.cz, EU Trusted List (eIDAS), and PKCS#7/PAdES signatures. Validate PDF signatures securely in your browser with Web Crypto API – no upload required. Built by Petr Vystyd."
  />
  <meta
    name="keywords"
    content="PDF signature validator, digital signature verification, BankID.cz, EU Trusted List, eIDAS, PKCS7, PAdES, client-side validation, Web Crypto API, certificate validation, PKI, X.509"
  />
  <meta name="author" content="Petr Vystyd" />
  <meta name="contact" content="vystydp@gmail.com" />
  <link rel="author" href="mailto:vystydp@gmail.com" />

  <!-- Open Graph / Social Media -->
  <meta property="og:title" content="SignInspector – Client-Side PDF Signature Validator" />
  <meta
    property="og:description"
    content="Validate PDF digital signatures (BankID.cz, EU eIDAS, PAdES) securely in your browser. No upload required."
  />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://vystydp.github.io/signinspector/" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="SignInspector – PDF Signature Validator" />
  <meta
    name="twitter:description"
    content="Client-side PDF signature validation for BankID.cz & EU eIDAS"
  />
  <script type="application/ld+json">
    [
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "SignInspector",
        "applicationCategory": "SecurityApplication",
        "applicationSubCategory": "Digital Signature Validation",
        "operatingSystem": "Web",
        "browserRequirements": "Requires JavaScript and Web Crypto API",
        "softwareVersion": "1.0",
        "description": "Client-side PDF digital signature validator supporting BankID.cz, EU Trusted List (eIDAS), PKCS#7, and PAdES signatures. Validate PDF signatures securely in your browser using Web Crypto API without uploading files.",
        "url": "https://vystydp.github.io/signinspector/",
        "screenshot": "https://vystydp.github.io/signinspector/logo.svg",
        "featureList": [
          "BankID.cz signature validation",
          "EU eIDAS qualified signatures",
          "PKCS#7 / CMS signature support",
          "PAdES signature validation",
          "Client-side processing (no upload)",
          "EU Trusted List verification",
          "Certificate chain validation",
          "X.509 certificate inspection"
        ],
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD"
        },
        "author": {
          "@type": "Person",
          "name": "Petr Vystyd",
          "email": "vystydp@gmail.com",
          "telephone": "+420608580100",
          "jobTitle": "Software Developer",
          "url": "https://github.com/vystydp"
        },
        "programmingLanguage": ["TypeScript", "JavaScript"],
        "keywords": "PDF signature, digital signature validation, BankID.cz, eIDAS, EU Trusted List, PKCS7, PAdES, PKI, X.509, certificate validation, Web Crypto API"
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Petr Vystyd - Independent Developer",
        "url": "https://github.com/vystydp",
        "logo": "https://vystydp.github.io/signinspector/logo.svg",
        "contactPoint": {
          "@type": "ContactPoint",
          "email": "vystydp@gmail.com",
          "telephone": "+420608580100",
          "contactType": "Developer"
        },
        "sameAs": ["https://github.com/vystydp", "https://github.com/vystydp/signinspector"]
      }
    ]
  </script>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <!-- Header -->
  <header class="bg-white shadow-sm">
    <div class="max-w-7xl mx-auto px-4 py-4 sm:py-6 sm:px-6 lg:px-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-2 sm:gap-3">
          <img
            src="{base}/logo.svg"
            alt="SignInspector Logo"
            class="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0"
          />
          <div class="min-w-0">
            <h1 class="text-xl sm:text-3xl font-bold text-gray-900 truncate">{t('app.title')}</h1>
            <p class="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500 line-clamp-1">
              {t('app.subtitle')}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2 sm:gap-4 justify-end">
          <!-- Language Selector -->
          <LanguageSelector
            {currentLocale}
            bind:showLangSelector
            on:localeChange={(e) => switchLocale(e.detail)}
          />
          <a
            href="https://github.com/vystydp/signinspector"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-2 px-3 py-2 sm:px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 transition-colors"
            title={t('github.viewOn')}
          >
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill-rule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clip-rule="evenodd"
              />
            </svg>
            <span class="hidden sm:inline">{t('github.viewOn')}</span>
            <span class="sm:hidden">{t('github.short')}</span>
          </a>
        </div>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
    <!-- Upload Area -->
    <div class="mb-8">
      <UploadArea on:fileSelected={handleFileSelected} />
    </div>

    <!-- ARIA live region for status announcements -->
    <div aria-live="polite" aria-atomic="true" class="sr-only" id="status-announcer"></div>

    <!-- Viewer -->
    <section
      aria-labelledby="validation-results-heading"
      class="bg-white rounded-lg shadow-lg overflow-hidden"
    >
      <h2 id="validation-results-heading" class="sr-only">Validation Results</h2>
      <div bind:this={viewerContainer} class="h-[600px] md:h-[700px]"></div>
    </section>

    <!-- BankID.cz Compatibility Banner -->
    <div class="mt-12">
      <BankIdBanner />
    </div>

    <!-- Features -->
    <div class="mt-12">
      <FeatureGrid />
    </div>

    <!-- FAQ Section with Schema.org structured data -->
    <section class="mt-16 bg-white rounded-2xl p-8 shadow-lg" aria-labelledby="faq-heading">
      <h2 id="faq-heading" class="text-2xl font-bold text-gray-900 mb-8 text-center">
        {t('faq.heading')}
      </h2>
      <div class="max-w-3xl mx-auto space-y-4">
        <details class="group" open>
          <summary
            class="flex justify-between items-center cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <h3 class="text-lg font-semibold text-gray-900">
              {t('faq.bankidCompatible.question')}
            </h3>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="p-4 text-gray-700 leading-relaxed">
            <p>
              {@html t('faq.bankidCompatible.answer').replace(
                '{bankid}',
                `<strong>${t('bankid.name')}</strong>`
              )}
            </p>
          </div>
        </details>

        <details class="group">
          <summary
            class="flex justify-between items-center cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <h3 class="text-lg font-semibold text-gray-900">{t('faq.privacy.question')}</h3>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="p-4 text-gray-700 leading-relaxed">
            <p>
              {@html t('faq.privacy.answer').replace(
                '{no}',
                `<strong>${t('faq.privacy.no')}</strong>`
              )}
            </p>
          </div>
        </details>

        <details class="group">
          <summary
            class="flex justify-between items-center cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <h3 class="text-lg font-semibold text-gray-900">
              {t('faq.modified.question')}
            </h3>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="p-4 text-gray-700 leading-relaxed">
            <p>
              {t('faq.modified.answer')}
            </p>
          </div>
        </details>

        <details class="group">
          <summary
            class="flex justify-between items-center cursor-pointer list-none p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <h3 class="text-lg font-semibold text-gray-900">
              {t('faq.formats.question')}
            </h3>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="p-4 text-gray-700 leading-relaxed">
            <p>
              {t('faq.formats.answer')}
            </p>
          </div>
        </details>

        <details class="group">
          <summary
            class="flex justify-between items-center cursor-pointer list-none p-4 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors border-l-4 border-yellow-400"
          >
            <h3 class="text-lg font-semibold text-gray-900">
              ⚠️ {t('faq.algorithms.question')}
            </h3>
            <span class="transition group-open:rotate-180">▼</span>
          </summary>
          <div class="p-4 text-gray-700 leading-relaxed bg-yellow-50">
            <p class="mb-3">
              {t('faq.algorithms.answer')}
            </p>
            <div class="text-sm text-gray-600 bg-white p-3 rounded border-l-2 border-yellow-400">
              <strong>{t('algorithms.limitation.title')}:</strong>
              {t('algorithms.limitation.details')}
            </div>
          </div>
        </details>
      </div>
    </section>
  </main>

  <!-- Footer -->
  <footer class="mt-12 py-6 text-center text-sm text-gray-500">
    <p>
      {t('footer.madeWith')} ❤️ {t('footer.by')} TypeScript and Svelte •
      <a href="https://github.com/vystydp/signinspector" class="text-blue-600 hover:text-blue-500">
        {t('footer.openSource')}
      </a>
    </p>
    <p class="mt-2 text-[11px] text-gray-400">
      © {new Date().getFullYear()} Petr Vystyd ·
      <a href="mailto:vystydp@gmail.com" class="underline hover:text-gray-500">
        vystydp@gmail.com
      </a>
      ·
      <a href="tel:+420608580100" class="underline hover:text-gray-500">
        +420&nbsp;608&nbsp;580&nbsp;100
      </a>
    </p>
  </footer>
</div>

<!-- Scroll to Top Button -->
{#if showScrollToTop}
  <button
    on:click={scrollToTop}
    class="fixed bottom-8 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 z-50"
    aria-label="Scroll to top"
    title="Scroll to top"
  >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M5 10l7-7m0 0l7 7m-7-7v18"
      />
    </svg>
  </button>
{/if}

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

  /* Enhanced focus states for accessibility */
  :global(button:focus-visible, a:focus-visible) {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }

  /* Respect prefers-reduced-motion */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
</style>
