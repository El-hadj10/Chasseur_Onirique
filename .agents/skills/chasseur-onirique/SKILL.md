---
name: chasseur-onirique
description: When the prompt targets the Chasseur Onirique project itself (refactor, debug, add an agent, run the demo, change the deny-list), load this skill first.
---

<!-- Chasseur Onirique — (c) 2026 El-hadj Ousmane. Skill: meta (self-description). -->

# Chasseur Onirique — meta-skill

When the orchestrator's planner sees the Chasseur Onirique project name in a prompt, this skill pops into context. The point: bias the team toward working *with* the project's invariants, not around them.

## Before any action

1. **Read** `README.md` (project overview · the 7 agents · the four laws).
2. **Read** `GITHUB_PROFILE_README.md` for the public-facing brand.
3. **Read** `.agents/AGENTS.md` (if present) for session-local conventions.
4. **Check** `git log --oneline -10` to know what has just been done.
5. **Read the test first** for any file you intend to modify — the test is the spec.

## The 4 laws (do not break)

1. **The parent never keeps all history.** `Context` rolls forward; evicted turns get summarized *deterministically* (`Context.evictOldest`).
2. **Commit before acting.** `HeuristicPlanner.makePlan(prompt)` is the only sanctioned route from prompt to steps. Ad-hoc prompt → action is forbidden.
3. **Agents are pure relative to the parent.** They receive a *snapshot*; they do not mutate the parent `Context`. They return `AgentOutput`; the orchestrator merges notes.
4. **No agent calls another agent.** Depth is 1, by construction. The orchestrator does cross-agent synthesis.

> _These four laws are the project's foundational axioms. Chasseur Onirique is strictly local and self-contained. No external orchestrator — the system runs entirely from this skill and the codebase it ships with._

## Header convention (mandatory for new files)

Every `.ts` under `src/` carries this 4-line banner above its existing JSDoc:

```ts
// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../LICENSE)
// =============================================================================
```

Test files use the 1-line variant with the correct relative path to `LICENSE`:
```ts
// Chasseur Onirique — (c) 2026 El-hadj Ousmane — see ../../LICENSE
```

## Commands (canonical)

| Command | Role |
| :------ | :--- |
| `npm run demo` | The canonical entry. Runs `scripts/demo.sh` → `tsx src/index.ts --demo` and prints a session report. |
| `npm test` | Vitest — must stay green. |
| `npm run coverage` | Istanbul gate at **80/80/75/80** on the post-exclude scope. |
| `npm run typecheck` | `tsc --noEmit` — must stay clean. |
| `npm run build` | `tsc -p tsconfig.json` — emits `dist/`. |

## Safety — the `basher` deny-list

- 3 rm-family patterns (`rm -rf /`, `rm --no-preserve-root -rf /`, `rm --no-preserve-root -- /`)
- `curl ... | sh`, `wget ... | sh`
- `sudo ...`
- `dd if=...`
- **`basher` defaults to dry-run.** The `CHASSEUR_ONIRIQUE_LIVE=1` env var unlocks real execution. Do not change this default.
- **Known gap** (documented, not patched): `rm -r -f /` (split flags, no contiguous `-rf` substring). Patching it would introduce too many false positives on `cp -r -f ...`.

## File map (anchors only)

```
src/index.ts          — CLI entry, wires agents + tools + planner
src/orchestrator.ts   — the single conductor (run, runStep, synthesize)
src/context.ts        — rolling window + scoped notes
src/planner.ts        — prompt → PlanStep[]
src/skills.ts         — loads .agents/skills/**/SKILL.md
src/agents/           — 9 files: base + 8 specialized agents
src/tools/            — 10 files: _schema + 9 verbs
.agents/skills/       — 3 SKILL.md files: this one, research-tactics, refactor-tactics
```

## Pitfalls (do not repeat these)

- Do NOT put a comment line above the YAML `---` frontmatter — the `parseFrontMatter` regex is anchored on `^---\s*\n`. The skill's description will silently fall back to `''`.
- Do NOT lower the vitest coverage thresholds to "make the build pass". If the gate fails, the post-exclude scope is missing a file you should add to `exclude`, OR you wrote code without tests.
- Do NOT reintroduce the pre-v0.2 working name. The v0.2 rebrand closed that door permanently.
- Do NOT change `basher` to live-mode by default. The deny-list + dry-run is the safety story.

## When to add a new agent

1. Add the name to `AgentName` in `src/planner.ts`.
2. Create `src/agents/<name>.ts` exporting `const <name>: Agent<…>`.
3. Register it in the `Map` in `src/agents/registry.ts`.
4. Write `src/agents/<name>.test.ts` first — the test is the spec.

## The 8th agent: pentest

A `pentest` agent ships as of v0.3.0. It runs four sub-checks **in parallel**
inside a single agent and streams findings to `docs/pentest/<ISO>.ndjson`
(append-only, one line per finding) + a final `docs/pentest/<ISO>.md` summary.
The "au fur et à mesure" feel comes from `Promise.allSettled` + a synchronous
`reportFinding` callback that appends to the NDJSON file and logs to stdout
the moment each finding is discovered.

The sub-checks are read-only by design. The network probe is gated by
`CHASSEUR_ONIRIQUE_PENTEST_NET=1` (off by default). Secret matches are
mandatorily pre-redacted inside the sub-check — the agent's own log never
sees a plaintext secret.

Use `npm run pentest` to run it standalone (one step, just the pentest
agent), or include `pentest` in a custom plan via the orchestrator's CLI.

## When to add a new tool

1. Create `src/tools/<name>.ts` (a `ToolDescriptor<TIn, TOut>`).
2. Add a re-export line to `src/tools/index.ts`.
3. Add tests under `src/tools/<name>.test.ts`.

## When to add a new skill

Create `.agents/skills/<skill-name>/SKILL.md`. The orchestrator picks it up at the next `run()`. **The first `---` MUST be on line 1** (no leading comment line).
