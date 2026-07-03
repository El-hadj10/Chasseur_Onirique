// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import type { ToolDescriptor } from './_schema.js';

export interface SuggestFollowupsInput {
  followups: Array<{ label: string; prompt: string }>;
}
export interface SuggestFollowupsOutput {
  count: number;
}

export const suggestFollowupsTool: ToolDescriptor<SuggestFollowupsInput, SuggestFollowupsOutput> = {
  name: 'suggest_followups',
  description: 'Surface N clickable follow-up prompts to the user.',
  schema: {
    type: 'object',
    properties: {
      followups: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            prompt: { type: 'string' },
          },
          required: ['label', 'prompt'],
        },
      },
    },
    required: ['followups'],
  },
  async run(input, _ctx) {
    void _ctx;
    for (const f of input.followups.slice(0, 6)) {
      process.stdout.write(`→ followup: [${f.label}] ${truncate(f.prompt, 60)}\n`);
    }
    return { count: input.followups.length };
  },
};

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
