// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute, resolve, relative } from 'node:path';
import type { ToolDescriptor } from './_schema.js';

export interface StrReplaceInput {
  path: string;
  oldString: string;
  newString: string;
  allOccurrences?: boolean;
}
export interface StrReplaceOutput {
  path: string;
  replaced: number;
  dryRun: boolean;
}

export const strReplaceTool: ToolDescriptor<StrReplaceInput, StrReplaceOutput> = {
  name: 'str_replace',
  description: 'Surgically patch a file by exact string match (refuses ambiguous edits).',
  schema: {
    type: 'object',
    properties: {
      path: { type: 'string' },
      oldString: { type: 'string' },
      newString: { type: 'string' },
      allOccurrences: { type: 'boolean' },
    },
    required: ['path', 'oldString', 'newString'],
  },
  async run(input, ctx) {
    const abs = isAbsolute(input.path) ? input.path : resolve(ctx.rootDir, input.path);
    const original = readFileSync(abs, 'utf8');
    const all = input.allOccurrences === true;
    const occurrences = original.split(input.oldString).length - 1;
    if (occurrences === 0) {
      return { path: relative(ctx.rootDir, abs), replaced: 0, dryRun: ctx.dryRun };
    }
    if (occurrences > 1 && !all) {
      throw new Error(`ambiguous: ${occurrences} matches — pass allOccurrences: true to patch them all`);
    }
    const updated = all
      ? original.split(input.oldString).join(input.newString)
      : original.replace(input.oldString, input.newString);
    if (!ctx.dryRun) writeFileSync(abs, updated, 'utf8');
    return {
      path: relative(ctx.rootDir, abs),
      replaced: all ? occurrences : 1,
      dryRun: ctx.dryRun,
    };
  },
};
