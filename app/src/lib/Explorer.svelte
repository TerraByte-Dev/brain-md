<script lang="ts">
  interface Thought {
    id: string;
    type: string;
    title: string;
    summary: string;
    body: string;
    project: string | null;
    tags: string[];
    confidence: number;
    modified: string;
  }

  let {
    thoughts,
    selectedThought,
    brainName,
    onSelect,
  }: {
    thoughts: Thought[];
    selectedThought: Thought | null;
    brainName: string;
    onSelect: (id: string) => void;
  } = $props();

  // Brain root is always expanded, start with Projects expanded too
  let expandedFolders: Set<string> = $state(new Set(["brain", "Projects"]));

  const typeColors: Record<string, string> = {
    user: "text-type-user",
    context: "text-type-context",
    decision: "text-type-decision",
    learning: "text-type-learning",
    reference: "text-type-reference",
    project: "text-type-project",
  };

  const typeLabels: Record<string, string> = {
    user: "User",
    context: "Context",
    decision: "Decisions",
    learning: "Learnings",
    reference: "References",
  };

  function getProjectThoughts(): Map<string, Thought[]> {
    const map = new Map<string, Thought[]>();
    for (const t of thoughts) {
      if (t.project) {
        if (!map.has(t.project)) map.set(t.project, []);
        map.get(t.project)!.push(t);
      }
    }
    return map;
  }

  function getGlobalByType(): Map<string, Thought[]> {
    const map = new Map<string, Thought[]>();
    for (const t of thoughts) {
      if (!t.project) {
        if (!map.has(t.type)) map.set(t.type, []);
        map.get(t.type)!.push(t);
      }
    }
    return map;
  }

  function toggleFolder(key: string) {
    if (expandedFolders.has(key)) {
      expandedFolders.delete(key);
    } else {
      expandedFolders.add(key);
    }
    expandedFolders = new Set(expandedFolders);
  }

  function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  let projectThoughts = $derived(getProjectThoughts());
  let globalByType = $derived(getGlobalByType());
</script>

<div class="text-sm">
  <!-- Brain root -->
  <button
    class="w-full text-left px-2 py-1.5 flex items-center gap-1.5 hover:bg-skull-surface-hover transition-colors rounded"
    onclick={() => toggleFolder("brain")}
  >
    <span class="text-xs">{expandedFolders.has("brain") ? "▼" : "▶"}</span>
    <span class="text-skull-accent font-semibold">🧠 {brainName}</span>
    <span class="text-xs ml-auto text-skull-text-dim">{thoughts.length}</span>
  </button>

  {#if expandedFolders.has("brain")}
    <!-- Projects — inside the Brain -->
    {#if projectThoughts.size > 0}
      <button
        class="w-full text-left pl-5 pr-2 py-1 flex items-center gap-1 text-skull-text-dim hover:text-skull-text transition-colors"
        onclick={() => toggleFolder("Projects")}
      >
        <span class="text-xs">{expandedFolders.has("Projects") ? "▼" : "▶"}</span>
        <span class="uppercase tracking-wide text-xs font-semibold">Projects</span>
        <span class="text-xs ml-auto opacity-60">{thoughts.filter(t => t.project).length}</span>
      </button>

      {#if expandedFolders.has("Projects")}
        {#each [...projectThoughts.entries()] as [projectName, projThoughts]}
          <button
            class="w-full text-left pl-8 pr-2 py-1 flex items-center gap-1 text-skull-text-dim hover:text-skull-text transition-colors"
            onclick={() => toggleFolder(`project:${projectName}`)}
          >
            <span class="text-xs">{expandedFolders.has(`project:${projectName}`) ? "▼" : "▶"}</span>
            <span class="text-type-project">{projectName}</span>
            <span class="text-xs ml-auto opacity-60">{projThoughts.length}</span>
          </button>

          {#if expandedFolders.has(`project:${projectName}`)}
            {#each projThoughts as thought}
              <button
                class="w-full text-left pl-12 pr-2 py-1 rounded hover:bg-skull-surface-hover transition-colors {selectedThought?.id === thought.id ? 'bg-skull-surface-hover text-skull-accent' : 'text-skull-text'}"
                onclick={() => onSelect(thought.id)}
              >
                <div class="truncate">{thought.title}</div>
                <div class="text-xs text-skull-text-dim">{timeAgo(thought.modified)}</div>
              </button>
            {/each}
          {/if}
        {/each}
      {/if}
    {/if}

    <!-- Type folders — inside the Brain, siblings to Projects -->
    {#each ["user", "learning", "decision", "context", "reference"] as typeKey}
      {#if globalByType.has(typeKey)}
        {@const typeThoughts = globalByType.get(typeKey)!}
        <button
          class="w-full text-left pl-5 pr-2 py-1 flex items-center gap-1 text-skull-text-dim hover:text-skull-text transition-colors"
          onclick={() => toggleFolder(`type:${typeKey}`)}
        >
          <span class="text-xs">{expandedFolders.has(`type:${typeKey}`) ? "▼" : "▶"}</span>
          <span class="uppercase tracking-wide text-xs font-semibold {typeColors[typeKey]}">{typeLabels[typeKey] || typeKey}</span>
          <span class="text-xs ml-auto opacity-60">{typeThoughts.length}</span>
        </button>

        {#if expandedFolders.has(`type:${typeKey}`)}
          {#each typeThoughts as thought}
            <button
              class="w-full text-left pl-9 pr-2 py-1 rounded hover:bg-skull-surface-hover transition-colors {selectedThought?.id === thought.id ? 'bg-skull-surface-hover text-skull-accent' : 'text-skull-text'}"
              onclick={() => onSelect(thought.id)}
            >
              <div class="truncate">{thought.title}</div>
              <div class="text-xs text-skull-text-dim">{timeAgo(thought.modified)}</div>
            </button>
          {/each}
        {/if}
      {/if}
    {/each}
  {/if}
</div>
