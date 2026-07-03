// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../LICENSE
import { describe, it, expect, vi } from 'vitest';
import { Context } from './context.js';

describe('Context', () => {
  it('push appends a message and size grows', async () => {
    const ctx = new Context({ maxMessages: 5 });
    await ctx.push('user', 'hello');
    await ctx.push('assistant', 'world');
    expect(ctx.size()).toBe(2);
  });

  it('respects maxMessages and trims oldest on overflow', async () => {
    const ctx = new Context({ maxMessages: 3 });
    for (const c of ['a', 'b', 'c', 'd', 'e']) await ctx.push('user', c);
    expect(ctx.size()).toBeLessThanOrEqual(3);
    const snap = ctx.snapshot();
    expect(snap[snap.length - 1]?.content).toBe('e');
  });

  it('invokes summarizer and unshifts the summary on overflow', async () => {
    const summarize = vi.fn(async (msgs: { content: string }[]) =>
      `TLDR of ${msgs.length} turns`,
    );
    const ctx = new Context({ maxMessages: 4, summarizer: summarize });
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) await ctx.push('user', c);
    expect(summarize).toHaveBeenCalled();
    const first = ctx.snapshot()[0];
    expect(first?.role).toBe('system');
    expect(first?.content).toContain('Summary');
    expect(first?.content).toContain('TLDR');
  });

  it('swallows summarizer failures and keeps the window intact', async () => {
    const summarize = vi.fn(async () => {
      throw new Error('boom');
    });
    const ctx = new Context({ maxMessages: 4, summarizer: summarize });
    for (const c of ['a', 'b', 'c', 'd', 'e', 'f']) await ctx.push('user', c);
    expect(summarize).toHaveBeenCalled();
    // window still has messages, no errant unshift
    expect(ctx.size()).toBeGreaterThan(0);
  });

  it('snapshot returns a shallow copy of every message', async () => {
    const ctx = new Context();
    await ctx.push('user', 'x');
    const a = ctx.snapshot();
    const b = ctx.snapshot();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
    expect(a[0]?.content).toBe('x');
  });

  describe('notes()', () => {
    it('round-trips primitives', () => {
      const ctx = new Context();
      ctx.notes().set('k', 42);
      expect(ctx.notes().get('k')).toBe(42);
    });

    it('round-trips objects', () => {
      const ctx = new Context();
      ctx.notes().set('obj', { a: 1 });
      expect(ctx.notes().get<{ a: number }>('obj')).toEqual({ a: 1 });
    });

    it('delete works', () => {
      const ctx = new Context();
      ctx.notes().set('k', 'v');
      ctx.notes().delete('k');
      expect(ctx.notes().get('k')).toBeUndefined();
    });

    it('entries() returns all pairs', () => {
      const ctx = new Context();
      ctx.notes().set('a', 1);
      ctx.notes().set('b', 2);
      expect(ctx.notes().entries()).toHaveLength(2);
    });
  });
});
