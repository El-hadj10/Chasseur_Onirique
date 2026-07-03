// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * file_picker — fuzzy disk searcher.
 *
 * Heuristic scoring: tokenize the prompt, count token hits per file path,
 * pick the top 12 with the highest combined (path-token + name-token) overlap.
 * Deliberately avoids subsecond glob libraries: a *real* orchestrator would
 * plug a vector index here. We expose the same interface so the swap is local.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Agent, AgentOutput, AgentReference } from './base.js';

interface Candidate {
  path: string;
  score: number;
  preview: string;
}

const IGNORED = new Set(['node_modules', '.git', 'dist', '.cache', 'coverage']);
const EXT_WHITELIST = ['.ts', '.tsx', '.js', '.jsx', '.md', '.json', '.py', '.go', '.rs'];

export const filePicker: Agent<{ prompt: string; step: string }, Candidate[]> = {
  name: 'file_picker',
  description: 'Find up to 12 files relevant to the prompt (path/name keyword overlap).',
  async run({ prompt, step: _step }, ctx) {
    void _step;
    const root = ctx.rootDir;
    const tokens = tokenize(prompt);
    const candidates = scan(root, tokens);
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 12);

    return {
      agent: 'file_picker',
      data: top,
      notes: {
        'file_picker:candidates': top.map((c) => c.path),
        'file_picker:scanned': candidates.length,
      },
      references: top.map<AgentReference>((c) => ({ kind: 'path', target: relative(root, c.path) })),
      confidence: top.length === 0 ? 0 : Math.min(0.9, 0.2 + top.length / 20),
      durationMs: 0, // filled by safeRun
      log: [`scanned ${candidates.length} files`, `picked ${top.length}`, `root=${root}`],
    };
  },
};

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function scan(root: string, tokens: string[]) {
  const out: Candidate[] = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries: Array<{ name: string; isDirectory: () => boolean; isFile: () => boolean }>;
    try {
      const raw = readdirSync(dir, { withFileTypes: true }) as Array<{
        name: string;
        isDirectory(): boolean;
        isFile(): boolean;
      }>;
      entries = raw;
    } catch {
      continue;
    }
    for (const e of entries) {
      if (IGNORED.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!e.isFile()) continue;
      const ext = e.name.slice(e.name.lastIndexOf('.'));
      if (!EXT_WHITELIST.includes(ext)) continue;

      let stat;
      try {
        stat = statSync(full);
      } catch {
        continue;
      }
      if (stat.size > 200_000) continue;

      const path = full.toLowerCase();
      const score = tokens.reduce((acc, t) => acc + (path.includes(t) ? 1 : 0), 0);
      if (score === 0 && tokens.length > 0) continue;

      let preview = '';
      try {
        preview = readFileSync(full, 'utf8').split('\n').slice(0, 20).join('\n').slice(0, 600);
      } catch {
        preview = '';
      }
      out.push({ path: full, score: score || 0.0001 * (stat.size > 0 ? 1 : 0), preview });
      if (out.length > 2000) break;
    }
    if (out.length > 2000) break;
  }
  return out;
}


