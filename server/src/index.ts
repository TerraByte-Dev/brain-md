#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Brain } from "./brain.js";
import type { ThoughtType, TTL, Source } from "./brain.js";

const server = new McpServer({
  name: "brain-md",
  version: "0.1.0",
});

// --- Resolve Brain ---

function resolveBrain(brainPath?: string): Brain {
  const resolved =
    brainPath || Brain.discover(process.env.BRAIN_CWD || process.cwd());
  if (!resolved) {
    throw new Error(
      "No Brain found. Use brain_init to create one, or set BRAIN_PATH environment variable."
    );
  }
  return new Brain(resolved);
}

// --- Tools ---

server.tool(
  "brain_init",
  "Initialize a new Brain in a directory. Creates the .brain/ metadata, BRAIN.md entry point, and thoughts/ directory structure.",
  {
    name: z.string().describe("Name for the Brain"),
    description: z.string().describe("What this Brain is for"),
    path: z
      .string()
      .optional()
      .describe(
        "Directory to create the Brain in. Defaults to current working directory."
      ),
  },
  async ({ name, description, path: brainPath }) => {
    const targetPath = brainPath || process.env.BRAIN_CWD || process.cwd();
    Brain.init(targetPath, name, description);
    return {
      content: [
        {
          type: "text" as const,
          text: `Brain "${name}" initialized at ${targetPath}\n\nCreated:\n- .brain/config.json\n- .brain/index.json\n- BRAIN.md\n- thoughts/ (user, context, decisions, learnings, references, projects)`,
        },
      ],
    };
  }
);

