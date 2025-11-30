<script lang="ts">
  import { tStore } from '$lib/i18n/i18n';
</script>

<section
  class="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 text-white shadow-xl"
  aria-labelledby="bankid-section"
>
  <div class="max-w-4xl mx-auto">
    <h2 id="bankid-section" class="text-2xl sm:text-3xl font-bold mb-4">
      {$tStore('bankid.heading')}
    </h2>
    <p class="text-blue-100 text-base sm:text-lg mb-6">
      {$tStore('bankid.description')}
    </p>
    <a
      href="https://www.bankid.cz"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center px-6 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md"
    >
      {$tStore('bankid.learnMore')}
      <svg class="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
        />
      </svg>
    </a>
  </div>
</section>
