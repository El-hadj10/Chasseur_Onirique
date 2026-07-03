#!/usr/bin/env tsx
// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see LICENSE)
// =============================================================================

/**
 * self-check — Chasseur Onirique audits Chasseur Onirique.
 *
 * The orchestrator is invoked with a prompt asking it to find divergences
 * between the project's docs (README.md, GITHUB_PROFILE_README.md,
 * docs/*.md, .agents/skills/chasseur-onirique/SKILL.md) and its code
 * (TypeScript files under src/ and the scripts directory, plus the meta-skill).
 * The full transcript + a divergence verdict are written to
 * docs/audits/<ISO-timestamp>.md.
 *
 * Exit codes:
 *   0 — no divergence markers found (docs and code are aligned)
 *   1 — divergence markers found (a human should read the report)
 *   2 — fatal error (orchestrator failed to run, audit could not be written)
 *
 * Usage:
 *   npm run self-check
 *   CHASSEUR_ONIRIQUE_LIVE=1 npm run self-check
 *
 * Why this exists: the meta-skill (.agents/skills/chasseur-onirique/SKILL.md)
 * documents the project's invariants, but documentation drifts. This script
 * is the dogfooding version: the project runs its own orchestrator on its
 * own files and reports where reality has stopped matching the doc.
 *
 * Limitations (v1, dumb detector):
 *   - Divergence detection is keyword-based on the thinker + code_reviewer
 *     output. It may false-positive on benign occurrences of "docs say" or
 *     "mismatch" in legitimate contexts.
 *   - It is not a substitute for human review. The exit code is a hint, not
 *     a verdict.
 *   - For a smarter detector, see devlog/v0.2.0.md "The debt I'm taking on."
 *
 * Implementation note: avoid the pattern of two consecutive asterisks
 * followed by a slash inside JSDoc comments — esbuild treats it as a
 * comment terminator (the close-delimiter of a JSDoc block is star-slash,
 * and that pattern contains it). The previous version of this file hit a
 * silent exit 1 because of this. The fix is to spell out BOTH the pattern
 * (two-stars-then-slash) AND the close-delimiter (star-slash) in prose,
 * never to inline either one — backticks do not protect against either
 * trap, because JSDoc has no nested-context parsing.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Orchestrator, type OrchestratorReport } from '../src/orchestrator.js';
import { HeuristicPlanner } from '../src/planner.js';
import { Logger } from '../src/logger.js';
import { createAgentRegistry } from '../src/agents/registry.js';

const AUDIT_PROMPT = [
  'Audit this project for doc/code divergence.',
  'Read the documentation:',
  '  - README.md',
  '  - GITHUB_PROFILE_README.md',
  '  - docs/*.md (especially docs/agents.md, docs/tools.md, docs/deny-list.md)',
  '  - .agents/skills/chasseur-onirique/SKILL.md',
  '  - CONTRIBUTING.md',
  '  - ARCHITECTURE.md',
  '',
  'Read the code:',
  '  - all .ts files under src/ (recursively)',
  '  - scripts/*.ts',
  '  - .agents/skills/*/SKILL.md',
  '',
  'For every place where the docs make a concrete, verifiable claim that',
  'does NOT match the code, list it as a separate section. For each',
  'divergence, give: (1) the doc claim (with file:line), (2) the code',
  'reality (with file:line), (3) a one-line recommended fix.',
  '',
  'If the docs and code are fully aligned, say so explicitly.',
  '',
  'Use ### headings to delimit each divergence. Use the phrase',
  '"DOC/CODE DIVERGENCE:" at the start of each ### section heading so the',
  'auditor can grep for them mechanically.',
].join('\n');

const DIVERGENCE_HEADING_MARKER = 'DOC/CODE DIVERGENCE';

const DIVERGENCE_KEYWORDS = [
  'divergence',
  'mismatch',
  'inconsistent',
  'stale',
  'does not match',
  'contradicts',
  'docs say',
  'doc claims',
  'in reality',
  'actually',
];

interface AuditResult {
  report: OrchestratorReport;
  thinkerText: string;
  reviewerText: string;
  divergenceHeadings: string[];
  keywordHits: string[];
  exitCode: number;
}

async function runAudit(rootDir: string): Promise<AuditResult> {
  const log = new Logger('self-check');
  log.info(`chasseur-onirique v0.2.0 — self-check — root: ${rootDir}`);

  const agents = createAgentRegistry();
  const orchestrator = new Orchestrator(agents, {
    rootDir,
    maxParallelAgents: 3,
    skillsDirs: ['.agents/skills'],
  });
  const planner = new HeuristicPlanner();
  const plan = await planner.makePlan(AUDIT_PROMPT);
  const report = await orchestrator.run(AUDIT_PROMPT, plan);

  const thinkerOut = report.outputs.find((o) => o.agent === 'thinker');
  const reviewerOut = report.outputs.find((o) => o.agent === 'code_reviewer');
  const thinkerText = typeof thinkerOut?.data === 'string' ? thinkerOut.data : '';
  const reviewerText = typeof reviewerOut?.data === 'string' ? reviewerOut.data : '';

  const combined = `${thinkerText}\n${reviewerText}`.toLowerCase();
  const keywordHits = DIVERGENCE_KEYWORDS.filter((k) => combined.includes(k));

  // Each divergence is marked with "DOC/CODE DIVERGENCE:" — grep the headings.
  const divergenceHeadings: string[] = [];
  const headingRegex = /^###\s+(.*)$/gm;
  for (const m of thinkerText.matchAll(headingRegex)) {
    if (m[1].includes(DIVERGENCE_HEADING_MARKER)) {
      divergenceHeadings.push(m[1].trim());
    }
  }
  for (const m of reviewerText.matchAll(headingRegex)) {
    if (m[1].includes(DIVERGENCE_HEADING_MARKER)) {
      divergenceHeadings.push(m[1].trim());
    }
  }

  // Deterministic verdict: heading markers take priority, then keyword hits.
  const exitCode = divergenceHeadings.length > 0 || keywordHits.length >= 3 ? 1 : 0;

  return { report, thinkerText, reviewerText, divergenceHeadings, keywordHits, exitCode };
}

