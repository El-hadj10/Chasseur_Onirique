// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../LICENSE
import { describe, it, expect } from 'vitest';
import { HeuristicPlanner, Plan } from './planner.js';

describe('HeuristicPlanner', () => {
  it('always returns 4 steps', async () => {
    const p = await new HeuristicPlanner().makePlan('fix the bug');
    expect(p.steps).toHaveLength(4);
  });

  it('routes research prompts to web + docs', async () => {
    const p = await new HeuristicPlanner().makePlan('compare Postgres vs SQLite');
    expect(p.steps[1]?.suggestedAgents).toContain('researcher_web');
    expect(p.steps[1]?.suggestedAgents).toContain('researcher_docs');
    expect(p.steps[1]?.suggestedAgents).toContain('thinker');
  });

  it('routes investigation to deep thinker (no web)', async () => {
    const p = await new HeuristicPlanner().makePlan('why does the test flake on CI');
    expect(p.steps[1]?.suggestedAgents).toEqual(['thinker']);
  });

  it('routes refactor through basher with a refactor-flavoured rationale', async () => {
    const p = await new HeuristicPlanner().makePlan('refactor the auth module');
    expect(p.steps[2]?.suggestedAgents).toEqual(['basher']);
    expect(p.steps[2]?.rationale.toLowerCase()).toContain('refactor');
  });

  it('routes security prompts to pentest + thinker (no web)', async () => {
    const p = await new HeuristicPlanner().makePlan('audit the auth module for security issues');
    expect(p.steps[1]?.suggestedAgents).toContain('pentest');
    expect(p.steps[1]?.suggestedAgents).toContain('thinker');
    expect(p.steps[1]?.suggestedAgents).not.toContain('researcher_web');
    expect(p.steps[1]?.suggestedAgents).not.toContain('researcher_docs');
  });

  it('routes vulnerability / CVE prompts to pentest', async () => {
    const p = await new HeuristicPlanner().makePlan('check for known CVE in our deps');
    expect(p.steps[1]?.suggestedAgents).toContain('pentest');
  });

  it('always flags step 4 with code_reviewer', async () => {
    const p = await new HeuristicPlanner().makePlan('whatever');
    expect(p.steps[3]?.suggestedAgents).toContain('code_reviewer');
  });
});

describe('Plan', () => {
  it('next() returns the first pending step', () => {
    const plan = new Plan([
      { id: 1, title: 'a', rationale: '', status: 'pending', suggestedAgents: [] },
      { id: 2, title: 'b', rationale: '', status: 'pending', suggestedAgents: [] },
    ]);
    expect(plan.next()?.id).toBe(1);
  });

  it('mark(done) decrements remaining', () => {
    const plan = new Plan([
      { id: 1, title: 'a', rationale: '', status: 'pending', suggestedAgents: [] },
    ]);
    expect(plan.remaining()).toBe(1);
    plan.mark('done', 1);
    expect(plan.remaining()).toBe(0);
    expect(plan.next()).toBeUndefined();
  });

  it('mark(skip) also decrements remaining', () => {
    const plan = new Plan([
      { id: 1, title: 'a', rationale: '', status: 'pending', suggestedAgents: [] },
    ]);
    plan.mark('skipped', 1);
    expect(plan.remaining()).toBe(0);
  });
});
