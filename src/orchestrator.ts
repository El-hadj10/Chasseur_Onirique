// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see LICENSE)
// =============================================================================

/**
 * Orchestrator.
 *
 * The single place where agent outputs become parent context.
 *
 * Loop:
 *   1. pop next plan step
 *   2. fan-out: run all suggestedAgents in parallel
 *   3. merge notes + references into Context
 *   4. if a `thinker` was invoked, surface its synthesis in the conversation
 *   5. advance plan, mark step done
 *   6. at the end, emit a structured summary
 */

import { Context } from './context.js';
import { Logger } from './logger.js';
import { Plan, type AgentName } from './planner.js';
import { loadSkills, type Skill } from './skills.js';
import { safeRun, type AgentOutput } from './agents/base.js';
import type { Agent } from './agents/base.js';

export interface OrchestratorOptions {
  rootDir: string;
  maxParallelAgents?: number;
  skillsDirs?: string[];
}

export interface OrchestratorReport {
  prompt: string;
  startedAt: string;
  durationMs: number;
  plan: Plan['steps'];
  outputs: AgentOutput<unknown>[];
  skills: Skill[];
  summary: string;
}

export class Orchestrator {
  private readonly ctx: Context;
  private readonly log: Logger;
  private readonly agents: Map<AgentName, Agent<unknown, unknown>>;
  private readonly skills: Skill[];
  private readonly opts: OrchestratorOptions;
  private readonly outputs: AgentOutput<unknown>[] = [];
  /** Per-step output bucket — primary source for synthesis & confidence. */
  private readonly stepOutputs: Map<number, AgentOutput<unknown>[]> = new Map();

  constructor(
    agents: Map<AgentName, Agent<unknown, unknown>>,
    opts: OrchestratorOptions,
  ) {
    this.agents = agents;
    this.opts = opts;
    this.ctx = new Context({ maxMessages: 50 });
    this.log = new Logger('orchestrator');
    this.skills = loadSkills(opts.skillsDirs ?? []);
  }

  async run(prompt: string, plan: Plan): Promise<OrchestratorReport> {
    this.log.info(`🚀 run() — prompt: "${this.truncate(prompt, 70)}"`, {
      planSteps: plan.steps.length,
      agents: Array.from(this.agents.keys()),
      skills: this.skills.map((s) => s.name),
    });
    await this.ctx.push('user', prompt, { kind: 'prompt' });
    if (this.skills.length > 0) {
      const manifest = this.skills.map((s) => `- **${s.name}** — ${s.description}`).join('\n');
      await this.ctx.push('system', `Loaded skills:\n${manifest}`, { kind: 'skills' });
    }

    const t0 = Date.now();
    while ((plan.remaining()) > 0) {
      const step = plan.next();
      if (!step) break;
      step.status = 'in_progress';
      await this.runStep(step, plan, prompt);
      step.status = 'done';
      this.log.ok(`step ${step.id}/${plan.steps.length} done: ${step.title}`);
    }

    const summary = this.synthesize(plan);
    await this.ctx.push('assistant', summary, { kind: 'final' });
    return {
      prompt,
      startedAt: new Date(t0).toISOString(),
      durationMs: Date.now() - t0,
      plan: plan.steps,
      outputs: this.outputs,
      skills: this.skills,
      summary,
    };
  }

  private async runStep(
    step: Plan['steps'][number],
    _plan: Plan,
    prompt: string,
  ): Promise<void> {
    void _plan;
    this.log.info(`step ${step.id} → ${step.title}`, { agents: step.suggestedAgents });

    const snapshot = this.ctx.snapshot();
    const sharedNotes: Record<string, unknown> = {};
    const callCtx = {
      prompt,
      stepTitle: step.title,
      stepRationale: step.rationale,
      messages: snapshot,
      sharedNotes,
      rootDir: this.opts.rootDir,
      dryRun: process.env.CHASSEUR_ONIRIQUE_LIVE !== '1',
    };

    const tasks = step.suggestedAgents
      .map((name) => this.agents.get(name))
      .filter((a): a is Agent<unknown, unknown> => Boolean(a))
      .map(async (agent) => {
        this.log.debug(`spawn ${agent.name}`, { step: step.id });
        const input = { prompt, step: step.title };
        const result = await safeRun(agent, input, callCtx);
        this.outputs.push(result);
        const bucket = this.stepOutputs.get(step.id) ?? [];
        bucket.push(result);
        this.stepOutputs.set(step.id, bucket);
        this.log.ok(`${agent.name} done`, {
          conf: Number(result.confidence.toFixed(2)),
          refs: result.references.length,
        });
        return result;
      });

    const results = await Promise.all(tasks);

    // Merge notes & refs into parent context. THIS is where sub-agents
    // become parent context — nowhere else.
    for (const r of results) {
      for (const [k, v] of Object.entries(r.notes)) {
        const existing = this.ctx.notes().get<unknown>(k);
        this.ctx.notes().set(k, merge(existing, v));
      }
      this.ctx.notes().set(`${step.id}:${r.agent}:refs`, r.references);
      const trail = `[${r.agent}] ${r.log.join(' | ')}`;
      await this.ctx.push('tool', trail, { step: step.id, agent: r.agent, refs: r.references.length });
    }

    // If a thinker ran, surface its synthesis in the conversation.
    const thinkerOut = results.find((r) => r.agent === 'thinker');
    if (thinkerOut && typeof thinkerOut.data === 'string') {
      await this.ctx.push('assistant', thinkerOut.data, { step: step.id, kind: 'synthesis' });
    }
  }

  private synthesize(plan: Plan): string {
    const lines: string[] = [];
    lines.push('## Résumé de la session');
    for (const step of plan.steps) {
      const bucket = this.stepOutputs.get(step.id) ?? [];
      const refs = uniq(bucket.flatMap((o) => o.references)).slice(0, 5);
      const conf =
        bucket.length === 0
          ? 0
          : bucket.reduce((acc, o) => Math.max(acc, o.confidence), 0);
      lines.push(
        `- **${step.title}** (${step.suggestedAgents.join(', ') || 'no agents'}) — ` +
          `confiance ≈ ${conf.toFixed(2)}`,
      );
      if (refs.length) lines.push(`   refs: ${refs.map((r) => r.target).join(', ')}`);
    }
    return lines.join('\n');
  }

  private truncate(s: string, n: number): string {
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
  }
}

function merge(existing: unknown, incoming: unknown): unknown {
  if (existing === undefined) return incoming;
  if (Array.isArray(existing) && Array.isArray(incoming)) {
    return Array.from(new Set([...existing, ...incoming]));
  }
  if (existing && incoming && typeof existing === 'object' && typeof incoming === 'object') {
    return { ...(existing as object), ...(incoming as object) };
  }
  // Last-write wins for scalars.
  return incoming;
}

function uniq<T extends { target: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const r of arr) {
    if (seen.has(r.target)) continue;
    seen.add(r.target);
    out.push(r);
  }
  return out;
}
