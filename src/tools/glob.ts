// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import { readdirSync } from 'node:fs';
import { join, relative, isAbsolute, resolve } from 'node:path';
import type { ToolDescriptor } from './_schema.js';

const IGNORED = new Set(['node_modules', '.git', 'dist', '.cache', 'coverage']);

export interface GlobOutput {
  matches: string[];
}

export const globTool: ToolDescriptor<{ pattern: string; root?: string }, GlobOutput> = {
  name: 'glob',
  description: 'Find files by glob (supports **, *, basename). No external deps.',
  schema: {
    type: 'object',
    properties: {
      pattern: { type: 'string' },
      root: { type: 'string' },
    },
    required: ['pattern'],
  },
  async run(input, ctx) {
    const root = isAbsolute(input.root ?? ctx.rootDir)
      ? (input.root ?? ctx.rootDir)
      : resolve(ctx.rootDir, input.root ?? ctx.rootDir);
    const matches: string[] = [];
    walk(root, input.pattern, root, matches);
    return { matches: matches.map((m) => relative(ctx.rootDir, m)) };
  },
};

function walk(base: string, pattern: string, dir: string, out: string[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  const re = globToRegExp(pattern, base);
  for (const e of entries) {
    if (IGNORED.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(base, pattern, full, out);
    else if (e.isFile() && re.test(relative(base, full))) out.push(full);
  }
}

function globToRegExp(pattern: string, base: string): RegExp {
  const anchored = `^${escapeForRegex(relative(base, '.'))}?${pattern
    .replace(/^\*\*\//, '')
    .replace(/\*\*$/, '')
    .replace(/\/\*\*\//g, '/')
    .replace(/\./g, '\\.')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')}$`;
  return new RegExp(anchored);
}

function escapeForRegex(s: string): string {
  return s.replace(/[-/\\^$+|.]/g, '\\$&');
}
