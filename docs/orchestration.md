# Orchestration in detail

> _What the conductor actually does, step by step._
> _Chasseur Onirique — by El-hadj Ousmane._

---

## The contract

```ts
class Orchestrator {
  constructor(
    agents: Map<AgentName, Agent<unknown, unknown>>,
    opts: OrchestratorOptions,
  );

  async run(prompt: string, plan: Plan): Promise<OrchestratorReport>;
}
```

`opts` includes:

- `rootDir: string` — base for any filesystem-relative agent
- `maxParallelAgents: number` — soft cap (default `Infinity`, orchestrator doesn't enforce it yet; suggested `3`)
- `skillsDirs: string[]` — directories to scan for `SKILL.md` files
- `tools: Map<string, ToolDescriptor>` — registry passed in for future wiring

## The loop

```
while (plan.remaining() > 0) {
  const step = plan.next();
  step.status = 'in_progress';

  await runStep(step, plan, prompt);

  step.status = 'done';
}
```

`runStep`:

```
1. Build a snapshot of the current Context (deep-cloned messages).
2. Build sharedNotes (the empty per-step note-pad).
3. For each suggested agent, schedule: safeRun(agent, { prompt, step }, callCtx).
4. Await Promise.all().
5. For each AgentOutput:
     a. For every (k, v) in output.notes, MERGE into Context.notes_(k).
     b. Push a 'tool' message summarising output.log.
     c. Stash references under `<stepId>:<agent>:refs`.
6. If a thinker ran, push its synthesis as 'assistant' message.
7. Return.
```

## Step lifecycle

| Status        | Set when                                         |
| :------------ | :----------------------------------------------- |
| `pending`     | Step is born, either from the planner or replaced |
| `in_progress` | Orchestrator has the focus on it                  |
| `done`        | All agents returned successfully                  |
| `skipped`     | Upstream signal — e.g. no suggested agents      |

A step is **done** iff *all* its suggested agents emitted an `AgentOutput`
(either with data or with `notes.error`). Even if there was an error, the step
moves forward — the orchestrator does not retry by default. Replanning happens
out-of-band (via the planner when called again).

## Parallel fan-out

`Promise.all(tasks)` over the suggested agents. There is no implicit
serialization. This is a deliberate trade-off:

- Pro: agents that take different lenses (e.g. `file_picker` + `code_searcher`) benefit from running concurrently.
- Con: `basher` and `write_file` would race if both ran in one step. The
  planner keeps them on separate steps to avoid this.

If you add a step that mixes read + write agents, either:

- keep them on separate steps, or
- introduce a `writeAgent`-only step and group reads into a read-only step.

## Failure triage

`safeRun` turns thrown exceptions into `{ notes: { error: … }, confidence: 0 }`.
`Orchestrator.runStep` does **not** halt on a failure — it merges the failure
note and moves on.

Why? Because partial information is still useful. A `code_searcher` failure
shouldn't block `file_picker`'s output from reaching the report.

If you want fail-fast semantics, wrap the run in your own driver and check the
report after the loop.

## Escape hatches

```ts
// Replan mid-stream
const newPlan = await planner.makePlan(newPrompt);
await orchestrator.run(prompt, newPlan);

// Inject a custom note (e.g. a CI run ID)
ctx.notes_().set('ci:build-id', process.env.BUILD_ID);
```

That's the entire extensibility surface.
