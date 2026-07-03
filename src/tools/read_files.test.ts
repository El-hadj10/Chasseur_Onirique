// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../../LICENSE
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readFilesTool } from './read_files.js';
import type { ToolContext } from './_schema.js';

describe('read_files', () => {
  let root: string;
  let ctx: ToolContext;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'cb-rf-'));
    ctx = { rootDir: root, dryRun: true };
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('reads existing files', async () => {
    writeFileSync(join(root, 'x.txt'), 'hello');
    writeFileSync(join(root, 'y.txt'), 'world');
    const out = await readFilesTool.run({ paths: ['x.txt', 'y.txt'] }, ctx);
    expect(out.files).toHaveLength(2);
    expect(out.files.map((f) => f.path).sort()).toEqual(['x.txt', 'y.txt']);
    expect(out.files.map((f) => f.content).sort()).toEqual(['hello', 'world']);
  });

  it('skips missing paths silently', async () => {
    writeFileSync(join(root, 'present.txt'), 'ok');
    const out = await readFilesTool.run(
      { paths: ['present.txt', 'absent.txt'] },
      ctx,
    );
    expect(out.files).toHaveLength(1);
    expect(out.files[0]?.path).toBe('present.txt');
  });

  it('caps file content at 64 KiB', async () => {
    const big = 'a'.repeat(128 * 1024);
    writeFileSync(join(root, 'big.txt'), big);
    const out = await readFilesTool.run({ paths: ['big.txt'] }, ctx);
    expect(out.files[0]?.size).toBe(128 * 1024);
    expect(out.files[0]?.content.length).toBe(64 * 1024);
  });
});
