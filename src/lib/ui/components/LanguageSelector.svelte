<script lang="ts">
  import { tStore } from '$lib/i18n/i18n';

  export let currentLocale: string;
  export let showLangSelector = false;

  interface Language {
    code: string;
    name: string;
    flag: string;
  }

  const languages: Language[] = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];

  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher<{
    localeChange: string;
  }>();

  function getCurrentLanguage() {
    return languages.find((lang) => lang.code === currentLocale) || languages[0];
  }
</script>

<div class="relative">
  <button
    on:click={() => (showLangSelector = !showLangSelector)}
    class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
    aria-label="Select language"
    aria-expanded={showLangSelector}
    aria-haspopup="true"
  >
    <span class="hidden sm:inline">{getCurrentLanguage().name}</span>
    <span class="inline sm:hidden text-xs font-semibold"
      >{getCurrentLanguage().code.toUpperCase()}</span
    >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if showLangSelector}
    <div
      class="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
    >
      <div class="py-1" role="menu">
        {#each languages as lang}
          <button
            on:click={() => {
              dispatch('localeChange', lang.code);
              showLangSelector = false;
            }}
            class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3 {currentLocale ===
            lang.code
              ? 'bg-blue-50'
              : ''}"
            role="menuitem"
          >
            <span class="text-base opacity-60">{lang.flag}</span>
            <span class="flex-1">{lang.name}</span>
            {#if currentLocale === lang.code}
              <span class="text-blue-600">✓</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>