server.tool(
  "brain_remember",
  "Save a new thought (memory) to the Brain. The thought is stored as a markdown file with structured frontmatter and added to the index.",
  {
    type: z
      .enum([
        "user",
        "context",
        "decision",
        "learning",
        "reference",
        "project",
        "custom",
      ])
      .describe(
        "Type of thought: user (about the human), context (working state), decision (preference/choice), learning (correction/feedback), reference (external resource), project (ongoing work)"
      ),
    title: z.string().describe("Short descriptive title for the thought"),
    content: z.string().describe("The thought content in markdown"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Tags for categorization and filtering"),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe(
        "How confident you are in this thought (0.0-1.0). Default 1.0. Use 1.0 for human-stated facts, lower for inferences."
      ),
    ttl: z
      .enum(["permanent", "session", "7d", "30d", "90d"])
      .optional()
      .describe("Time-to-live. Default: permanent."),
    source: z
      .enum(["agent", "human", "both"])
      .optional()
      .describe("Who created this thought. Default: agent."),
    links: z
      .array(z.string())
      .optional()
      .describe("IDs of related thoughts to link to"),
    sensitive: z
      .boolean()
      .optional()
      .describe("Flag if this contains sensitive information"),
    brain_path: z.string().optional().describe("Path to the Brain"),
  },
  async ({
    type,
    title,
    content,
    tags,
    confidence,
    ttl,
    source,
    links,
    sensitive,
    brain_path,
  }) => {
    const brain = resolveBrain(brain_path);
    const result = brain.remember({
      type: type as ThoughtType,
      title,
      content,
      tags,
      confidence,
      ttl: ttl as TTL | undefined,
      source: source as Source | undefined,
      links,
      sensitive,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Remembered: "${title}"\nID: ${result.id}\nPath: ${result.path}`,
        },
      ],
    };
  }
);

server.tool(
  "brain_recall",
  "Query thoughts from the Brain. Returns matching thoughts with their full content. Use this to load context at session start and before making decisions.",
  {
    type: z
      .enum([
        "user",
        "context",
        "decision",
        "learning",
        "reference",
        "project",
        "custom",
      ])
      .optional()
      .describe("Filter by thought type"),
    tags: z
      .array(z.string())
      .optional()
      .describe("Filter by tags (matches any)"),
    keyword: z
      .string()
      .optional()
      .describe("Search keyword (searches title and content)"),
    confidence_min: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Minimum confidence threshold"),
    limit: z
      .number()
      .optional()
      .describe("Maximum number of thoughts to return"),
    brain_path: z.string().optional().describe("Path to the Brain"),
  },
  async ({ type, tags, keyword, confidence_min, limit, brain_path }) => {
    const brain = resolveBrain(brain_path);
    const results = brain.recall({
      type: type as ThoughtType | undefined,
      tags,
      keyword,
      confidence_min,
      limit,
    });

    if (results.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "No thoughts found matching the query.",
          },
        ],
      };
    }

    const text = results
      .map(
        (r) =>
          `---\n**${r.meta.title}** (${r.meta.type}, confidence: ${r.meta.confidence})\nID: ${r.id}\nTags: ${r.meta.tags.join(", ") || "none"}\nModified: ${r.meta.modified}\n\n${r.content}`
      )
      .join("\n\n");

    return {
      content: [
        {
          type: "text" as const,
          text: `Found ${results.length} thought(s):\n\n${text}`,
        },
      ],
    };
  }
);

server.tool(
  "brain_update",
  "Modify an existing thought. Updates the thought file and index.",
  {
    id: z.string().describe("The UUID of the thought to update"),
    content: z.string().optional().describe("New content (replaces body)"),
    title: z.string().optional().describe("New title"),
    tags: z.array(z.string()).optional().describe("New tags (replaces all)"),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .optional()
      .describe("Updated confidence score"),
    ttl: z
      .enum(["permanent", "session", "7d", "30d", "90d"])
      .optional()
      .describe("Updated TTL"),
    links: z
      .array(z.string())
      .optional()
      .describe("Updated links (replaces all)"),
    brain_path: z.string().optional().describe("Path to the Brain"),
  },
  async ({ id, content, title, tags, confidence, ttl, links, brain_path }) => {
    const brain = resolveBrain(brain_path);
    const result = brain.update(id, {
      content,
      title,
      tags,
      confidence,
      ttl: ttl as TTL | undefined,
      links,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: `Updated thought: ${result.id}\nPath: ${result.path}`,
        },
      ],
    };
  }
);

server.tool(
  "brain_forget",
  "Remove a thought from the Brain. Deletes the file, removes from index, and cleans up links in other thoughts.",
  {
    id: z.string().describe("The UUID of the thought to forget"),
    brain_path: z.string().optional().describe("Path to the Brain"),
  },
  async ({ id, brain_path }) => {
    const brain = resolveBrain(brain_path);
    const result = brain.forget(id);
    return {
      content: [
        {
          type: "text" as const,
          text: `Forgot thought: ${result.id}\nDeleted: ${result.path}`,
        },
      ],
    };
  }
);

server.tool(
  "brain_reflect",
  "Review the Brain for quality issues: expired thoughts, low confidence, orphaned memories, and contradictions. Returns a report for human review.",
  {
    scope: z
      .string()
      .optional()
      .describe(
        "Scope of reflection: 'all' (default), a thought type, or a tag"
      ),
    brain_path: z.string().optional().describe("Path to the Brain"),
  },
  async ({ scope, brain_path }) => {
    const brain = resolveBrain(brain_path);
    const report = brain.reflect(scope);

    let text = `# Brain Reflection Report\n\n`;
    text += `**Total thoughts:** ${report.total}\n`;
    text += `**By type:** ${Object.entries(report.by_type).map(([t, c]) => `${t}: ${c}`).join(", ")}\n\n`;

    if (report.expired.length > 0) {
      text += `## Expired (${report.expired.length})\n`;
      for (const t of report.expired) {
        text += `- "${t.title}" (TTL: ${t.ttl}, created: ${t.created}) — ID: ${t.id}\n`;
      }
      text += "\n";
    }

    if (report.low_confidence.length > 0) {
      text += `## Low Confidence (${report.low_confidence.length})\n`;
      for (const t of report.low_confidence) {
        text += `- "${t.title}" (confidence: ${t.confidence}) — ID: ${t.id}\n`;
      }
      text += "\n";
    }

    if (report.orphaned.length > 0) {
      text += `## Orphaned (${report.orphaned.length})\n`;
      for (const t of report.orphaned) {
        text += `- "${t.title}" — ID: ${t.id}\n`;
      }
      text += "\n";
    }

    if (
      report.expired.length === 0 &&
      report.low_confidence.length === 0 &&
      report.orphaned.length === 0
    ) {
      text += "No issues found. Brain is healthy.\n";
    }

    return {
      content: [{ type: "text" as const, text }],
    };
  }
);

server.tool(
  "brain_status",
  "Get a quick overview of the Brain: name, thought count, types, and most recently modified thoughts.",
  {
    brain_path: z.string().optional().describe("Path to the Brain"),
  },
  async ({ brain_path }) => {
    const brain = resolveBrain(brain_path);
    const status = brain.status();

    let text = `# Brain: ${status.name}\n`;
    text += `**Path:** ${status.path}\n`;
    text += `**Thoughts:** ${status.thought_count}\n`;
    text += `**Last updated:** ${status.last_updated}\n`;
    text += `**By type:** ${Object.entries(status.by_type).map(([t, c]) => `${t}: ${c}`).join(", ")}\n\n`;

    if (status.recent.length > 0) {
      text += `## Recently Modified\n`;
      for (const t of status.recent) {
        text += `- "${t.title}" (${t.type}) — ${t.modified}\n`;
      }
    }

    return {
      content: [{ type: "text" as const, text }],
    };
  }
);

// --- Start Server ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
