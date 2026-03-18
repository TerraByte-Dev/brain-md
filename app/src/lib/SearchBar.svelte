<script lang="ts">
  let { onSearch, onClear }: { onSearch: (q: string) => void; onClear: () => void } = $props();

  let query = $state("");
  let debounceTimer: ReturnType<typeof setTimeout>;

  function handleInput() {
    clearTimeout(debounceTimer);
    if (!query.trim()) {
      onClear();
      return;
    }
    debounceTimer = setTimeout(() => {
      onSearch(query);
    }, 300);
  }

  function handleClear() {
    query = "";
    onClear();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      handleClear();
    }
  }
</script>

<div class="p-2 border-b border-skull-border">
  <div class="relative">
    <input
      type="text"
      placeholder="Search thoughts..."
      bind:value={query}
      oninput={handleInput}
      onkeydown={handleKeydown}
      class="w-full bg-skull-bg border border-skull-border rounded px-3 py-1.5 text-sm text-skull-text placeholder:text-skull-text-dim focus:border-skull-accent focus:outline-none transition-colors"
    />
    {#if query}
      <button
        onclick={handleClear}
        class="absolute right-2 top-1/2 -translate-y-1/2 text-skull-text-dim hover:text-skull-text text-xs"
      >
        ✕
      </button>
    {/if}
  </div>
</div>
