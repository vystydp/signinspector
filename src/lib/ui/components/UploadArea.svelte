<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { tStore } from '$lib/i18n/i18n';

  const dispatch = createEventDispatcher<{
    fileSelected: File;
  }>();

  let isDragging = false;
  let fileInput: HTMLInputElement;

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;

    const file = e.dataTransfer?.files[0];
    if (file && file.type === 'application/pdf') {
      dispatch('fileSelected', file);
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      dispatch('fileSelected', file);
    }
  }

  function triggerFileInput() {
    fileInput?.click();
  }
</script>

<div
  class="border-2 border-dashed rounded-xl py-8 px-4 sm:py-16 sm:px-12 text-center transition-all duration-200 {isDragging
    ? 'border-blue-500 bg-blue-50 border-[3px]'
    : 'border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50'}"
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
  role="button"
  tabindex="0"
  aria-label={$tStore('upload.uploadArea')}
  on:click={triggerFileInput}
  on:keydown={(e) =>
    (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), triggerFileInput())}
>
  <!-- PDF Document Icon -->
  <div class="mx-auto h-16 w-16 relative">
    <!-- Document outline -->
    <svg
      class="h-16 w-16 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="1.5"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
    <!-- PDF badge overlay -->
    <div
      class="absolute bottom-0 right-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm"
    >
      PDF
    </div>
  </div>
  <div class="mt-6">
    <button
      type="button"
      on:click|stopPropagation={triggerFileInput}
      class="cursor-pointer rounded-md font-semibold text-blue-600 hover:text-blue-500 bg-transparent border-0 p-0 text-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600"
    >
      {$tStore('upload.selectFile')}
    </button>
    <input
      bind:this={fileInput}
      id="file-upload"
      name="file-upload"
      type="file"
      accept=".pdf,application/pdf"
      class="sr-only"
      on:change={handleFileSelect}
      aria-label={$tStore('upload.selectFile')}
    />
    <span class="text-gray-500"> {$tStore('upload.dragDrop')}</span>
  </div>
  <p class="text-xs text-gray-500 mt-2">{$tStore('upload.title')}</p>
  <p class="text-xs text-gray-600 mt-4 font-medium">
    🔒 {$tStore('upload.privacy')}
  </p>
</div>
