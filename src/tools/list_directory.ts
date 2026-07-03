// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import { readdirSync, statSync } from 'node:fs';
import { isAbsolute, resolve, relative } from 'node:path';
import type { ToolDescriptor } from './_schema.js';

export interface ListDirectoryOutput {
  entries: Array<{ name: string; path: string; isDir: boolean; size?: number }>;
}

export const listDirectoryTool: ToolDescriptor<{ path: string }, ListDirectoryOutput> = {
  name: 'list_directory',
  description: 'Shallow listing of a directory (one level).',
  schema: {
    type: 'object',
    properties: { path: { type: 'string' } },
    required: ['path'],
  },
  async run(input, ctx) {
    const abs = isAbsolute(input.path) ? input.path : resolve(ctx.rootDir, input.path);
    const entries: ListDirectoryOutput['entries'] = [];
    for (const e of readdirSync(abs, { withFileTypes: true })) {
      const full = resolve(abs, e.name);
      let size: number | undefined;
      if (e.isFile()) {
        try { size = statSync(full).size; } catch { size = undefined; }
      }
      entries.push({
        name: e.name,
        path: relative(ctx.rootDir, full) || e.name,
        isDir: e.isDirectory(),
        size,
      });
    }
    return { entries };
  },
};
