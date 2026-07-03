// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import type { ToolDescriptor } from './_schema.js';

export interface AskUserInput {
  question: string;
  options: Array<{ label: string; description?: string }>;
}
export interface AskUserOutput {
  selection: 'other-typed' | number;
  note?: string;
}

export const askUserTool: ToolDescriptor<AskUserInput, AskUserOutput> = {
  name: 'ask_user',
  description: 'Hand a clarifying question back to the user (TTY in real runs).',
  schema: {
    type: 'object',
    properties: {
      question: { type: 'string' },
      options: {
        type: 'array',
        items: {
          type: 'object',
          properties: { label: { type: 'string' }, description: { type: 'string' } },
          required: ['label'],
        },
      },
    },
    required: ['question', 'options'],
  },
  async run(input) {
    // Without a TTY hook we just record the question and assume the first option
    // was selected (deterministic). A real orchestrator would emit a UI prompt.
    return { selection: 0, note: `deterministic stub: chose first option for "${truncate(input.question, 60)}"` };
  },
};

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
