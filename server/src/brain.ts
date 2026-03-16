import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import * as yaml from "yaml";

// --- Types ---

export type ThoughtType =
  | "user"
  | "context"
  | "decision"
  | "learning"
  | "reference"
  | "project"
  | "custom";

export type TTL = "permanent" | "session" | "7d" | "30d" | "90d";
export type Source = "agent" | "human" | "both";

export interface ThoughtMeta {
  path: string;
  title: string;
  type: ThoughtType;
  tags: string[];
  confidence: number;
  ttl: TTL;
  source: Source;
  created: string;
  modified: string;
  links: string[];
}

export interface BrainIndex {
  version: string;
  updated: string;
  thought_count: number;
  thoughts: Record<string, ThoughtMeta>;
}

export interface BrainConfig {
  version: string;
  name: string;
  description: string;
  created: string;
  settings: {
    default_ttl: TTL;
    default_confidence: number;
    auto_index: boolean;
    thought_directories: string[];
  };
}

export interface ThoughtFrontmatter {
  id: string;
  type: ThoughtType;
  title: string;
  created: string;
  modified: string;
  source: Source;
  confidence: number;
  ttl: TTL;
  tags: string[];
  links: string[];
  sensitive?: boolean;
  custom_type?: string;
}

// --- Helpers ---

function now(): string {
  return new Date().toISOString();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80);
}

function typeToDir(type: ThoughtType): string {
  const map: Record<ThoughtType, string> = {
    user: "thoughts/user",
    context: "thoughts/context",
    decision: "thoughts/decisions",
    learning: "thoughts/learnings",
    reference: "thoughts/references",
    project: "thoughts/projects",
    custom: "custom",
  };
  return map[type];
}

function parseThoughtFile(content: string): {
  frontmatter: ThoughtFrontmatter;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("Invalid thought file: no frontmatter found");
  }
  const frontmatter = yaml.parse(match[1]) as ThoughtFrontmatter;
  const body = match[2].trim();
  return { frontmatter, body };
}

function serializeThought(fm: ThoughtFrontmatter, body: string): string {
  const yamlStr = yaml.stringify(fm, { lineWidth: 0 }).trim();
  return `---\n${yamlStr}\n---\n\n${body}\n`;
}

// --- Brain Class ---

export class Brain {
  private brainPath: string;

  constructor(brainPath: string) {
    this.brainPath = brainPath;
  }

  get dotBrainPath(): string {
    return path.join(this.brainPath, ".brain");
  }

  get indexPath(): string {
    return path.join(this.dotBrainPath, "index.json");
  }

  get configPath(): string {
    return path.join(this.dotBrainPath, "config.json");
  }

  // --- Discovery ---

  static discover(cwd?: string): string | null {
    // 1. Environment variable
    const envPath = process.env.BRAIN_PATH;
    if (envPath && fs.existsSync(path.join(envPath, ".brain"))) {
      return envPath;
    }

    // 2. Current working directory
    if (cwd) {
      const localBrain = path.join(cwd, ".brain");
      if (fs.existsSync(localBrain)) {
        return cwd;
      }
    }

    // 3. Home directory
    const homeBrain = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      ".brain"
    );
    if (fs.existsSync(homeBrain)) {
      return path.dirname(homeBrain);
    }

