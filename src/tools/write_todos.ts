// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

import type { ToolDescriptor } from './_schema.js';

export interface WriteTodosInput {
  todos: Array<{ task: string; completed: boolean }>;
}
export interface WriteTodosOutput {
  accepted: number;
  rejected: number;
  version: number;
}

let TODOS_VERSION = 0;

export const writeTodosTool: ToolDescriptor<WriteTodosInput, WriteTodosOutput> = {
  name: 'write_todos',
  description: 'Replace the current plan with a normalized TODO list.',
  schema: {
    type: 'object',
    properties: {
      todos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            task: { type: 'string' },
            completed: { type: 'boolean' },
          },
          required: ['task', 'completed'],
        },
      },
    },
    required: ['todos'],
  },
  async run(input) {
    let accepted = 0;
    let rejected = 0;
    for (const t of input.todos) {
      if (typeof t.task === 'string' && t.task.length > 0 && typeof t.completed === 'boolean') accepted++;
      else rejected++;
    }
    TODOS_VERSION += 1;
    return { accepted, rejected, version: TODOS_VERSION };
  },
};
