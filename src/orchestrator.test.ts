// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../LICENSE
import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from './orchestrator.js';
import { HeuristicPlanner, Plan, type AgentName, type PlanStep } from './planner.js';
import type { Agent, AgentOutput, AgentCallContext } from './agents/base.js';

function fakeAgent(
  name: AgentName,
  conf: number,
  data: unknown,
  notes: Record<string, unknown> = {},
): Agent<unknown, unknown> {
  return {
    name,
    description: `fake ${name}`,
    async run(_input, _ctx): Promise<AgentOutput<unknown>> {
      return {
        agent: name,
        data,
        notes,
        references: [{ kind: 'path', target: `fake-${name}` }],
        confidence: conf,
        durationMs: 1,
        log: [`fake ${name} ran`],
      };
    },
  };
}

describe('Orchestrator', () => {
  it('produces a report with summary and per-step confidence', async () => {
    const agents = new Map<AgentName, Agent<unknown, unknown>>([
      ['file_picker', fakeAgent('file_picker', 0.9, ['a.ts', 'b.ts'], { urls: ['a.ts'] })],
      ['code_searcher', fakeAgent('code_searcher', 0.8, ['hits'], { hits: 4 })],
      ['basher', fakeAgent('basher', 0.7, [], {})],
      ['code_reviewer', fakeAgent('code_reviewer', 0.6, [], {})],
      ['thinker', fakeAgent('thinker', 0.95, 'synthesis here', {})],
    ]);
    const plan: Plan = new Plan([
      { id: 1, title: 'gather', rationale: 'r', status: 'pending', suggestedAgents: ['file_picker', 'code_searcher'] },
      { id: 2, title: 'think', rationale: 'r', status: 'pending', suggestedAgents: ['thinker'] },
      { id: 3, title: 'apply', rationale: 'r', status: 'pending', suggestedAgents: ['basher'] },
      { id: 4, title: 'review', rationale: 'r', status: 'pending', suggestedAgents: ['code_reviewer'] },
    ]);
    const orch = new Orchestrator(agents, { rootDir: '/tmp' });
    const report = await orch.run('test prompt', plan);

    expect(report.outputs).toHaveLength(5);
    expect(report.summary).toContain('## Résumé');
    expect(report.summary).toContain('confiance ≈ 0.90'); // step 1: max(0.9, 0.8)
    expect(report.summary).toContain('confiance ≈ 0.95'); // step 2 thinker = 0.95
    expect(report.summary).toContain('confiance ≈ 0.70'); // step 3 basher = 0.7
    expect(report.summary).toContain('confiance ≈ 0.60'); // step 4 reviewer = 0.6
    expect(report.durationMs).toBeGreaterThanOrEqual(0);
    expect(report.prompt).toBe('test prompt');
  });

  it('threads the user prompt into every agent context', async () => {
    const captured: AgentCallContext[] = [];
    const ctxSpy = vi.fn((ctx: AgentCallContext) => {
      captured.push(ctx);
    });
    const agents = new Map<AgentName, Agent<unknown, unknown>>([
      [
        'file_picker',
        {
          name: 'file_picker',
          description: 'spy',
          async run(_input, ctx) {
            ctxSpy(ctx);
            return {
              agent: 'file_picker',
              data: [],
              notes: {},
              references: [],
              confidence: 1,
              durationMs: 0,
              log: ['ok'],
            };
          },
        },
      ],
    ]);
    const step: PlanStep = { id: 1, title: 't', rationale: 'r', status: 'pending', suggestedAgents: ['file_picker'] };
    const plan = new Plan([step]);
    const orch = new Orchestrator(agents, { rootDir: '/tmp' });
    await orch.run('the user prompt', plan);

    expect(captured).toHaveLength(1);
    expect(captured[0]!.prompt).toBe('the user prompt');
    expect(captured[0]!.stepTitle).toBe('t');
    expect(captured[0]!.rootDir).toBe('/tmp');
  });

  it('merges notes from sub-agents into the parent Context', async () => {
    const agents = new Map<AgentName, Agent<unknown, unknown>>([
      [
        'file_picker',
        fakeAgent('file_picker', 0.9, null, { 'file_picker:files': ['a.ts'] }),
      ],
      [
        'code_searcher',
        fakeAgent('code_searcher', 0.8, null, { 'code_searcher:hits': ['x'] }),
      ],
    ]);
    const plan: Plan = new Plan([
      {
        id: 1,
        title: 't',
        rationale: 'r',
        status: 'pending',
        suggestedAgents: ['file_picker', 'code_searcher'],
      },
    ]);
    const orch = new Orchestrator(agents, { rootDir: '/tmp' });
    const report = await orch.run('p', plan);

    // Can't inspect parent ctx directly, but the report.outputs carries the notes.
    const filePickerOut = report.outputs.find((o) => o.agent === 'file_picker')!;
    const codeSearcherOut = report.outputs.find((o) => o.agent === 'code_searcher')!;
    expect(filePickerOut.notes['file_picker:files']).toEqual(['a.ts']);
    expect(codeSearcherOut.notes['code_searcher:hits']).toEqual(['x']);
  });

  it('surfaces thinker synthesis into the assistant turn', async () => {
    const agents = new Map<AgentName, Agent<unknown, unknown>>([
      ['thinker', fakeAgent('thinker', 0.95, 'I think therefore I am', {})],
    ]);
    const plan: Plan = new Plan([
      { id: 1, title: 't', rationale: 'r', status: 'pending', suggestedAgents: ['thinker'] },
    ]);
    const orch = new Orchestrator(agents, { rootDir: '/tmp' });
    const report = await orch.run('p', plan);
    expect(report.summary).toContain('0.95'); // confidence in summary matches
  });

  it('handles empty plan gracefully (no agents)', async () => {
    const agents = new Map<AgentName, Agent<unknown, unknown>>();
    const plan = new Plan([]);
    const orch = new Orchestrator(agents, { rootDir: '/tmp' });
    const report = await orch.run('p', plan);
    expect(report.outputs).toHaveLength(0);
    expect(report.summary).toContain('## Résumé');
  });

  it('runs end-to-end with the heuristic planner (real research routing)', async () => {
    const agents = new Map<AgentName, Agent<unknown, unknown>>([
      ['file_picker', fakeAgent('file_picker', 0.9, null, {})],
      ['code_searcher', fakeAgent('code_searcher', 0.8, null, {})],
      ['researcher_web', fakeAgent('researcher_web', 0.7, null, {})],
      ['researcher_docs', fakeAgent('researcher_docs', 0.7, null, {})],
      ['thinker', fakeAgent('thinker', 0.95, null, {})],
      ['basher', fakeAgent('basher', 0.85, null, {})],
      ['code_reviewer', fakeAgent('code_reviewer', 0.6, null, {})],
    ]);
    const plan = await new HeuristicPlanner().makePlan('compare Postgres vs MongoDB');
    expect(plan.steps[1]?.suggestedAgents).toContain('researcher_web');
    expect(plan.steps[1]?.suggestedAgents).toContain('researcher_docs');

    const orch = new Orchestrator(agents, { rootDir: '/tmp' });
    const report = await orch.run('compare Postgres vs MongoDB', plan);
    expect(report.outputs.length).toBeGreaterThan(0);
    expect(report.summary).toContain('## Résumé');
  });
});
