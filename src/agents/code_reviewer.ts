// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * code_reviewer — second pair of eyes.
 *
 * Scans recently modified files for anti-patterns: TODO, console.log,
 * `any` casts, debugger statements, `as unknown as`, lethal one-liners.
 * Returns structured findings with severity + suggested fix pointer.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { Agent, AgentReference } from './base.js';

export interface Finding {
  file: string;
  line: number;
  severity: 'nit' | 'warn' | 'blocker';
  category: string;
  message: string;
  fixHint?: string;
}

const RECENT_MS = 10 * 60 * 1000; // 10 minutes
const SCAN_EXT = ['.ts', '.tsx', '.js', '.jsx'];
const PATTERNS: Array<{ re: RegExp; category: string; severity: Finding['severity']; hint: string }> = [
  { re: /\/\/\s*TODO\b/i, category: 'todo', severity: 'warn', hint: 'resolve or link to an issue' },
  { re: /\/\/\s*FIXME\b/i, category: 'fixme', severity: 'warn', hint: 'file an issue or fix' },
  { re: /console\.log\b/, category: 'console-log', severity: 'nit', hint: 'use logger.debug or remove' },
  { re: /\bany\b/, category: 'any-cast', severity: 'warn', hint: 'tighten the type' },
  { re: /\bas\s+unknown\s+as\b/, category: 'double-assert', severity: 'blocker', hint: 'use real types' },
  { re: /\bdebugger\b/, category: 'debugger', severity: 'blocker', hint: 'remove before merge' },
];

export const codeReviewer: Agent<{ prompt: string; step: string }, Finding[]> = {
  name: 'code_reviewer',
  description: 'Surface anti-patterns in recently modified files.',
  async run({ prompt, step: _step }, ctx) {
    void _step;
    const root = ctx.rootDir;
    const findings = scan(root);

    return {
      agent: 'code_reviewer',
      data: findings,
      notes: {
        'code_reviewer:findings': findings.length,
        'code_reviewer:blockers': findings.filter((f) => f.severity === 'blocker').length,
        'code_reviewer:reviewed-prompt': prompt.slice(0, 60),
      },
      references: findings.slice(0, 20).map<AgentReference>((f) => ({
        kind: 'path',
        target: relative(root, f.file),
      })),
      confidence: findings.length > 0 ? Math.min(0.95, 0.4 + findings.length / 30) : 0.5,
      durationMs: 0,
      log: [`scanned`, `findings=${findings.length}`],
    };
  },
};

function scan(root: string): Finding[] {
  const findings: Finding[] = [];
  const ignored = new Set(['node_modules', '.git', 'dist', '.cache']);
  const cutoff = Date.now() - RECENT_MS;
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (ignored.has(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (!e.isFile()) continue;
      const ext = e.name.slice(e.name.lastIndexOf('.'));
      if (!SCAN_EXT.includes(ext)) continue;
      let stat;
      try { stat = statSync(full); } catch { continue; }
      if (stat.mtimeMs < cutoff) continue;
      let text: string;
      try { text = readFileSync(full, 'utf8'); } catch { continue; }
      if (text.length > 250_000) continue;
      const lines = text.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        for (const pat of PATTERNS) {
          if (pat.re.test(line)) {
            findings.push({
              file: full,
              line: i + 1,
              severity: pat.severity,
              category: pat.category,
              message: line.trim(),
              fixHint: pat.hint,
            });
          }
        }
        if (findings.length > 60) return findings;
      }
    }
  }
  return findings;
}
