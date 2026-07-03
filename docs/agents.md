# Agents

Seven specialized sub-agents. Each is a single TypeScript file that exports an
`Agent<TIn, TOut>` named after its role.

> _Chasseur Onirique — by El-hadj Ousmane._

| Agent            | Purpose                                             | Notes keys                  | Real I/O?              |
| :--------------- | :-------------------------------------------------- | :-------------------------- | :--------------------- |
| `file_picker`    | Surface up to 12 relevant files                     | `file_picker:candidates`   | yes (disk read)        |
| `code_searcher`  | Grep the repo for patterns from the prompt         | `code_searcher:patterns`, `code_searcher:hits` | yes (spawn `grep`) |
| `basher`         | Run shell commands (dry-run by default)            | `basher:commands-run`, `basher:live` | yes (spawn `bash`) — gated by `CHASSEUR_ONIRIQUE_LIVE` and a deny-list |
| `researcher_web` | Up to 5 plausible web sources                       | `researcher_web:sources`   | no (deterministic stub) |
| `researcher_docs`| Doc URLs for known libraries                        | `researcher_docs:libraries`| no (deterministic stub) |
| `thinker`        | Synthesize shared notes → recommendation + tradeoffs| `thinker:synthesis`        | no (pure transform)    |
| `code_reviewer`  | Scan recently modified files for anti-patterns     | `code_reviewer:findings`, `code_reviewer:blockers` | yes (disk read, last 10 min only) |

---

## Input / output shape

```ts
Agent<{ prompt: string; step: string }, TOut>
```

- The orchestrator constructs `input = { prompt, stepTitle }` per agent.
- The orchestrator also wraps every agent call in `safeRun(agent, input, ctx)`
  which fills `durationMs` and converts thrown errors into a `notes.error` field
  with `confidence: 0` so the loop keeps going.

## What an agent **must not** do

1. Mutate the parent `Context`.
2. Call other agents.
3. Throw — convert to a `notes.error` payload.
4. Block longer than ~10 s without exposing progress through `log`.

## How to add a new agent

1. Create `src/agents/<name>.ts`.
2. Export `Agent<{ prompt: string; step: string }, TOut>` with a unique `AgentName`.
3. Register it in `src/agents/<file>` → `index.ts` (one line).
4. Add the name to the `AgentName` union in `src/planner.ts`.

That's it. The orchestrator picks it up from the registry automatically.

---

## Confidence calibration

`confidence` is the agent's self-assessment in `[0, 1]`. It is *not* a model
certainty — feel free to author it however you like. Suggested bands:

| Band   | Meaning                                                      |
| :----- | :----------------------------------------------------------- |
| `≤0.2` | Could not run / no relevant input                            |
| `0.3–0.5` | Ran with partial evidence; recommend human verification   |
| `0.5–0.8` | Ran cleanly; results align with the prompt                |
| `≥0.8` | Strong evidence; safe to act on without second look         |

The report's per-step "confiance" header reads from the highest `confidence`
among the outputs of that step.
