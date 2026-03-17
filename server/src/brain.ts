import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import * as yaml from "yaml";
import { BrainDB } from "./db.js";
import type { ThoughtRow } from "./db.js";
import { EventEmitter } from "events";

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

export interface ThoughtFrontmatter {
  id: string;
  type: ThoughtType;
  title: string;
  summary?: string;
  created: string;
  modified: string;
  source: Source;
  confidence: number;
  project?: string;
  ttl: TTL;
  tags: string[];
  links: string[];
  sensitive?: boolean;
  custom_type?: string;
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

function serializeThought(fm: ThoughtFrontmatter, body: string): string {
  const yamlStr = yaml.stringify(fm, { lineWidth: 0 }).trim();
  return `---\n${yamlStr}\n---\n\n${body}\n`;
}

// --- Brain Class ---

export class Brain {
  private brainPath: string;
  private db: BrainDB;
  readonly events: EventEmitter;

  constructor(brainPath: string) {
    this.brainPath = brainPath;
    this.db = new BrainDB(path.join(brainPath, ".brain"));
    this.events = new EventEmitter();
  }

  get dotBrainPath(): string {
    return path.join(this.brainPath, ".brain");
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

    // Create directories
    const dirs = [
      dotBrain,
      path.join(targetPath, "thoughts/user"),
      path.join(targetPath, "thoughts/context"),
      path.join(targetPath, "thoughts/decisions"),
      path.join(targetPath, "thoughts/learnings"),
      path.join(targetPath, "thoughts/references"),
      path.join(targetPath, "thoughts/projects"),
    ];

    for (const dir of dirs) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write config
    const config: BrainConfig = {
      version: "0.2.0",
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

    // The BrainDB constructor creates brain.db with schema
    return new Brain(targetPath);
  }

  // --- Remember ---

  remember(params: {
    type: ThoughtType;
    title: string;
    content: string;
    summary?: string;
    project?: string;
    tags?: string[];
    confidence?: number;
    ttl?: TTL;
    source?: Source;
    links?: string[];
    sensitive?: boolean;
  }): { id: string; path: string } {
    const config = JSON.parse(
      fs.readFileSync(this.configPath, "utf-8")
    ) as BrainConfig;

    const id = uuidv4();
    const slug = slugify(params.title);
    const timestamp = now();

    // Determine file path
    let relPath: string;
    if (params.project) {
      relPath = `projects/${params.project}/${slug}.md`;
    } else {
      const dir = typeToDir(params.type);
      relPath = `${dir}/${slug}.md`;
    }

    const tags = params.tags || [];
    const confidence = params.confidence ?? config.settings.default_confidence;
    const ttl = params.ttl || config.settings.default_ttl;
    const source = params.source || "agent";
    const links = params.links || [];

    // Insert into SQLite (source of truth)
    this.db.insertThought({
      id,
      type: params.type,
      title: params.title,
      summary: params.summary || "",
      body: params.content,
      project: params.project,
      tags,
      confidence,
      ttl,
      source,
      created: timestamp,
      modified: timestamp,
      sensitive: params.sensitive,
    });

    // Insert links
    for (const linkId of links) {
      this.db.addLink(id, linkId);
    }

    // Log event
    this.db.logEvent("thought.created", id, {
      type: params.type,
      title: params.title,
      project: params.project,
    });
    this.events.emit("thought.created", { id, type: params.type, title: params.title, project: params.project });

    // Write markdown projection (async-safe, non-blocking for the caller)
    this.writeMarkdownProjection(relPath, {
      id,
      type: params.type as ThoughtType,
      title: params.title,
      summary: params.summary,
      created: timestamp,
      modified: timestamp,
      source: source as Source,
      confidence,
      project: params.project,
      ttl: ttl as TTL,
      tags,
      links,
      sensitive: params.sensitive,
    }, `# ${params.title}\n\n${params.content}`);

    return { id, path: relPath };
  }

  // --- Recall ---

  recall(params?: {
    type?: ThoughtType;
    tags?: string[];
    keyword?: string;
    confidence_min?: number;
    project?: string;
    limit?: number;
  }): Array<{ id: string; meta: ThoughtRow; content: string }> {
    const rows = this.db.queryThoughts({
      type: params?.type,
      project: params?.project,
      tags: params?.tags,
      confidence_min: params?.confidence_min,
      keyword: params?.keyword,
      limit: params?.limit,
    });

    // Log recall events
    const ids = rows.map((r) => r.id);
    if (ids.length > 0) {
      this.db.logEvent("thought.recalled", undefined, {
        ids,
        query: params,
      });
      this.events.emit("thought.recalled", { ids, query: params });
    }

    return rows.map((row) => ({
      id: row.id,
      meta: row,
      content: this.formatThoughtContent(row),
    }));
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
    const existing = this.db.getThought(id);
    if (!existing) {
      throw new Error(`Thought not found: ${id}`);
    }

    const timestamp = now();
    const newSource = existing.source === "human" ? "both" : existing.source;

    this.db.updateThought(id, {
      title: params.title,
      body: params.content,
      tags: params.tags,
      confidence: params.confidence,
      ttl: params.ttl,
      source: newSource,
      modified: timestamp,
    });

    // Update links if provided
    if (params.links !== undefined) {
      this.db.removeLinksFor(id);
      for (const linkId of params.links) {
        this.db.addLink(id, linkId);
      }
    }

    // Log event
    this.db.logEvent("thought.updated", id, { fields: Object.keys(params) });
    this.events.emit("thought.updated", { id, fields: Object.keys(params) });

    // Rewrite markdown projection
    const updated = this.db.getThought(id)!;
    const slug = slugify(updated.title);
    let relPath: string;
    if (updated.project) {
      relPath = `projects/${updated.project}/${slug}.md`;
    } else {
      relPath = `${typeToDir(updated.type as ThoughtType)}/${slug}.md`;
    }

    const links = params.links || this.db.getLinks(id).map((l) =>
      l.from_id === id ? l.to_id : l.from_id
    );

    this.writeMarkdownProjection(relPath, {
      id: updated.id,
      type: updated.type as ThoughtType,
      title: updated.title,
      summary: updated.summary,
      created: updated.created,
      modified: updated.modified,
      source: updated.source as Source,
      confidence: updated.confidence,
      project: updated.project || undefined,
      ttl: updated.ttl as TTL,
      tags: updated.tags,
      links,
      sensitive: updated.sensitive || undefined,
    }, `# ${updated.title}\n\n${updated.body}`);

    return { id, path: relPath };
  }

  // --- Forget ---

  forget(id: string): { id: string; path: string } {
    const existing = this.db.getThought(id);
    if (!existing) {
      throw new Error(`Thought not found: ${id}`);
    }

    // Determine the markdown path to delete
    const slug = slugify(existing.title);
    let relPath: string;
    if (existing.project) {
      relPath = `projects/${existing.project}/${slug}.md`;
    } else {
      relPath = `${typeToDir(existing.type as ThoughtType)}/${slug}.md`;
    }

    // Remove links
    this.db.removeLinksFor(id);

    // Delete from DB
    this.db.deleteThought(id);

    // Log event
    this.db.logEvent("thought.forgotten", id, { title: existing.title });
    this.events.emit("thought.forgotten", { id, title: existing.title });

    // Delete markdown projection
    const absPath = path.join(this.brainPath, relPath);
    if (fs.existsSync(absPath)) {
      fs.unlinkSync(absPath);
    }

    return { id, path: relPath };
  }

  // --- Reflect ---

  reflect(scope?: string): {
    expired: Array<{ id: string; title: string; ttl: string; created: string }>;
    low_confidence: Array<{ id: string; title: string; confidence: number }>;
    orphaned: Array<{ id: string; title: string }>;
    total: number;
    by_type: Record<string, number>;
  } {
    const nowMs = Date.now();
    const ttlMs: Record<string, number> = {
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };

    let rows = this.db.queryThoughts();

    // Filter by scope
    if (scope && scope !== "all") {
      rows = rows.filter(
        (r) => r.type === scope || r.tags.includes(scope)
      );
    }

    const expired: Array<{ id: string; title: string; ttl: string; created: string }> = [];
    const lowConfidence: Array<{ id: string; title: string; confidence: number }> = [];
    const orphaned: Array<{ id: string; title: string }> = [];
    const byType: Record<string, number> = {};

    for (const row of rows) {
      byType[row.type] = (byType[row.type] || 0) + 1;

      // Check TTL expiry
      if (row.ttl !== "permanent" && row.ttl !== "session") {
        const maxAge = ttlMs[row.ttl];
        if (maxAge) {
          const age = nowMs - new Date(row.created).getTime();
          if (age > maxAge) {
            expired.push({ id: row.id, title: row.title, ttl: row.ttl, created: row.created });
          }
        }
      }

      // Check low confidence
      if (row.confidence < 0.5) {
        lowConfidence.push({ id: row.id, title: row.title, confidence: row.confidence });
      }

      // Check orphaned (no tags and no links)
      if (row.tags.length === 0) {
        const links = this.db.getLinks(row.id);
        if (links.length === 0) {
          orphaned.push({ id: row.id, title: row.title });
        }
      }
    }

    return {
      expired,
      low_confidence: lowConfidence,
      orphaned,
      total: rows.length,
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
    const config = JSON.parse(
      fs.readFileSync(this.configPath, "utf-8")
    ) as BrainConfig;

    const count = this.db.thoughtCount();
    const byType = this.db.countByType();
    const recent = this.db.recentThoughts(5);

    // Get last modified timestamp
    const lastUpdated = recent.length > 0 ? recent[0].modified : config.created;

    return {
      name: config.name,
      path: this.brainPath,
      thought_count: count,
      by_type: byType,
      last_updated: lastUpdated,
      recent: recent.map((r) => ({
        id: r.id,
        title: r.title,
        type: r.type,
        modified: r.modified,
      })),
    };
  }

  // --- Helpers ---

  private formatThoughtContent(row: ThoughtRow): string {
    const fm: ThoughtFrontmatter = {
      id: row.id,
      type: row.type as ThoughtType,
      title: row.title,
      summary: row.summary || undefined,
      created: row.created,
      modified: row.modified,
      source: row.source as Source,
      confidence: row.confidence,
      project: row.project || undefined,
      ttl: row.ttl as TTL,
      tags: row.tags,
      links: this.db.getLinks(row.id).map((l) =>
        l.from_id === row.id ? l.to_id : l.from_id
      ),
    };
    return serializeThought(fm, `# ${row.title}\n\n${row.body}`);
  }

  private writeMarkdownProjection(relPath: string, fm: ThoughtFrontmatter, body: string): void {
    const absPath = path.join(this.brainPath, relPath);
    try {
      fs.mkdirSync(path.dirname(absPath), { recursive: true });
      fs.writeFileSync(absPath, serializeThought(fm, body));
    } catch {
      // Markdown projection is best-effort — DB is source of truth
    }
  }

  // --- Cleanup ---

  close(): void {
    this.db.close();
  }
}
