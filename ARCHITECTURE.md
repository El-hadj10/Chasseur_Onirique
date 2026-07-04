# Architecture

> _The shape, not the substance._
> _Chasseur Onirique — by El-hadj Ousmane._

## The four laws of the Chasseur Onirique orchestrator

Codified here so future contributors don't drift:

1. **The parent never keeps all history.**
   `Context` rolls forward; evicted turns get summarized *deterministically* (`Context.evictOldest`).

2. **Commit before acting.**
   `HeuristicPlanner.makePlan(prompt)` is the only sanctioned way to convert a prompt into steps. Ad-hoc prompt → action is forbidden.

3. **Agents are pure relative to the parent.**
   `Agent.run(input, ctx)` receives a *snapshot*. It must not mutate the parent `Context`. It returns `AgentOutput`; the orchestrator merges notes.

4. **No agent calls another agent.**
   There is no `agent.spawn()` API. Cross-agent synthesis is the orchestrator's job. Depth is 1, by construction.

> _These four laws trace their lineage to the Buffy orchestrator (codebuff.com / Buffy). Chasseur Onirique is the local, runnable distillation: same pattern, zero API key, eight agents (the original seven plus `pentest`, added in v0.3.0)._

---

## Data flow

```
            ┌──────────────────────────────────────────────────────────┐
   prompt ──►│  HeuristicPlanner.makePlan(prompt) → Plan                │
            └──────────────────────────┬────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────────────────┐
            │  Orchestrator.run(prompt, plan)                           │
            │   loop:                                                   │
            │     step = plan.next()                                     │
            │     step.status = in_progress                              │
            │     await runStep(step)                                    │
            │       for agent in step.suggestedAgents:                   │
            │         output = await safeRun(agent, input, snapshot)     │
            │       for output in outputs:                               │
            │         merge(notes) into ctx.notes_()                      │
            │         ctx.push('tool', log, refs)                         │
            │       if thinker present: ctx.push('assistant', synthesis) │
            │     step.status = done                                     │
            └──────────────────────────┬────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────────────────┐
            │  OrchestratorReport { prompt, plan, outputs, summary }     │
            └──────────────────────────────────────────────────────────┘
```

---

## Type system at a glance

```ts
type Role = 'system' | 'user' | 'assistant' | 'tool';

interface AgentCallContext {          // read-only view handed to agents
  prompt: string;
  stepTitle: string;
  stepRationale: string;
  messages: AgentMessage[];           // immutable snapshot
  sharedNotes: Readonly<Record<string, unknown>>;
}

interface AgentOutput<T> {            // what each agent returns
  agent: AgentName;
  data: T;
  notes: Record<string, unknown>;     // keyed facts orchestrator may merge
  references: AgentReference[];       // paths/URLs
  confidence: number;                 // 0..1, self-reported
  durationMs: number;                 // filled by safeRun()
  log: string[];                      // short human trail
}

interface ToolDescriptor<TIn, TOut> { // the verb set
  name: string;
  description: string;
  schema: { type: 'object'; properties: Record<string, JSONSchema>; required?: string[] };
  run(input: TIn, ctx: ToolContext): Promise<TOut>;
}
```

---

## Module map

```
src/
├── index.ts              CLI entry — wires agents + tools + planner
├── orchestrator.ts       The single conductor (run, runStep, synthesize)
├── context.ts            Rolling window + scoped notes
├── planner.ts            Prompt → PlanStep[]
├── skills.ts             Loads .agents/skills/**/SKILL.md
├── logger.ts             Chalk-based event logger
├── agents/
│   ├── base.ts           Agent<TIn,TOut> contract + safeRun()
│   ├── file_picker.ts    Path-based scoring against prompt tokens
│   ├── code_searcher.ts  Wraps `grep -rni`
│   ├── basher.ts         Controlled shell, deny-list + dry-run by default
│   ├── researcher_web.ts Web-shaped scout (deterministic stub)
│   ├── researcher_docs.ts Doc-URL manifest per known library
│   ├── thinker.ts        Cross-step synthesis (pure transform)
│   ├── code_reviewer.ts  Anti-pattern scan on recently-touched files
│   ├── pentest.ts        NDJSON finding emitter (invoked via `npm run pentest` or the registry)
│   └── registry.ts       Central agent registry + `AgentName` union
└── tools/
    ├── _schema.ts        ToolDescriptor + JSONSchema
    ├── read_files.ts     Reads up to 64 KiB per file
    ├── write_file.ts     Atomic write (mkdir -p)
    ├── str_replace.ts    Surgical patch, refuses ambiguous edits
    ├── list_directory.ts Shallow listing
    ├── glob.ts           File-name pattern matcher (zero deps)
    ├── ask_user.ts       Question handshake (deterministic stub here)
    ├── write_todos.ts    Plan-shape validator (singleton version counter)
    ├── suggest_followups.ts Suggestion emitter
    └── index.ts          Barrel re-export
```

---

## Invariants worth protecting

| Invariant                                  | Enforced where                                       |
| :----------------------------------------- | :--------------------------------------------------- |
| Agents are read-only on the parent context | `AgentCallContext.sharedNotes` is `Readonly<...>`    |
| No `as any` in production types            | All agent outputs carry `data: T` not `any`          |
| `basher` cannot run destructive commands   | DENY regex list, plus dry-run default                |
| Edits refuse ambiguous patches             | `str_replace` throws if `occurrences > 1 && !all`    |
| Context can't grow forever                 | `Context.evictOldest` + configurable cap            |
| Plan is single-source-of-truth for flow    | `Plan.next()` is the only routing function           |
| Every source file carries the credit banner| Each `.ts` under `src/` is prefixed (CONTRIBUTING)   |

Add a test when you add a new invariant. The demo (`npm run demo`) is the smoke-test; type-level invariants are the unit tests.
