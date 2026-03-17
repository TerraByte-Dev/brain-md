#!/usr/bin/env node

/**
 * Migration tool: JSON index → SQLite
 *
 * Reads existing .brain/index.json + markdown thought files and inserts
 * everything into the new SQLite database. Safe to run multiple times —
 * skips thoughts that already exist in the DB.
 *
 * Usage: node dist/migrate.js [brain-path]
 */

import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import { BrainDB } from "./db.js";

interface OldThoughtMeta {
  path: string;
  title: string;
  summary: string;
  type: string;
  project?: string;
  tags: string[];
  confidence: number;
  ttl: string;
  source: string;
  created: string;
  modified: string;
  links: string[];
}

interface OldIndex {
  version: string;
  updated: string;
  thought_count: number;
  thoughts: Record<string, OldThoughtMeta>;
}

function migrate(brainPath: string): void {
  const dotBrain = path.join(brainPath, ".brain");
  const indexPath = path.join(dotBrain, "index.json");

  if (!fs.existsSync(indexPath)) {
    console.log("No index.json found — nothing to migrate.");
    return;
  }

  console.log(`Migrating Brain at: ${brainPath}`);

  const index: OldIndex = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
  const entries = Object.entries(index.thoughts);

  console.log(`Found ${entries.length} thought(s) in index.json`);

  // Open/create the SQLite DB
  const db = new BrainDB(dotBrain);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;

  for (const [id, meta] of entries) {
    // Check if already in DB
    const existing = db.getThought(id);
    if (existing) {
      skipped++;
      continue;
    }

    // Read the markdown file for full content
    const absPath = path.join(brainPath, meta.path);
    let body = "";

    try {
      const raw = fs.readFileSync(absPath, "utf-8");
      // Parse frontmatter to get body
      const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (match) {
        // Strip the "# Title\n\n" prefix from body if present
        body = match[2].trim();
        const titlePrefix = `# ${meta.title}`;
        if (body.startsWith(titlePrefix)) {
          body = body.slice(titlePrefix.length).trim();
        }
      } else {
        body = raw.trim();
      }
    } catch {
      console.warn(`  Warning: Could not read ${meta.path} — using empty body`);
      body = "";
    }

    try {
      db.insertThought({
        id,
        type: meta.type,
        title: meta.title,
        summary: meta.summary || "",
        body,
        project: meta.project,
        tags: meta.tags,
        confidence: meta.confidence,
        ttl: meta.ttl,
        source: meta.source,
        created: meta.created,
        modified: meta.modified,
      });

      // Migrate links
      for (const linkId of meta.links) {
        db.addLink(id, linkId);
      }

      migrated++;
    } catch (err) {
      console.error(`  Error migrating "${meta.title}": ${err}`);
      errors++;
    }
  }

  // Log migration event
  db.logEvent("brain.migrated", undefined, {
    from: "json",
    to: "sqlite",
    migrated,
    skipped,
    errors,
  });

  db.close();

  console.log(`\nMigration complete:`);
  console.log(`  Migrated: ${migrated}`);
  console.log(`  Skipped (already in DB): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  if (migrated > 0) {
    // Rename old index.json to index.json.bak
    const bakPath = indexPath + ".bak";
    fs.renameSync(indexPath, bakPath);
    console.log(`\n  Backed up index.json → index.json.bak`);
    console.log(`  SQLite DB: ${path.join(dotBrain, "brain.db")}`);
  }
}

// --- CLI ---

const brainPath = process.argv[2] || process.env.BRAIN_PATH || process.cwd();
migrate(brainPath);
