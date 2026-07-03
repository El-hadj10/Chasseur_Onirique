// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../../LICENSE
import { describe, it, expect } from 'vitest';
import { createAgentRegistry } from './registry.js';
import type { Agent } from './base.js';

describe('createAgentRegistry', () => {
  it('returns a registry with exactly 8 agents', () => {
    const reg = createAgentRegistry();
    expect(reg.size).toBe(8);
  });

  it('contains every name from the AgentName union', () => {
    const reg = createAgentRegistry();
    const names = [...reg.keys()].sort();
    expect(names).toEqual([
      'basher',
      'code_reviewer',
      'code_searcher',
      'file_picker',
      'pentest',
      'researcher_docs',
      'researcher_web',
      'thinker',
    ]);
  });

  it('each entry implements the Agent contract (name, description, run)', () => {
    const reg = createAgentRegistry();
    for (const [name, agent] of reg) {
      expect(agent.name, `agent key "${name}" must match its own .name`).toBe(name);
      expect(typeof agent.description).toBe('string');
      expect(agent.description.length).toBeGreaterThan(0);
      expect(typeof agent.run).toBe('function');
    }
  });
});

describe('Agent type-shape compatibility', () => {
  it('is assignable to Map<AgentName, Agent<unknown, unknown>>', () => {
    // Compile-time check (the `as` would fail TS if the shapes diverged).
    const reg: Map<string, Agent<unknown, unknown>> = createAgentRegistry();
    expect(reg.size).toBe(8);
  });
});
