// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../LICENSE
import { describe, it, expect } from 'vitest';
import { loadSkills } from './skills.js';

describe('loadSkills', () => {
  it('discovers all three shipped skills in .agents/skills', () => {
    const skills = loadSkills(['.agents/skills']);
    expect(skills.map((s) => s.name).sort()).toEqual([
      'chasseur-onirique',
      'refactor-tactics',
      'research-tactics',
    ]);
  });

  it('parses each description from the YAML front-matter', () => {
    // Guard against the regression: putting a non-`---` line (e.g. an HTML
    // comment) BEFORE the opening `---` defeats the front-matter regex
    // (`^---\s*\n…`), so `description` falls back to '' and the orchestrator's
    // skill manifest drops the tagline.
    const skills = loadSkills(['.agents/skills']);
    for (const s of skills) {
      expect(s.description.length).toBeGreaterThan(8);
    }
  });

  it('keeps the markdown body intact (each skill keeps its own heading)', () => {
    // Each skill body must contain its OWN heading — this guards against
    // body corruption (e.g. a stray frontmatter re-parse leaving an empty body).
    // The map assertion fails LOUDLY if a new skill is added without
    // updating the expected entries (rather than passing silently).
    const expectedHeading: Record<string, string> = {
      'chasseur-onirique': '# Chasseur Onirique',
      'refactor-tactics': '# Refactor',
      'research-tactics': '# Research',
    };
    const skills = loadSkills(['.agents/skills']);
    for (const s of skills) {
      const heading = expectedHeading[s.name];
      expect(heading, `missing expected-heading entry for skill "${s.name}"`).toBeDefined();
      expect(s.body).toContain(heading);
    }
  });
});

describe('chasseur-onirique skill (meta)', () => {
  it('exists and documents the project commands, laws, and safety rules', () => {
    // The meta-skill is what makes the project self-aware: when a future
    // session mentions "Chasseur Onirique" in the prompt, the orchestrator
    // loads this skill and the agents learn the project's invariants
    // before touching any file.
    const skill = loadSkills(['.agents/skills']).find(
      (s) => s.name === 'chasseur-onirique',
    );
    expect(skill, 'chasseur-onirique skill should be loaded').toBeDefined();
    // Commands documented
    expect(skill!.body).toContain('npm run demo');
    expect(skill!.body).toContain('npm test');
    // Safety documented
    expect(skill!.body).toContain('CHASSEUR_ONIRIQUE_LIVE');
    // Known gap honestly named
    expect(skill!.body).toContain('rm -r -f /');
  });

  it('is not the only self-referencing skill (defensive against accidental solo state)', () => {
    // If only the meta-skill loads, something is off — we want the two
    // original behaviour skills present too.
    const skills = loadSkills(['.agents/skills']);
    const names = new Set(skills.map((s) => s.name));
    expect(names.has('refactor-tactics')).toBe(true);
    expect(names.has('research-tactics')).toBe(true);
  });
});
