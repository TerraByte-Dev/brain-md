import Database from "better-sqlite3";
import * as path from "path";
import * as fs from "fs";

// --- Schema ---

const SCHEMA = `
-- Core thoughts table
CREATE TABLE IF NOT EXISTS thoughts (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT DEFAULT '',
  body TEXT NOT NULL,
  project TEXT,
  tags TEXT DEFAULT '[]',
  confidence REAL DEFAULT 1.0,
  ttl TEXT DEFAULT 'permanent',
  source TEXT DEFAULT 'agent',
  created TEXT NOT NULL,
  modified TEXT NOT NULL,
  sensitive INTEGER DEFAULT 0,
  embedding BLOB
);

-- Links between thoughts
CREATE TABLE IF NOT EXISTS links (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  strength REAL DEFAULT 1.0,
  auto INTEGER DEFAULT 0,
  created TEXT NOT NULL,
  PRIMARY KEY (from_id, to_id),
  FOREIGN KEY (from_id) REFERENCES thoughts(id) ON DELETE CASCADE,
  FOREIGN KEY (to_id) REFERENCES thoughts(id) ON DELETE CASCADE
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE IF NOT EXISTS thoughts_fts USING fts5(
  title, summary, body, tags,
  content=thoughts,
  content_rowid=rowid
);

-- FTS sync triggers
CREATE TRIGGER IF NOT EXISTS thoughts_ai AFTER INSERT ON thoughts BEGIN
  INSERT INTO thoughts_fts(rowid, title, summary, body, tags)
  VALUES (new.rowid, new.title, new.summary, new.body, new.tags);
END;

CREATE TRIGGER IF NOT EXISTS thoughts_ad AFTER DELETE ON thoughts BEGIN
  INSERT INTO thoughts_fts(thoughts_fts, rowid, title, summary, body, tags)
  VALUES ('delete', old.rowid, old.title, old.summary, old.body, old.tags);
END;

CREATE TRIGGER IF NOT EXISTS thoughts_au AFTER UPDATE ON thoughts BEGIN
  INSERT INTO thoughts_fts(thoughts_fts, rowid, title, summary, body, tags)
  VALUES ('delete', old.rowid, old.title, old.summary, old.body, old.tags);
  INSERT INTO thoughts_fts(rowid, title, summary, body, tags)
  VALUES (new.rowid, new.title, new.summary, new.body, new.tags);
END;

-- Event log for Neural View live feed
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  thought_id TEXT,
  meta TEXT,
  timestamp TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_thoughts_type ON thoughts(type);
CREATE INDEX IF NOT EXISTS idx_thoughts_project ON thoughts(project);
CREATE INDEX IF NOT EXISTS idx_thoughts_modified ON thoughts(modified);
CREATE INDEX IF NOT EXISTS idx_thoughts_confidence ON thoughts(confidence);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
`;

// --- BrainDB class ---

export class BrainDB {
  private db: Database.Database;
  readonly dbPath: string;

  constructor(brainDotPath: string) {
    this.dbPath = path.join(brainDotPath, "brain.db");
    const exists = fs.existsSync(this.dbPath);
    this.db = new Database(this.dbPath);
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    if (!exists) {
      this.db.exec(SCHEMA);
    } else {
      // Ensure schema is up to date (safe — all CREATE IF NOT EXISTS)
      this.db.exec(SCHEMA);
    }
  }

  // --- Thoughts ---