    return null;
  }

  // --- Init ---

  static init(
    targetPath: string,
    name: string,
    description: string
  ): Brain {
    const dotBrain = path.join(targetPath, ".brain");
    const schemasDir = path.join(dotBrain, "schemas");

    // Create directories
    const dirs = [
      dotBrain,
      schemasDir,
      path.join(targetPath, "thoughts/user"),
      path.join(targetPath, "thoughts/context"),
      path.join(targetPath, "thoughts/decisions"),
      path.join(targetPath, "thoughts/learnings"),
      path.join(targetPath, "thoughts/references"),
      path.join(targetPath, "thoughts/projects"),
      path.join(targetPath, "custom"),
    ];

    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write config
    const config: BrainConfig = {
      version: "0.1.0",
      name,
      description,
      created: now(),
      settings: {
        default_ttl: "permanent",
        default_confidence: 1.0,
        auto_index: true,
        thought_directories: [
          "thoughts/user",
          "thoughts/context",
          "thoughts/decisions",
          "thoughts/learnings",
          "thoughts/references",
          "thoughts/projects",
        ],
      },
    };
    fs.writeFileSync(
      path.join(dotBrain, "config.json"),
      JSON.stringify(config, null, 2)
    );

    // Write index
    const index: BrainIndex = {
      version: "0.1.0",
      updated: now(),
      thought_count: 0,
      thoughts: {},
    };
    fs.writeFileSync(
      path.join(dotBrain, "index.json"),
      JSON.stringify(index, null, 2)
    );

    // Write BRAIN.md
    const brainMd = `# ${name}

${description}

## Instructions

- Read this file first to understand this Brain's purpose.
- Check \`thoughts/decisions/\` before making technology or architecture choices.
- Review \`thoughts/learnings/\` before writing tests or doing code review.
- Update \`thoughts/context/\` at the end of every session.

## Key Thoughts

_(Thoughts will appear here as the Brain grows.)_
`;
    fs.writeFileSync(path.join(targetPath, "BRAIN.md"), brainMd);

    return new Brain(targetPath);
  }

  // --- Index ---

  private readIndex(): BrainIndex {
    const raw = fs.readFileSync(this.indexPath, "utf-8");
    return JSON.parse(raw) as BrainIndex;
  }

  private writeIndex(index: BrainIndex): void {
    index.updated = now();
    index.thought_count = Object.keys(index.thoughts).length;
    fs.writeFileSync(this.indexPath, JSON.stringify(index, null, 2));
  }

  // --- Remember ---

  remember(params: {
    type: ThoughtType;
    title: string;
    content: string;
    tags?: string[];
    confidence?: number;
    ttl?: TTL;
    source?: Source;
    links?: string[];
    sensitive?: boolean;
  }): { id: string; path: string } {
    const index = this.readIndex();
    const config = JSON.parse(
      fs.readFileSync(this.configPath, "utf-8")
    ) as BrainConfig;

    const id = uuidv4();
    const slug = slugify(params.title);
    const dir = typeToDir(params.type);
    const relPath = `${dir}/${slug}.md`;
    const absPath = path.join(this.brainPath, relPath);

    // Ensure directory exists
    fs.mkdirSync(path.dirname(absPath), { recursive: true });

    const fm: ThoughtFrontmatter = {
      id,
      type: params.type,
      title: params.title,
      created: now(),
      modified: now(),
      source: params.source || "agent",
      confidence: params.confidence ?? config.settings.default_confidence,
      ttl: params.ttl || config.settings.default_ttl,
      tags: params.tags || [],
      links: params.links || [],
    };
    if (params.sensitive) fm.sensitive = true;

    const body = `# ${params.title}\n\n${params.content}`;
    fs.writeFileSync(absPath, serializeThought(fm, body));

    // Update index
    index.thoughts[id] = {
      path: relPath,
      title: params.title,
      type: params.type,
      tags: fm.tags,
      confidence: fm.confidence,
      ttl: fm.ttl,
      source: fm.source,
      created: fm.created,
      modified: fm.modified,
      links: fm.links,
    };
    this.writeIndex(index);

    return { id, path: relPath };
  }

  // --- Recall ---

  recall(params?: {
    type?: ThoughtType;
    tags?: string[];
    keyword?: string;
    confidence_min?: number;
    limit?: number;
  }): Array<{ id: string; meta: ThoughtMeta; content: string }> {
    const index = this.readIndex();
    let entries = Object.entries(index.thoughts);

    // Filter by type
    if (params?.type) {
      entries = entries.filter(([, m]) => m.type === params.type);
    }

    // Filter by tags (match any)
    if (params?.tags && params.tags.length > 0) {
      entries = entries.filter(([, m]) =>
        params.tags!.some((t) => m.tags.includes(t))
      );
    }

    // Filter by confidence
    if (params?.confidence_min !== undefined) {
      entries = entries.filter(([, m]) => m.confidence >= params.confidence_min!);
    }

    // Sort by modified (most recent first)
    entries.sort(
      (a, b) =>
        new Date(b[1].modified).getTime() - new Date(a[1].modified).getTime()
    );

    // Apply limit
    if (params?.limit) {
      entries = entries.slice(0, params.limit);
    }

    // Read full content
    const results = entries.map(([id, meta]) => {
      const absPath = path.join(this.brainPath, meta.path);
      let content = "";
      try {
        content = fs.readFileSync(absPath, "utf-8");
      } catch {
        content = `[Error: Could not read ${meta.path}]`;
      }
      return { id, meta, content };
    });

    // Keyword filter (on full content)
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      return results.filter(
        (r) =>
          r.content.toLowerCase().includes(kw) ||
          r.meta.title.toLowerCase().includes(kw)
      );
    }

    return results;
  }

  // --- Update ---

  update(
    id: string,
    params: {
      content?: string;
      title?: string;
      tags?: string[];
      confidence?: number;
      ttl?: TTL;
      links?: string[];
    }
  ): { id: string; path: string } {
    const index = this.readIndex();
    const meta = index.thoughts[id];
    if (!meta) {
      throw new Error(`Thought not found: ${id}`);
    }

    const absPath = path.join(this.brainPath, meta.path);
    const raw = fs.readFileSync(absPath, "utf-8");
    const { frontmatter, body } = parseThoughtFile(raw);

    // Update frontmatter
    frontmatter.modified = now();
    if (frontmatter.source === "human") {
      frontmatter.source = "both";
    }
    if (params.title !== undefined) frontmatter.title = params.title;
    if (params.tags !== undefined) frontmatter.tags = params.tags;
    if (params.confidence !== undefined)
      frontmatter.confidence = params.confidence;
    if (params.ttl !== undefined) frontmatter.ttl = params.ttl;
    if (params.links !== undefined) frontmatter.links = params.links;

    const newBody = params.content !== undefined ? `# ${frontmatter.title}\n\n${params.content}` : body;

    fs.writeFileSync(absPath, serializeThought(frontmatter, newBody));

    // Update index
    meta.modified = frontmatter.modified;
    meta.source = frontmatter.source;
    if (params.title !== undefined) meta.title = frontmatter.title;
    if (params.tags !== undefined) meta.tags = frontmatter.tags;
    if (params.confidence !== undefined) meta.confidence = frontmatter.confidence;
    if (params.ttl !== undefined) meta.ttl = frontmatter.ttl;
    if (params.links !== undefined) meta.links = frontmatter.links;
    this.writeIndex(index);

    return { id, path: meta.path };
  }

  // --- Forget ---

  forget(id: string): { id: string; path: string } {
    const index = this.readIndex();
    const meta = index.thoughts[id];
    if (!meta) {
      throw new Error(`Thought not found: ${id}`);
    }

    // Delete file
    const absPath = path.join(this.brainPath, meta.path);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    const deletedPath = meta.path;

    // Remove from index
    delete index.thoughts[id];

    // Remove from other thoughts' links
    for (const [otherId, otherMeta] of Object.entries(index.thoughts)) {
      if (otherMeta.links.includes(id)) {
        otherMeta.links = otherMeta.links.filter((l) => l !== id);
        // Also update the file on disk
        try {
          const otherAbsPath = path.join(this.brainPath, otherMeta.path);
          const raw = fs.readFileSync(otherAbsPath, "utf-8");
          const { frontmatter, body } = parseThoughtFile(raw);
          frontmatter.links = frontmatter.links.filter((l) => l !== id);
          fs.writeFileSync(otherAbsPath, serializeThought(frontmatter, body));
        } catch {
          // Best effort — don't fail the forget if we can't update a linked file
        }
      }
    }

    this.writeIndex(index);
    return { id, path: deletedPath };
  }

  // --- Reflect ---

  reflect(scope?: string): {
    expired: Array<{ id: string; title: string; ttl: string; created: string }>;
    low_confidence: Array<{
      id: string;
      title: string;
      confidence: number;
    }>;
    orphaned: Array<{ id: string; title: string }>;
    total: number;
    by_type: Record<string, number>;
  } {
    const index = this.readIndex();
    const nowMs = Date.now();

    const ttlMs: Record<string, number> = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };

    const expired: Array<{
      id: string;
      title: string;
      ttl: string;
      created: string;
    }> = [];
    const lowConfidence: Array<{
      id: string;
      title: string;
      confidence: number;
    }> = [];
    const orphaned: Array<{ id: string; title: string }> = [];
    const byType: Record<string, number> = {};

    let entries = Object.entries(index.thoughts);

    // Filter by scope if provided
    if (scope && scope !== "all") {
      entries = entries.filter(([, m]) => m.type === scope || m.tags.includes(scope));
    }

    for (const [id, meta] of entries) {
      // Count by type
      byType[meta.type] = (byType[meta.type] || 0) + 1;

      // Check TTL expiry
      if (meta.ttl !== "permanent" && meta.ttl !== "session") {
        const maxAge = ttlMs[meta.ttl];
        if (maxAge) {
          const age = nowMs - new Date(meta.created).getTime();
          if (age > maxAge) {
            expired.push({
              id,
              title: meta.title,
              ttl: meta.ttl,
              created: meta.created,
            });
          }
        }
      }

      // Check low confidence
      if (meta.confidence < 0.5) {
        lowConfidence.push({
          id,
          title: meta.title,
          confidence: meta.confidence,
        });
      }

      // Check orphaned (no tags, no links)
      if (meta.tags.length === 0 && meta.links.length === 0) {
        orphaned.push({ id, title: meta.title });
      }
    }

    return {
      expired,
      low_confidence: lowConfidence,
      orphaned,
      total: entries.length,
      by_type: byType,
    };
  }

  // --- Status ---

  status(): {
    name: string;
    path: string;
    thought_count: number;
    by_type: Record<string, number>;
    last_updated: string;
    recent: Array<{ id: string; title: string; type: string; modified: string }>;
  } {
    const index = this.readIndex();
    const config = JSON.parse(
      fs.readFileSync(this.configPath, "utf-8")
    ) as BrainConfig;

    const byType: Record<string, number> = {};
    const entries = Object.entries(index.thoughts);

    for (const [, meta] of entries) {
      byType[meta.type] = (byType[meta.type] || 0) + 1;
    }

    // 5 most recently modified
    const recent = entries
      .sort(
        (a, b) =>
          new Date(b[1].modified).getTime() -
          new Date(a[1].modified).getTime()
      )
      .slice(0, 5)
      .map(([id, meta]) => ({
        id,
        title: meta.title,
        type: meta.type,
        modified: meta.modified,
      }));

    return {
      name: config.name,
      path: this.brainPath,
      thought_count: index.thought_count,
      by_type: byType,
      last_updated: index.updated,
      recent,
    };
  }
}
