// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see LICENSE)
// =============================================================================

/**
 * basher — controlled shell executor.
 *
 * SAFETY: by default it is a DRY-RUN that prints what it would do.
 * Set the env var `CHASSEUR_ONIRIQUE_LIVE=1` to actually execute.
 * It refuses commands whose argv matches a deny-list.
 *
 * A robust orchestrator enforces a similar guarantee — the parent agent
 * never delegates to a free-form shell. It only delegates to *named*
 * agents registered in the registry.
 */

import { spawnSync } from 'node:child_process';
import type { Agent, AgentOutput } from './base.js';

export interface BashResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  dryRun: boolean;
}

export const DENY: RegExp[] = [
  // rm -rf / and rm -rf/ (no whitespace) — both must be caught. \s* tolerates zero or more spaces.
  /\brm\s+-rf?\s*\//,
  // rm <flags...> -rf / — catches `rm --no-preserve-root -rf /`, `rm -r -- -rf /`, etc.
  // The \b after `-rf?` is the crucial bit: it forces `-rf` to be a complete token, so the
  // regex cannot backtrack across `--` and `./` and falsely accept dangerous paths.
  // KNOWN GAP: split flags like `rm -r -f /` are NOT caught (no contiguous `-rf` substring).
  /\brm\b[^|;&]*-rf?\b\s*\//,
  // rm --no-preserve-root [/...] — catches the variant that has no `-rf` substring at all.
  // The `(?:-rf?\b)?` makes the `-rf` flag optional without re-introducing the backtracking hole.
  // The `(?:\s+--)?` after `--no-preserve-root` accepts both `rm --no-preserve-root /x` and
  // `rm --no-preserve-root -- /x` (double-dash positional separator).
  /\brm\b[^|;&]*(?:-rf?\b)?[^|;&]*--no-preserve-root(?:\s+--)?\s*\//,
  /\bcurl[^|]*\|\s*sh\b/,
  /\bwget[^|]*\|\s*sh\b/,
  /\bsudo\b/,
  /\bdd\s+if=/,
];

export const basher: Agent<{ prompt: string; step: string }, BashResult[]> = {
  name: 'basher',
  description: 'Run an allowlisted shell command (dry-run by default).',
  async run({ prompt, step }) {
    const live = process.env.CHASSEUR_ONIRIQUE_LIVE === '1';
    const commands = proposeCommands(prompt, step);
    const results: BashResult[] = [];

    for (const cmd of commands) {
      if (DENY.some((re) => re.test(cmd))) {
        results.push({
          command: cmd,
          exitCode: 126,
          stdout: '',
          stderr: 'deny-list: refused',
          dryRun: !live,
        });
        continue;
      }
      if (!live) {
        results.push({
          command: cmd,
          exitCode: 0,
          stdout: `(dry-run: ${cmd})`,
          stderr: '',
          dryRun: true,
        });
        continue;
      }
      const res = spawnSync('bash', ['-c', cmd], {
        encoding: 'utf8',
        maxBuffer: 4 * 1024 * 1024,
      });
      results.push({
        command: cmd,
        exitCode: res.status ?? 0,
        stdout: (res.stdout ?? '').slice(0, 4000),
        stderr: (res.stderr ?? '').slice(0, 4000),
        dryRun: false,
      });
    }

    return {
      agent: 'basher',
      data: results,
      notes: {
        'basher:commands-run': results.length,
        'basher:live': live,
      },
      references: results.map((r) => ({ kind: 'path', target: `cmd:${r.command.slice(0, 80)}` })),
      confidence: results.every((r) => r.exitCode === 0) ? 0.85 : 0.4,
      durationMs: 0,
      log: [
        `mode=${live ? 'live' : 'dry-run'}`,
        `commands=${results.length}`,
        `denied=${results.filter((r) => r.exitCode === 126).length}`,
      ],
    };
  },
};

function proposeCommands(prompt: string, step: string): string[] {
  const lower = prompt.toLowerCase();
  const out: string[] = [];
  if (lower.includes('test') || lower.includes('verify') || step.toLowerCase().includes('vérifier')) {
    out.push('npm test --silent');
  }
  if (lower.includes('typecheck') || lower.includes('type')) {
    out.push('npx tsc --noEmit');
  }
  if (lower.includes('lint')) {
    out.push('npx eslint . --max-warnings=0');
  }
  if (lower.includes('refactor') || lower.includes('clean')) {
    out.push('git status --porcelain');
  }
  if (out.length === 0) out.push('git status --porcelain');
  return out;
}
