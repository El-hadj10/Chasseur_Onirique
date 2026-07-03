// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../../LICENSE
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { writeFileTool } from './write_file.js';
import type { ToolContext } from './_schema.js';

describe('write_file', () => {
  let root: string;
  let ctx: ToolContext;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cb-wf-'));
    ctx = { rootDir: root, dryRun: false };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('creates a file with the given content', async () => {
    const out = await writeFileTool.run(
      { path: 'hi.txt', content: 'hello there' },
      ctx,
    );
    expect(out.bytes).toBe(11);
    expect(readFileSync(join(root, 'hi.txt'), 'utf8')).toBe('hello there');
  });

  it('creates missing parent directories', async () => {
    const out = await writeFileTool.run(
      { path: 'a/b/c.txt', content: 'nested' },
      ctx,
    );
    expect(out.bytes).toBe(6);
    expect(readFileSync(join(root, 'a/b/c.txt'), 'utf8')).toBe('nested');
  });

  it('overwrites existing files', async () => {
    await writeFileTool.run({ path: 'a.txt', content: 'first' }, ctx);
    await writeFileTool.run({ path: 'a.txt', content: 'second' }, ctx);
    expect(readFileSync(join(root, 'a.txt'), 'utf8')).toBe('second');
  });

  it('respects dryRun (no write)', async () => {
    const dry = { rootDir: root, dryRun: true };
    const out = await writeFileTool.run(
      { path: 'dry.txt', content: 'should not land' },
      dry,
    );
    expect(out.dryRun).toBe(true);
    expect(() => readFileSync(join(root, 'dry.txt'), 'utf8')).toThrow();
  });
});
