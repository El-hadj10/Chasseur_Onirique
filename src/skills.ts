// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../LICENSE)
// =============================================================================

/**
 * Skills loader.
 *
 * Skills are markdown stubs that teach the orchestrator a domain (deploy, fine-tune, …).
 * They are loaded at startup and can be referenced by name when a step matches.
 */

import { readFileSync, existsSync, readdirSync, type Dirent } from 'node:fs';
import { join } from 'node:path';

export interface Skill {
  name: string;
  description: string;
  body: string;
  source: string;
}

export function loadSkills(rootDirs: string[]): Skill[] {
  const out: Skill[] = [];
  for (const root of rootDirs) {
    if (!existsSync(root)) continue;
    const candidates = walk(root);
    for (const file of candidates) {
      if (!file.endsWith('SKILL.md')) continue;
      const raw = readFileSync(file, 'utf8');
      const { name, description, body } = parseFrontMatter(raw);
      out.push({
        name: name ?? file.replace(/\\/g, '/').split('/').slice(-2, -1)[0] ?? 'unknown',
        description: description ?? '',
        body,
        source: file,
      });
    }
  }
  return out;
}

function walk(dir: string): string[] {
  // Tiny recursive .md finder with .agents/skills scope.
  const results: string[] = [];
  const IGNORED = new Set(['node_modules', '.git', 'dist']);
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop()!;
    let entries: Dirent[];
    try {
      entries = readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const e of entries) {
      if (IGNORED.has(e.name)) continue;
      const full = join(cur, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile() && e.name.endsWith('.md')) results.push(full);
    }
  }
  return results;
}

function parseFrontMatter(raw: string): { name?: string; description?: string; body: string } {
  const m = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!m) return { body: raw };
  const meta: Record<string, string> = {};
  for (const line of m[1]!.split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { name: meta['name'], description: meta['description'], body: m[2]! };
}
