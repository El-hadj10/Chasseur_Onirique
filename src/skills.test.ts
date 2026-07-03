// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../LICENSE
import { describe, it, expect } from 'vitest';
import { loadSkills } from './skills.js';

describe('loadSkills', () => {
  it('discovers both shipped skills in .agents/skills', () => {
    const skills = loadSkills(['.agents/skills']);
    expect(skills.map((s) => s.name).sort()).toEqual(['refactor-tactics', 'research-tactics']);
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
      'research-tactics': '# Research',
      'refactor-tactics': '# Refactor',
    };
    const skills = loadSkills(['.agents/skills']);
    for (const s of skills) {
      const heading = expectedHeading[s.name];
      expect(heading, `missing expected-heading entry for skill "${s.name}"`).toBeDefined();
      expect(s.body).toContain(heading);
    }
  });
});
