// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see LICENSE)
// =============================================================================

/**
 * Agent contract.
 *
 * Chasseur Onirique's law #3: agents are *pure* relative to the parent context.
 * They receive a snapshot (read-only context + scoped notes) and return
 * an AgentOutput. They must NEVER mutate the parent's Context.
 * The orchestrator merges the output's `notes` into the parent.
 *
 * (Local invariant — see the four laws in the meta-skill `.agents/skills/chasseur-onirique/SKILL.md`.)
 */

import type { AgentName } from '../planner.js';

export type Role = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentMessage {
  role: Role;
  content: string;
  meta?: Record<string, unknown>;
}

/** Read-only context snapshot given to an agent. */
export interface AgentCallContext {
  prompt: string;
  stepTitle: string;
  stepRationale: string;
  messages: AgentMessage[];
  sharedNotes: Readonly<Record<string, unknown>>;
  /** Project root — agents must NEVER hardcode process.cwd(). */
  rootDir: string;
  /** True by default; opt-out via CHASSEUR_ONIRIQUE_LIVE=1. */
  dryRun: boolean;
}

export interface AgentReference {
  kind: 'path' | 'url';
  target: string;
}

export interface AgentOutput<T> {
  agent: AgentName;
  data: T;
  /** Observable findings the orchestrator may merge into the parent context. */
  notes: Record<string, unknown>;
  /** Paths/URLs this agent actually looked at. */
  references: AgentReference[];
  /** 0..1 — the agent's self-assessment. */
  confidence: number;
  durationMs: number;
  /** Short human-readable trail of what the agent did. */
  log: string[];
}

export interface Agent<TIn, TOut> {
  readonly name: AgentName;
  readonly description: string;
  run(input: TIn, ctx: AgentCallContext): Promise<AgentOutput<TOut>>;
}

/** Tiny helper to wrap an agent's run() with timing and try/catch. */
export async function safeRun<TIn, TOut>(
  agent: Agent<TIn, TOut>,
  input: TIn,
  ctx: AgentCallContext,
): Promise<AgentOutput<TOut>> {
  const t0 = Date.now();
  try {
    const out = await agent.run(input, ctx);
    return { ...out, durationMs: Date.now() - t0 };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      agent: agent.name,
      data: undefined as unknown as TOut,
      notes: { error: message },
      references: [],
      confidence: 0,
      durationMs: Date.now() - t0,
      log: [`error: ${message}`],
    };
  }
}
