// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, isAbsolute, resolve, relative } from 'node:path';
import type { ToolDescriptor } from './_schema.js';

export interface WriteFileInput {
  path: string;
  content: string;
}
export interface WriteFileOutput {
  path: string;
  bytes: number;
  dryRun: boolean;
}

export const writeFileTool: ToolDescriptor<WriteFileInput, WriteFileOutput> = {
  name: 'write_file',
  description: 'Create or overwrite a file. Respects ctx.dryRun.',
  schema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['path', 'content'],
  },
  async run(input, ctx) {
    const abs = isAbsolute(input.path) ? input.path : resolve(ctx.rootDir, input.path);
    mkdirSync(dirname(abs), { recursive: true });
    if (!ctx.dryRun) writeFileSync(abs, input.content, 'utf8');
    return {
      path: relative(ctx.rootDir, abs),
      bytes: Buffer.byteLength(input.content, 'utf8'),
      dryRun: ctx.dryRun,
    };
  },
};
