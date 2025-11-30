<script lang="ts">
  import { tStore } from '$lib/i18n/i18n';

  interface Feature {
    emoji: string;
    titleKey: string;
    descKey: string;
  }

  const features: Feature[] = [
    {
      emoji: '🔒',
      titleKey: 'features.privacy.title',
      descKey: 'features.privacy.description',
    },
    {
      emoji: '✅',
      titleKey: 'features.validation.title',
      descKey: 'features.validation.description',
    },
    {
      emoji: '👤',
      titleKey: 'features.identity.title',
      descKey: 'features.identity.description',
    },
  ];
</script>

<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
  {#each features as feature}
    <div class="bg-white p-6 rounded-lg shadow">
      <div class="text-2xl mb-2">{feature.emoji}</div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">
        {$tStore(feature.titleKey)}
      </h3>
      <p class="text-gray-600">{$tStore(feature.descKey)}</p>
    </div>
  {/each}
</div>
