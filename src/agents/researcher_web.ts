// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * researcher_web — web-shape scout.
 *
 * Stub returning deterministic URL suggestions for common dev topics.
 * The contract is: "produce up to N plausible sources + a confidence".
 * Drop in a real search API by changing only the `scout()` body.
 */

import type { Agent, AgentReference } from './base.js';

interface WebSource { title: string; url: string; why: string; }

const KNOWN: Record<string, WebSource[]> = {
  react: [
    { title: 'React docs — Quick Start', url: 'https://react.dev/learn', why: 'official getting-started' },
    { title: 'Testing Library — guiding principles', url: 'https://testing-library.com/docs/guiding-principles', why: 'how unit-testability is structured' },
  ],
  login: [
    { title: 'OWASP — Authentication Cheat Sheet', url: 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html', why: 'security defaults for login UIs' },
    { title: 'Auth0 — GLAME', url: 'https://auth0.com/docs/get-started', why: 'patterns for testable login flows' },
  ],
  refactor: [
    { title: 'Refactoring (Fowler) — catalog of refactorings', url: 'https://refactoring.com/catalog/', why: 'named refactorings with code shapes' },
    { title: 'Working Effectively with Legacy Code (Feathers)', url: 'https://www.oreilly.com/library/view/working-effectively-with/0131177052/', why: 'seams, breakpoints, dependency breaking' },
  ],
  fallback: [
    { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/', why: 'reference site for web platform' },
    { title: 'GitHub — Topics', url: 'https://github.com/topics', why: 'discover related projects' },
  ],
};

export const researcherWeb: Agent<{ prompt: string; step: string }, WebSource[]> = {
  name: 'researcher_web',
  description: 'Surface up to 5 plausible web sources for the prompt.',
  async run({ prompt, step }) {
    const sources = scout(prompt + ' ' + step);
    return {
      agent: 'researcher_web',
      data: sources,
      notes: { 'researcher_web:sources': sources.map((s) => s.url) },
      references: sources.map<AgentReference>((s) => ({ kind: 'url', target: s.url })),
      confidence: sources.length > 0 ? 0.6 : 0.1,
      durationMs: 0,
      log: [`topics=${Object.keys(KNOWN).filter((k) => prompt.toLowerCase().includes(k)).join(',') || 'fallback'}`, `returned=${sources.length}`],
    };
  },
};

function scout(prompt: string): WebSource[] {
  const lower = prompt.toLowerCase();
  const seen = new Set<string>();
  const out: WebSource[] = [];
  for (const key of Object.keys(KNOWN)) {
    if (key === 'fallback') continue;
    if (!lower.includes(key)) continue;
    for (const s of KNOWN[key]!) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      out.push(s);
      if (out.length >= 5) break;
    }
    if (out.length >= 5) break;
  }
  if (out.length === 0) out.push(...KNOWN.fallback!);
  return out;
}
