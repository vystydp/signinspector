<script lang="ts">
  import { onMount } from 'svelte';
  import '../app.css';
  import { detectLocale, loadLocale, localeStore } from '$lib/i18n/i18n';
  import { inject } from '@vercel/analytics';

  inject();

  let ready = false;
  $: currentLocale = $localeStore;

  onMount(async () => {
    const locale = detectLocale();
    await loadLocale(locale);
    ready = true;
  });
</script>

<svelte:head>
  {#if currentLocale}
    <html lang={currentLocale} />
  {/if}
</svelte:head>

{#if ready}
  <slot />
{:else}
  <div class="min-h-screen flex items-center justify-center" role="status" aria-live="polite">
    <div class="text-gray-500">Loading...</div>
  </div>
{/if}
