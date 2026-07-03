// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * code_searcher — Ripgrep-shaped grep wrapper.
 *
 * Synchronous grep over `.gitignore`-aware file types. Real orchestrators
 * would use ripgrep; we use the system `grep` here to keep deps at zero.
 */

import { spawnSync } from 'node:child_process';
import { relative } from 'node:path';
import type { Agent, AgentOutput, AgentReference } from './base.js';

const MAX_PATTERNS = 5;
const MAX_HITS_PER_PATTERN = 40;
const MAX_TOTAL_HITS = 80;

export interface SearchHit {
  file: string;
  line: number;
  text: string;
}

export const codeSearcher: Agent<{ prompt: string; step: string }, SearchHit[]> = {
  name: 'code_searcher',
  description: 'Grep the repo for patterns distilled from the prompt.',
  async run({ prompt, step: _step }, ctx) {
    void _step;
    const root = ctx.rootDir;
    const patterns = extractPatterns(prompt);
    const hits: SearchHit[] = [];
    const seen = new Set<string>();

    for (const pattern of patterns.slice(0, MAX_PATTERNS)) {
      const res = spawnSync(
        'grep',
        ['-rniE', '--color=never', pattern, root, '--include=*.ts', '--include=*.tsx', '--include=*.js', '--include=*.json', '--include=*.md'],
        { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
      );
      const text = res.stdout || '';
      const lines = text.split('\n').filter(Boolean);
      for (const line of lines.slice(0, MAX_HITS_PER_PATTERN)) {
        // shape: ./relative/path:lineno:content
        const m = line.match(/^(.+?):(\d+):(.*)$/);
        if (!m) continue;
        const key = `${m[1]}:${m[2]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push({
          file: m[1]!,
          line: Number(m[2]),
          text: m[3]!.trim(),
        });
        if (hits.length >= MAX_TOTAL_HITS) break;
      }
      if (hits.length >= MAX_TOTAL_HITS) break;
    }

    return {
      agent: 'code_searcher',
      data: hits,
      notes: {
        'code_searcher:patterns': patterns,
        'code_searcher:hits': hits.length,
      },
      references: hits.slice(0, 20).map<AgentReference>((h) => ({
        kind: 'path',
        target: relative(root, h.file),
      })),
      confidence: hits.length > 0 ? Math.min(0.95, 0.3 + hits.length / 100) : 0.2,
      durationMs: 0,
      log: [`patterns=${patterns.slice(0, 5).join(', ')}`, `hits=${hits.length}`],
    };
  },
};

function extractPatterns(prompt: string): string[] {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4);
  // Dedupe while keeping order.
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words) {
    if (seen.has(w)) continue;
    seen.add(w);
    out.push(w);
  }
  return out;
}
