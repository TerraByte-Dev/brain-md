<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import Explorer from "$lib/Explorer.svelte";
  import ThoughtViewer from "$lib/ThoughtViewer.svelte";
  import SearchBar from "$lib/SearchBar.svelte";

  interface Thought {
    id: string;
    type: string;
    title: string;
    summary: string;
    body: string;
    project: string | null;
    tags: string[];
    confidence: number;
    ttl: string;
    source: string;
    created: string;
    modified: string;
    sensitive: boolean;
  }

  interface BrainStatus {
    name: string;
    path: string;
    thought_count: number;
    by_type: [string, number][];
  }

  let brainStatus: BrainStatus | null = $state(null);
  let thoughts: Thought[] = $state([]);
  let selectedThought: Thought | null = $state(null);
  let searchResults: Thought[] | null = $state(null);
  let error: string | null = $state(null);
  let recentBrains: string[] = $state([]);

  const STORAGE_KEY = "brain-md-recent";

  onMount(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      recentBrains = JSON.parse(stored);
    }
  });

  async function openBrain(path: string) {
    try {
      error = null;
      brainStatus = await invoke("connect_brain", { path });
      thoughts = await invoke("list_thoughts");
      selectedThought = null;
      searchResults = null;

      // Save to recents
      recentBrains = [path, ...recentBrains.filter((p) => p !== path)].slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(recentBrains));
    } catch (e) {
      error = String(e);
    }
  }

  async function pickBrain() {
    try {
      const selected: string | null = await invoke("pick_brain_folder");
      if (selected) {
        await openBrain(selected);
      }
    } catch (e) {
      error = String(e);
    }
  }

  async function selectThought(id: string) {
    try {
      selectedThought = await invoke("get_thought", { id });
    } catch (e) {
      error = String(e);
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim()) {
      searchResults = null;
      return;
    }
    try {
      searchResults = await invoke("search_thoughts", { query });
    } catch (e) {
      error = String(e);
    }
  }

  async function handleForget(id: string) {
    try {
      await invoke("forget_thought", { id });
      thoughts = thoughts.filter((t) => t.id !== id);
      if (selectedThought?.id === id) selectedThought = null;
    } catch (e) {
      error = String(e);
    }
  }

  function handleClearSearch() {
    searchResults = null;
  }

  function closeBrain() {
    brainStatus = null;
    thoughts = [];
    selectedThought = null;
    searchResults = null;
    error = null;
  }

  function brainDisplayName(path: string): string {
    const parts = path.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || path;
  }
</script>

{#if !brainStatus}
  <!-- Brain Picker -->
  <div class="h-screen flex items-center justify-center bg-skull-bg">
    <div class="text-center max-w-md w-full px-6">
      <div class="text-6xl mb-4">🧠</div>
      <h1 class="text-2xl font-semibold text-skull-text mb-1">The Skull</h1>
      <p class="text-skull-text-dim text-sm mb-8">Open a Brain to get started</p>

      <button
        onclick={pickBrain}
        class="w-full py-3 px-4 rounded-lg border border-skull-accent text-skull-accent hover:bg-skull-accent hover:text-white transition-colors text-sm font-medium mb-4"
      >
        Open Brain Folder...
      </button>

      {#if recentBrains.length > 0}
        <div class="text-left mt-6">
          <div class="text-skull-text-dim text-xs uppercase tracking-wide mb-2">Recent</div>
          {#each recentBrains as path}
            <button
              onclick={() => openBrain(path)}
              class="w-full text-left px-3 py-2 rounded hover:bg-skull-surface-hover transition-colors group"
            >
              <div class="text-sm text-skull-text group-hover:text-skull-accent">{brainDisplayName(path)}</div>
              <div class="text-xs text-skull-text-dim truncate font-mono">{path}</div>
            </button>
          {/each}
        </div>
      {/if}

      {#if error}
        <div class="mt-4 text-skull-red text-sm">{error}</div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Main App -->
  <div class="h-screen flex flex-col bg-skull-bg">
    <!-- Title bar -->
    <div
      class="h-10 flex items-center justify-between px-4 border-b border-skull-border bg-skull-surface shrink-0"
      data-tauri-drag-region
    >
      <div class="flex items-center gap-2">
        <span class="text-skull-accent font-semibold text-sm">🧠 {brainStatus.name}</span>
        <span class="text-skull-text-dim text-xs">
          · {brainStatus.thought_count} thoughts
        </span>
      </div>
      <div class="flex items-center gap-3">
        <button
          onclick={closeBrain}
          class="text-skull-text-dim hover:text-skull-text text-xs transition-colors"
        >
          Switch Brain
        </button>
        <span class="text-skull-text-dim text-xs font-mono">The Skull</span>
      </div>
    </div>

    <!-- Main content -->
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar -->
      <div class="w-64 shrink-0 border-r border-skull-border bg-skull-surface flex flex-col">
        <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />

        <div class="flex-1 overflow-y-auto p-2">
          {#if searchResults !== null}
            <div class="text-skull-text-dim text-xs uppercase tracking-wide mb-2 px-2">
              {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
            </div>
            {#each searchResults as thought}
              <button
                class="w-full text-left px-2 py-1.5 rounded text-sm hover:bg-skull-surface-hover transition-colors {selectedThought?.id === thought.id ? 'bg-skull-surface-hover text-skull-accent' : 'text-skull-text'}"
                onclick={() => selectThought(thought.id)}
              >
                <div class="truncate">{thought.title}</div>
                <div class="text-xs text-skull-text-dim truncate">{thought.summary || thought.body.slice(0, 60)}</div>
              </button>
            {/each}
          {:else}
            <Explorer {thoughts} {selectedThought} brainName={brainStatus.name} onSelect={selectThought} />
          {/if}
        </div>
      </div>

      <!-- Viewer -->
      <div class="flex-1 overflow-y-auto">
        {#if error}
          <div class="p-4 text-skull-red">{error}</div>
        {:else if selectedThought}
          <ThoughtViewer thought={selectedThought} onForget={handleForget} />
        {:else}
          <div class="h-full flex items-center justify-center text-skull-text-dim">
            <div class="text-center">
              <div class="text-4xl mb-2">🧠</div>
              <div class="text-lg">Select a thought</div>
              <div class="text-sm mt-1">or search for something</div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
