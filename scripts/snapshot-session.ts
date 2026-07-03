#!/usr/bin/env tsx
// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see LICENSE)
// =============================================================================

/**
 * snapshot-session — capture an orchestrator run as a portable JSON transcript.
 *
 * Usage:
 *   npm run snapshot -- "refactor the Login component"
 *   npm run snapshot -- --demo
 *   npx tsx scripts/snapshot-session.ts --demo --out sessions
 *
 * Output:
 *   <outDir>/<ISO-timestamp>.json   — full report (prompt, plan, outputs, skills, summary)
 *   <outDir>/<ISO-timestamp>.txt    — human-readable transcript (matches examples/* style)
 *   <outDir>/index.json             — sorted list of every capture
 *
 * Why:
 *   The hand-captured demo transcripts in examples/ drift over time. This tool
 *   makes capture trivial: one command, two files. Use it to regenerate the
 *   examples/ transcripts whenever the orchestrator's output shape changes.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Orchestrator, type OrchestratorReport } from '../src/orchestrator.js';
import { HeuristicPlanner } from '../src/planner.js';
import { Logger } from '../src/logger.js';
import { createAgentRegistry } from '../src/agents/registry.js';

const DEMO_PROMPT =
  "Refactor the Login component so it becomes unit-testable. Don't break the public API.";

interface ParsedArgs {
  prompt: string;
  rootDir: string;
  demo: boolean;
  outDir: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  let prompt = '';
  let rootDir = process.cwd();
  let demo = false;
  let outDir = 'sessions';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--demo') demo = true;
    else if (a === '--root') rootDir = argv[++i] ?? process.cwd();
    else if (a === '--out') outDir = argv[++i] ?? 'sessions';
    else if (a && !a.startsWith('-')) prompt = a;
  }
  return { prompt, rootDir, demo, outDir };
}

interface IndexEntry {
  timestamp: string;
  json: string;
  txt: string;
  prompt: string;
  agentsFired: number;
  durationMs: number;
}
interface IndexFile {
  captures: IndexEntry[];
}

function buildTranscript(report: OrchestratorReport): string {
  // Matches the format of examples/refactor-demo.md so captures are
  // directly diff-able against the curated transcripts.
  return [
    `[snapshot] prompt: ${report.prompt}`,
    `[snapshot] started: ${report.startedAt}`,
    `[snapshot] duration: ${report.durationMs} ms`,
    `[snapshot] agents fired: ${report.outputs.length}`,
    `[snapshot] skills: ${report.skills.map((s) => s.name).join(', ')}`,
    '',
    '================ REPORT ================',
    report.summary,
    '========================================',
    `agents fired: ${report.outputs.length}`,
    `duration:     ${report.durationMs} ms`,
    '',
  ].join('\n');
}

function loadOrInitIndex(indexPath: string): IndexFile {
  if (!existsSync(indexPath)) return { captures: [] };
  try {
    return JSON.parse(readFileSync(indexPath, 'utf8')) as IndexFile;
  } catch {
    return { captures: [] };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const prompt = args.demo ? DEMO_PROMPT : args.prompt;
  if (!prompt) {
    process.stderr.write(
      'Usage: snapshot-session "your prompt here"\n' +
        '       snapshot-session --demo\n' +
        '       snapshot-session --out captures\n',
    );
    process.exit(2);
  }

  const outDir = resolve(process.cwd(), args.outDir);
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const log = new Logger('cli');
  log.info(`chasseur-onirique v0.2.0 — snapshot — root: ${args.rootDir}`);

  const agents = createAgentRegistry();

  const orchestrator = new Orchestrator(agents, {
    rootDir: args.rootDir,
    maxParallelAgents: 3,
    skillsDirs: ['.agents/skills'],
  });
  const planner = new HeuristicPlanner();
  const plan = await planner.makePlan(prompt);
  const report = await orchestrator.run(prompt, plan);

  const ts = report.startedAt.replace(/[:.]/g, '-');
  const base = join(outDir, ts);
  const jsonPath = `${base}.json`;
  const txtPath = `${base}.txt`;
  const indexPath = join(outDir, 'index.json');

  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');
  writeFileSync(txtPath, buildTranscript(report), 'utf8');

  const index = loadOrInitIndex(indexPath);
  index.captures.push({
    timestamp: report.startedAt,
    json: `${ts}.json`,
    txt: `${ts}.txt`,
    prompt: report.prompt,
    agentsFired: report.outputs.length,
    durationMs: report.durationMs,
  });
  index.captures.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf8');

  log.info(`snapshot written:  ${jsonPath}`);
  log.info(`transcript written: ${txtPath}`);
  log.ok(`index updated:      ${indexPath} (${index.captures.length} capture${index.captures.length === 1 ? '' : 's'})`);
}

main().catch((err: unknown) => {
  process.stderr.write(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
