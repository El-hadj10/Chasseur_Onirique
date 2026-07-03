// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * researcher_docs — library documentation scout.
 *
 * Returns doc manifests for common dev topics. A real implementation
 * would consult the package's local node_modules README or call a vector index.
 */

import type { Agent, AgentReference } from './base.js';

interface DocRef { library: string; page: string; url: string; note: string; }

const DOCS: Record<string, DocRef[]> = {
  typescript: [
    { library: 'typescript', page: 'Reference', url: 'https://www.typescriptlang.org/docs/handbook/utility-types.html', note: 'utility types, readonly, Pick' },
  ],
  vite: [
    { library: 'vite', page: 'guide', url: 'https://vitejs.dev/guide/', note: 'config + plugin authoring' },
  ],
  react: [
    { library: 'react', page: 'Hooks API', url: 'https://react.dev/reference/react', note: 'hooks contract' },
  ],
  node: [
    { library: 'node', page: 'fs module', url: 'https://nodejs.org/api/fs.html', note: 'filesystem APIs' },
  ],
  'unit test': [
    { library: 'vitest', page: 'Getting Started', url: 'https://vitest.dev/guide/', note: 'unit-test framework' },
  ],
  postgres: [
    { library: 'postgres', page: 'tutorial', url: 'https://www.postgresql.org/docs/current/tutorial.html', note: 'SQL & transactions' },
  ],
  fallback: [
    { library: 'MDN', page: 'index', url: 'https://developer.mozilla.org/en-US/', note: 'language reference' },
  ],
};

export const researcherDocs: Agent<{ prompt: string; step: string }, DocRef[]> = {
  name: 'researcher_docs',
  description: 'Surface library doc URLs relevant to the prompt.',
  async run({ prompt, step }) {
    const refs = pick(prompt + ' ' + step);
    return {
      agent: 'researcher_docs',
      data: refs,
      notes: { 'researcher_docs:libraries': refs.map((r) => r.library) },
      references: refs.map<AgentReference>((r) => ({ kind: 'url', target: r.url })),
      confidence: refs.length > 0 ? 0.7 : 0.2,
      durationMs: 0,
      log: [`picked=${refs.map((r) => r.library).join(',')}`],
    };
  },
};

function pick(prompt: string): DocRef[] {
  const lower = prompt.toLowerCase();
  const seen = new Set<string>();
  const out: DocRef[] = [];
  for (const k of Object.keys(DOCS)) {
    if (k === 'fallback') continue;
    if (!lower.includes(k)) continue;
    for (const r of DOCS[k]!) {
      if (seen.has(r.url)) continue;
      seen.add(r.url);
      out.push(r);
      if (out.length >= 5) break;
    }
    if (out.length >= 5) break;
  }
  if (out.length === 0) out.push(...(DOCS.fallback ?? []));
  return out;
}
