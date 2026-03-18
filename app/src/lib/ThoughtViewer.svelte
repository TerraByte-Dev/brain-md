<script lang="ts">
  import { marked } from "marked";

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

  let { thought, onForget }: { thought: Thought; onForget: (id: string) => void } = $props();

  let showConfirmForget = $state(false);

  const typeColors: Record<string, string> = {
    user: "bg-type-user",
    context: "bg-type-context",
    decision: "bg-type-decision",
    learning: "bg-type-learning",
    reference: "bg-type-reference",
    project: "bg-type-project",
  };

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function confidencePercent(c: number): number {
    return Math.round(c * 100);
  }

  function confidenceColor(c: number): string {
    if (c >= 0.8) return "bg-skull-green";
    if (c >= 0.5) return "bg-skull-yellow";
    return "bg-skull-red";
  }

  function handleForget() {
    if (showConfirmForget) {
      onForget(thought.id);
      showConfirmForget = false;
    } else {
      showConfirmForget = true;
      setTimeout(() => { showConfirmForget = false; }, 3000);
    }
  }

  let renderedBody = $derived(marked(thought.body || "", { breaks: true }));
</script>

<div class="p-6 max-w-3xl">
  <!-- Header -->
  <div class="mb-4">
    <h1 class="text-xl font-semibold text-skull-text">{thought.title}</h1>
    {#if thought.summary}
      <p class="text-skull-text-dim text-sm mt-1">{thought.summary}</p>
    {/if}
  </div>

  <!-- Metadata bar -->
  <div class="flex flex-wrap gap-3 items-center mb-4 pb-4 border-b border-skull-border">
    <!-- Type badge -->
    <span class="text-xs px-2 py-0.5 rounded {typeColors[thought.type] || 'bg-skull-border'} text-white font-medium">
      {thought.type}
    </span>

    <!-- Confidence -->
    <div class="flex items-center gap-1.5">
      <span class="text-xs text-skull-text-dim">Confidence</span>
      <div class="w-16 h-1.5 bg-skull-border rounded-full overflow-hidden">
        <div
          class="h-full rounded-full {confidenceColor(thought.confidence)} transition-all"
          style="width: {confidencePercent(thought.confidence)}%"
        ></div>
      </div>
      <span class="text-xs text-skull-text-dim font-mono">{confidencePercent(thought.confidence)}%</span>
    </div>

    <!-- Source -->
    <span class="text-xs text-skull-text-dim">
      Source: <span class="font-mono text-skull-text">{thought.source}</span>
    </span>

    <!-- TTL -->
    <span class="text-xs text-skull-text-dim">
      TTL: <span class="font-mono text-skull-text">{thought.ttl}</span>
    </span>
  </div>

  <!-- Tags -->
  {#if thought.tags.length > 0}
    <div class="flex flex-wrap gap-1.5 mb-4">
      {#each thought.tags as tag}
        <span class="text-xs px-2 py-0.5 rounded-full bg-skull-surface border border-skull-border text-skull-text-dim">
          {tag}
        </span>
      {/each}
    </div>
  {/if}

  <!-- Project -->
  {#if thought.project}
    <div class="text-xs text-skull-text-dim mb-4">
      Project: <span class="text-type-project font-medium">{thought.project}</span>
    </div>
  {/if}

  <!-- Body -->
  <div class="thought-content text-skull-text text-sm leading-relaxed mb-6">
    {@html renderedBody}
  </div>

  <!-- Footer metadata -->
  <div class="border-t border-skull-border pt-4 flex items-center justify-between">
    <div class="text-xs text-skull-text-dim font-mono space-y-0.5">
      <div>Created: {formatDate(thought.created)}</div>
      <div>Modified: {formatDate(thought.modified)}</div>
      <div class="opacity-50">ID: {thought.id}</div>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <button
        onclick={handleForget}
        class="text-xs px-3 py-1 rounded border transition-colors {showConfirmForget ? 'border-skull-red text-skull-red bg-skull-red/10' : 'border-skull-border text-skull-text-dim hover:text-skull-red hover:border-skull-red'}"
      >
        {showConfirmForget ? "Confirm forget?" : "Forget"}
      </button>
    </div>
  </div>
</div>
