// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import { readFileSync, existsSync, statSync } from 'node:fs';
import { resolve, isAbsolute, relative } from 'node:path';
import type { ToolDescriptor } from './_schema.js';

export interface ReadFilesInput {
  paths: string[];
}
export interface ReadFilesOutput {
  files: Array<{ path: string; content: string; size: number }>;
}

export const readFilesTool: ToolDescriptor<ReadFilesInput, ReadFilesOutput> = {
  name: 'read_files',
  description: 'Read the contents of one or more files (cap: 64 KiB each).',
  schema: {
    type: 'object',
    properties: { paths: { type: 'array', items: { type: 'string' } } },
    required: ['paths'],
  },
  async run(input, ctx) {
    const out: ReadFilesOutput['files'] = [];
    for (const pRaw of input.paths) {
      const p = isAbsolute(pRaw) ? pRaw : resolve(ctx.rootDir, pRaw);
      if (!existsSync(p)) continue;
      const stat = statSync(p);
      if (!stat.isFile()) continue;
      const content = readFileSync(p, 'utf8').slice(0, 64 * 1024);
      out.push({ path: relative(ctx.rootDir, p), content, size: stat.size });
    }
    return { files: out };
  },
};