function buildAuditMarkdown(
  timestamp: string,
  rootDir: string,
  result: AuditResult,
): string {
  const { report, thinkerText, reviewerText, divergenceHeadings, keywordHits, exitCode } = result;
  const verdict =
    exitCode === 0
      ? '✅ No divergence detected — docs and code are aligned.'
      : `⚠️  ${divergenceHeadings.length} explicit divergence(s) and ${keywordHits.length} keyword hit(s) — read the report.`;

  const lines: string[] = [
    `# Self-check audit — ${timestamp}`,
    '',
    `**Project root:** \`${rootDir}\``,
    `**Duration:** ${report.durationMs} ms`,
    `**Plan steps executed:** ${report.plan.length}`,
    `**Agents fired:** ${Array.from(new Set(report.outputs.map((o) => o.agent))).join(', ')}`,
    `**Skills loaded:** ${report.skills.map((s) => s.name).join(', ')}`,
    '',
    '## Verdict',
    '',
    verdict,
    '',
    '### Detection signals',
    '',
    `- **Explicit divergence headings** (each \`### ${DIVERGENCE_HEADING_MARKER}: ...\` counts as one): **${divergenceHeadings.length}**`,
    `- **Keyword hits** in the thinker + code_reviewer output: **${keywordHits.length}**`,
    divergenceHeadings.length > 0
      ? `- Headings:\n${divergenceHeadings.map((h) => `  - ${h}`).join('\n')}`
      : '- Headings: (none)',
    keywordHits.length > 0
      ? `- Keywords hit: \`${keywordHits.join('`, `')}\``
      : '- Keywords hit: (none)',
    '',
    'Exit code: ' + String(exitCode) + (exitCode === 0 ? ' (clean)' : ' (human review required)'),
    '',
    '---',
    '',
    '## Per-step plan',
    '',
    ...report.plan.map((s) => `- **${s.id}.** ${s.title} → ${s.suggestedAgents.join(', ')} _(${s.status})_`),
    '',
    '---',
    '',
    '## Thinker synthesis',
    '',
    thinkerText.length > 0
      ? thinkerText
      : '_(no thinker output — the agent was not invoked or returned a non-string payload)_',
    '',
    '---',
    '',
    '## Code reviewer verdict',
    '',
    reviewerText.length > 0
      ? reviewerText
      : '_(no code_reviewer output — the agent was not invoked or returned a non-string payload)_',
    '',
    '---',
    '',
    '## How to interpret this report',
    '',
    'This file was produced by `scripts/self-check.ts` running the project’s own',
    'orchestrator against the project itself (dogfooding). The exit code is a',
    'hint, not a verdict:',
    '',
    '- **Exit 0** means no `### DOC/CODE DIVERGENCE` heading was emitted by the',
    '  thinker or code_reviewer, AND fewer than 3 of the keyword triggers fired.',
    '  This is a *signal*, not a proof of alignment — a clean run is consistent',
    '  with alignment, not sufficient to guarantee it.',
    '- **Exit 1** means the orchestrator surfaced at least one explicit divergence',
    '  heading, OR fired 3+ keyword triggers. Read the **Thinker synthesis** and',
    '  **Code reviewer verdict** sections below to see what was flagged.',
    '',
    'For the design rationale and known limitations, see `devlog/v0.2.0.md`.',
  ];
  return lines.join('\n');
}

async function main(): Promise<void> {
  const rootDir = resolve(process.cwd());
  const auditsDir = join(rootDir, 'docs', 'audits');
  mkdirSync(auditsDir, { recursive: true });

  const result = await runAudit(rootDir);
  const timestamp = result.report.startedAt.replace(/[:.]/g, '-');
  const auditPath = join(auditsDir, `${timestamp}.md`);
  const markdown = buildAuditMarkdown(timestamp, rootDir, result);

  writeFileSync(auditPath, markdown, 'utf8');

  const log = new Logger('self-check');
  log.ok(`audit written: ${auditPath}`);
  log.info(
    `verdict: ${result.divergenceHeadings.length} divergence(s), ${result.keywordHits.length} keyword hit(s) → exit ${result.exitCode}`,
  );

  process.exit(result.exitCode);
}

main().catch((err: unknown) => {
  process.stderr.write(
    `fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`,
  );
  process.exit(2);
});
