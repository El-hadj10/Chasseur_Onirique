// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../LICENSE)
// =============================================================================

/**
 * Context manager.
 *
 * Chasseur Onirique's law #1: the parent agent does not keep full
 * conversation history forever.
 * We keep a rolling window of recent messages and a deterministic summary of evicted turns.
 * Specialized sub-agents receive a *snapshot* — they don't pollute the parent context.
 *
 * Concurrency: `push` is async. `await` it at every call site so the eviction
 * summary lands before the next push (no race between unshift and the next push).
 */

import type { Role, AgentMessage } from './agents/base.js';

export interface ContextOptions {
  maxMessages: number;
  summarizer?: (msgs: AgentMessage[]) => Promise<string>;
}

export interface ScopedNotes {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  delete(key: string): void;
  entries(): Array<[string, unknown]>;
}

export class Context {
  private messages: AgentMessage[] = [];
  private noteStore = new Map<string, unknown>();

  constructor(private readonly opts: ContextOptions = { maxMessages: 40 }) {}

  async push(role: Role, content: string, meta?: Record<string, unknown>): Promise<void> {
    this.messages.push({ role, content, meta });
    if (this.messages.length > this.opts.maxMessages) await this.evictOldest();
  }

  async pushBatch(batch: AgentMessage[]): Promise<void> {
    for (const m of batch) await this.push(m.role, m.content, m.meta);
  }

  private async evictOldest(): Promise<void> {
    const evictCount = Math.max(1, Math.floor(this.opts.maxMessages * 0.25));
    const evicted = this.messages.splice(0, evictCount);
    if (!this.opts.summarizer) return;
    try {
      const summary = await this.opts.summarizer(evicted);
      this.messages.unshift({
        role: 'system',
        content: `Summary of ${evicted.length} earlier turns:\n${summary}`,
        meta: { source: 'context-eviction' },
      });
    } catch {
      // Swallow summarizer failures — the worst case is a smaller rolling window.
    }
  }

  snapshot(): AgentMessage[] {
    return this.messages.map((m) => ({ ...m }));
  }

  notes(): ScopedNotes {
    const map = this.noteStore;
    return {
      get: <T>(k: string) => map.get(k) as T | undefined,
      set: <T>(k: string, v: T): void => { map.set(k, v); },
      delete: (k: string): void => { map.delete(k); },
      entries: () => Array.from(map.entries()),
    };
  }

  size(): number { return this.messages.length; }
}