  insertThought(thought: {
    id: string;
    type: string;
    title: string;
    summary: string;
    body: string;
    project?: string;
    tags: string[];
    confidence: number;
    ttl: string;
    source: string;
    created: string;
    modified: string;
    sensitive?: boolean;
  }): void {
    const stmt = this.db.prepare(`
      INSERT INTO thoughts (id, type, title, summary, body, project, tags, confidence, ttl, source, created, modified, sensitive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      thought.id,
      thought.type,
      thought.title,
      thought.summary,
      thought.body,
      thought.project || null,
      JSON.stringify(thought.tags),
      thought.confidence,
      thought.ttl,
      thought.source,
      thought.created,
      thought.modified,
      thought.sensitive ? 1 : 0
    );
  }

  getThought(id: string): ThoughtRow | undefined {
    const stmt = this.db.prepare("SELECT * FROM thoughts WHERE id = ?");
    const row = stmt.get(id) as RawThoughtRow | undefined;
    return row ? parseRow(row) : undefined;
  }

  queryThoughts(params?: {
    type?: string;
    project?: string;
    tags?: string[];
    confidence_min?: number;
    keyword?: string;
    limit?: number;
  }): ThoughtRow[] {
    // If keyword is provided, use FTS5
    if (params?.keyword) {
      return this.ftsSearch(params.keyword, params);
    }

    let sql = "SELECT * FROM thoughts WHERE 1=1";
    const binds: unknown[] = [];

    if (params?.type) {
      sql += " AND type = ?";
      binds.push(params.type);
    }
    if (params?.project) {
      sql += " AND project LIKE ? || '%'";
      binds.push(params.project);
    }
    if (params?.tags && params.tags.length > 0) {
      // Match any tag — check if tags JSON contains any of the provided tags
      const tagClauses = params.tags.map(() => "tags LIKE '%' || ? || '%'");
      sql += ` AND (${tagClauses.join(" OR ")})`;
      binds.push(...params.tags);
    }
    if (params?.confidence_min !== undefined) {
      sql += " AND confidence >= ?";
      binds.push(params.confidence_min);
    }

    sql += " ORDER BY modified DESC";

    if (params?.limit) {
      sql += " LIMIT ?";
      binds.push(params.limit);
    }

    const rows = this.db.prepare(sql).all(...binds) as RawThoughtRow[];
    return rows.map(parseRow);
  }

  private ftsSearch(
    keyword: string,
    params?: {
      type?: string;
      project?: string;
      tags?: string[];
      confidence_min?: number;
      limit?: number;
    }
  ): ThoughtRow[] {
    // FTS5 query with rank
    let sql = `
      SELECT t.*, rank
      FROM thoughts_fts fts
      JOIN thoughts t ON t.rowid = fts.rowid
      WHERE thoughts_fts MATCH ?
    `;
    const binds: unknown[] = [keyword];

    if (params?.type) {
      sql += " AND t.type = ?";
      binds.push(params.type);
    }
    if (params?.project) {
      sql += " AND t.project LIKE ? || '%'";
      binds.push(params.project);
    }
    if (params?.confidence_min !== undefined) {
      sql += " AND t.confidence >= ?";
      binds.push(params.confidence_min);
    }

    sql += " ORDER BY rank";

    if (params?.limit) {
      sql += " LIMIT ?";
      binds.push(params.limit);
    }

    const rows = this.db.prepare(sql).all(...binds) as RawThoughtRow[];
    return rows.map(parseRow);
  }

  updateThought(
    id: string,
    updates: {
      title?: string;
      body?: string;
      summary?: string;
      tags?: string[];
      confidence?: number;
      ttl?: string;
      source?: string;
      modified: string;
    }
  ): void {
    const sets: string[] = ["modified = ?"];
    const binds: unknown[] = [updates.modified];

    if (updates.title !== undefined) {
      sets.push("title = ?");
      binds.push(updates.title);
    }
    if (updates.body !== undefined) {
      sets.push("body = ?");
      binds.push(updates.body);
    }
    if (updates.summary !== undefined) {
      sets.push("summary = ?");
      binds.push(updates.summary);
    }
    if (updates.tags !== undefined) {
      sets.push("tags = ?");
      binds.push(JSON.stringify(updates.tags));
    }
    if (updates.confidence !== undefined) {
      sets.push("confidence = ?");
      binds.push(updates.confidence);
    }
    if (updates.ttl !== undefined) {
      sets.push("ttl = ?");
      binds.push(updates.ttl);
    }
    if (updates.source !== undefined) {
      sets.push("source = ?");
      binds.push(updates.source);
    }

    binds.push(id);
    this.db.prepare(`UPDATE thoughts SET ${sets.join(", ")} WHERE id = ?`).run(...binds);
  }

  deleteThought(id: string): void {
    this.db.prepare("DELETE FROM thoughts WHERE id = ?").run(id);
  }

  // --- Links ---

  addLink(fromId: string, toId: string, auto: boolean = false, strength: number = 1.0): void {
    this.db.prepare(`
      INSERT OR IGNORE INTO links (from_id, to_id, auto, strength, created)
      VALUES (?, ?, ?, ?, ?)
    `).run(fromId, toId, auto ? 1 : 0, strength, new Date().toISOString());
  }

  getLinks(thoughtId: string): Array<{ from_id: string; to_id: string; auto: boolean; strength: number }> {
    const rows = this.db.prepare(
      "SELECT * FROM links WHERE from_id = ? OR to_id = ?"
    ).all(thoughtId, thoughtId) as Array<{ from_id: string; to_id: string; auto: number; strength: number }>;
    return rows.map((r) => ({ ...r, auto: r.auto === 1 }));
  }

  removeLinksFor(thoughtId: string): void {
    this.db.prepare("DELETE FROM links WHERE from_id = ? OR to_id = ?").run(thoughtId, thoughtId);
  }

  // --- Events ---

  logEvent(action: string, thoughtId?: string, meta?: Record<string, unknown>): void {
    this.db.prepare(`
      INSERT INTO events (action, thought_id, meta, timestamp)
      VALUES (?, ?, ?, ?)
    `).run(action, thoughtId || null, meta ? JSON.stringify(meta) : null, new Date().toISOString());
  }

  getRecentEvents(limit: number = 50): Array<{
    id: number;
    action: string;
    thought_id: string | null;
    meta: Record<string, unknown> | null;
    timestamp: string;
  }> {
    const rows = this.db.prepare(
      "SELECT * FROM events ORDER BY id DESC LIMIT ?"
    ).all(limit) as Array<{ id: number; action: string; thought_id: string | null; meta: string | null; timestamp: string }>;
    return rows.map((r) => ({
      ...r,
      meta: r.meta ? JSON.parse(r.meta) : null,
    }));
  }

  // --- Stats ---

  thoughtCount(): number {
    const row = this.db.prepare("SELECT COUNT(*) as count FROM thoughts").get() as { count: number };
    return row.count;
  }

  countByType(): Record<string, number> {
    const rows = this.db.prepare(
      "SELECT type, COUNT(*) as count FROM thoughts GROUP BY type"
    ).all() as Array<{ type: string; count: number }>;
    const result: Record<string, number> = {};
    for (const r of rows) result[r.type] = r.count;
    return result;
  }

  recentThoughts(limit: number = 5): ThoughtRow[] {
    const rows = this.db.prepare(
      "SELECT * FROM thoughts ORDER BY modified DESC LIMIT ?"
    ).all(limit) as RawThoughtRow[];
    return rows.map(parseRow);
  }

  // --- Lifecycle ---

  close(): void {
    this.db.close();
  }
}

// --- Types ---

interface RawThoughtRow {
  id: string;
  type: string;
  title: string;
  summary: string;
  body: string;
  project: string | null;
  tags: string;
  confidence: number;
  ttl: string;
  source: string;
  created: string;
  modified: string;
  sensitive: number;
  embedding: Buffer | null;
}

export interface ThoughtRow {
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

function parseRow(row: RawThoughtRow): ThoughtRow {
  return {
    ...row,
    tags: JSON.parse(row.tags || "[]"),
    sensitive: row.sensitive === 1,
    project: row.project || null,
  };
}
