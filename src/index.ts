#!/usr/bin/env node
// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see LICENSE)
// =============================================================================

/**
 * Chasseur Onirique CLI entry.
 *
 * Usage:
 *   chasseur-onirique "refactor le composant Login pour qu'il soit testable"
 *   chasseur-onirique --demo
 *
 * No API key required. Agents are heuristic but the *plumbing* is faithful
 * to the Buffy parent orchestrator: Plan → fan-out agents → merge notes → reflect.
 */

import { Orchestrator, type OrchestratorReport } from './orchestrator.js';
import { HeuristicPlanner } from './planner.js';
import { Logger } from './logger.js';
import { createAgentRegistry } from './agents/registry.js';

const DEMO_PROMPT =
  "Refactor the Login component so it becomes unit-testable. Don't break the public API.";

function parseArgs(argv: string[]): { prompt: string; rootDir: string; demo: boolean } {
  let prompt = '';
  let rootDir = process.cwd();
  let demo = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--prompt' || a === '-p') {
      prompt = argv[++i] ?? '';
    } else if (a === '--root') {
      rootDir = argv[++i] ?? process.cwd();
    } else if (a === '--demo') {
      demo = true;
    } else if (a && !a.startsWith('-')) {
      prompt = a;
    }
  }
  return { prompt, rootDir, demo };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const prompt = args.demo ? DEMO_PROMPT : args.prompt;
  if (!prompt) {
    process.stderr.write(
      'Usage: chasseur-onirique "your prompt here"\n       chasseur-onirique --demo\n',
    );
    process.exit(2);
  }

  const log = new Logger('cli');
  log.info(`chasseur-onirique v0.2.0 — root: ${args.rootDir}`);

  const agents = createAgentRegistry();

  const orchestrator = new Orchestrator(agents, {
    rootDir: args.rootDir,
    maxParallelAgents: 3,
    skillsDirs: ['.agents/skills'],
  });

  const planner = new HeuristicPlanner();
  const plan = await planner.makePlan(prompt);

  const report: OrchestratorReport = await orchestrator.run(prompt, plan);

  process.stdout.write(`\n================ REPORT ================\n`);
  process.stdout.write(`${report.summary}\n`);
  process.stdout.write(`========================================\n`);
  process.stdout.write(`agents fired: ${report.outputs.length}\n`);
  process.stdout.write(`duration:     ${report.durationMs} ms\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
