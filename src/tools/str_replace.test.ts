// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../../LICENSE
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { strReplaceTool } from './str_replace.js';
import type { ToolContext } from './_schema.js';

describe('str_replace', () => {
  let root: string;
  let ctx: ToolContext;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cb-str-'));
    ctx = { rootDir: root, dryRun: false };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('patches the first occurrence by default', async () => {
    const file = join(root, 'a.txt');
    writeFileSync(file, 'hello world', 'utf8');
    const out = await strReplaceTool.run(
      { path: 'a.txt', oldString: 'world', newString: 'there' },
      ctx,
    );
    expect(out.replaced).toBe(1);
    expect(readFileSync(file, 'utf8')).toBe('hello there');
  });

  it('reports replaced=0 when no match', async () => {
    const file = join(root, 'a.txt');
    writeFileSync(file, 'hello world', 'utf8');
    const out = await strReplaceTool.run(
      { path: 'a.txt', oldString: 'absent', newString: 'x' },
      ctx,
    );
    expect(out.replaced).toBe(0);
  });

  it('rejects ambiguous patches (>1 match) unless allOccurrences', async () => {
    const file = join(root, 'a.txt');
    writeFileSync(file, 'foo foo foo', 'utf8');
    await expect(
      strReplaceTool.run(
        { path: 'a.txt', oldString: 'foo', newString: 'bar' },
        ctx,
      ),
    ).rejects.toThrow(/ambiguous/);
  });

  it('patches every occurrence when allOccurrences=true', async () => {
    const file = join(root, 'a.txt');
    writeFileSync(file, 'foo foo foo', 'utf8');
    const out = await strReplaceTool.run(
      { path: 'a.txt', oldString: 'foo', newString: 'bar', allOccurrences: true },
      ctx,
    );
    expect(out.replaced).toBe(3);
    expect(readFileSync(file, 'utf8')).toBe('bar bar bar');
  });

  it('respects dryRun (no write)', async () => {
    const file = join(root, 'a.txt');
    writeFileSync(file, 'hello', 'utf8');
    const dry = { rootDir: root, dryRun: true };
    const out = await strReplaceTool.run(
      { path: 'a.txt', oldString: 'hello', newString: 'bye' },
      dry,
    );
    expect(out.dryRun).toBe(true);
    expect(out.replaced).toBe(1);
    expect(readFileSync(file, 'utf8')).toBe('hello'); // unchanged on disk
  });

  it('accepts absolute paths and relativizes the result', async () => {
    const file = join(root, 'a.txt');
    writeFileSync(file, 'abs test', 'utf8');
    const out = await strReplaceTool.run(
      { path: file, oldString: 'abs', newString: 'rel' },
      ctx,
    );
    expect(out.path).toBe('a.txt');
  });
});
