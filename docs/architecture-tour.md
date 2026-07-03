# Architecture tour

> A guided walkthrough of Chasseur Onirique, file by file, in the order a new
> reader should actually open them. If you've never seen this project, follow
> the order. If you've read it before, use this as a map.

**Reading time:** ~30 minutes if you open every file, ~10 minutes if you skim.
**Target:** a senior developer who has never seen the project and needs to be
productive within half an hour.

The project is small enough (~1 500 lines, 9 test files, 65 tests) to read in
one sitting. The order below is chosen so that each file builds on the
preceding one.

---

## 1. Entry points — start here

These three files are the doors into the system. Pick one depending on what
you want to do.

### `src/index.ts` — the CLI

The command a user types. Parses `argv`, wires the registry, runs the
orchestrator, prints the report. Read this first to see the moving parts in
~60 lines.

Key line: `const agents = createAgentRegistry();` — the only place where the
7-agent Map is instantiated for the CLI. There is no second copy.

### `scripts/demo.sh` — the canonical demo

`npm run demo` → `bash scripts/demo.sh`. The shell wrapper that runs the CLI
with a fixed prompt. Open this if you want to see the system boot end-to-end
in one terminal window.

### `scripts/snapshot-session.ts` — the capture CLI

`npm run snapshot -- --demo` runs the same orchestrator, but writes the
report to `sessions/<ISO>.{json,txt}` plus an `index.json`. The captured
transcripts are the bridge between ad-hoc runs and durable memory. Open this
if you want to understand what an `OrchestratorReport` looks like on disk.

---

## 2. The orchestrator core — the heart

Three files. The orchestrator + the planner + the context. This is the part
that does the work.

### `src/orchestrator.ts` — the loop

`Plan → fan-out agents → merge notes → reflect → next step`. The single file
where sub-agent outputs become parent context. The comment at the top of the
class spells out the loop in 6 lines.

Two functions to read closely:

- `runStep()` — fan-out: runs `step.suggestedAgents` in parallel, collects
  their `AgentOutput`s, then merges `notes` and `references` into the
  parent's `Context`. **This is the only place that happens.**
- `synthesize()` — the `## Résumé de la session` formatter. Per-step, lists
  the agents that fired, the max confidence, and the top 5 references.

The two private helpers at the bottom (`merge`, `uniq`) are worth a glance:
`merge` is a tiny recursive merge that does deep-merge objects, concat
arrays, and last-write-wins for scalars — and the rest of the codebase
relies on those exact semantics.

### `src/planner.ts` — the decision-maker

**Law #2 lives here**: "before any action, commit to a plan." The `Plan` is a
sequence of codeless TODOs the orchestrator walks through. The orchestrator
does NOT decide what to do next — it executes the plan.

`HeuristicPlanner.makePlan(prompt)` is a regex-based dispatch: 3 patterns
(`why/debug`, `refactor/clean`, `compare/recommend`) yield 4 different
4-step plans. This is deliberately dumb. The `PlannerStrategy` interface is
the seam where a real LLM plugs in later — see the comment "In a real
orchestrator this would call an LLM."

### `src/context.ts` — the memory

A rolling-window message buffer (default 50 messages) plus a typed
`Map<string, unknown>` for scoped notes. Three concepts: `push` (append a
message), `snapshot` (the visible window), `notes()` (the side-channel).

The notes map is what makes fan-out useful: each agent writes under a key
like `basher:commands-run`, the orchestrator merges them, the next step
reads them. Read this to understand the only persistence layer the
orchestrator has.

### `src/skills.ts` — the knowledge loader

`loadSkills(['.agents/skills'])` walks the directory, parses the
frontmatter of each `SKILL.md`, returns an array of `Skill` objects. The
`parseFrontMatter` regex is the project's most fragile line: it requires
`---` to be the first 3 characters of the file, no leading blank or
comment. The test `src/skills.test.ts` guards this with a regression
assertion.

### `src/logger.ts` — chalk-based pretty-printer

Three levels: `info`, `ok`, `debug`. Strips ANSI in non-TTY. Not much else.

---

## 3. The 7 agents — what the orchestrator can call

Each agent is a 30–100 line file with one exported object implementing
`Agent<Input, Output>`. The contract is in `src/agents/base.ts` — read that
first.

### `src/agents/base.ts` — the contract

```ts
interface Agent<I, O> {
  name: AgentName;
  description: string;
  run(input: I, ctx: AgentContext): Promise<AgentOutput<O>>;
}
```

`AgentContext` carries the prompt, the current step, the shared notes, the
visible messages, the root dir, and the `dryRun` flag. That's the only
state an agent sees. **No agent reads from disk directly** — they all go
through `basher` for shell access, and the rest are pure functions of their
input.

### `src/agents/registry.ts` — the factory

The single source of truth. `createAgentRegistry()` returns the 7-agent
Map. Adding an 8th agent means: (1) create the file, (2) add one line here,
(3) update the test in `src/agents/registry.test.ts`. The CLI and the
snapshot tool both pull from this — no duplication.

### The 7 agents in order of "interestingness"

#### `src/agents/basher.ts` — read this carefully

The dangerous one. Runs shell commands. Three layers of safety:

1. **Dry-run by default.** `live` is `false` unless `process.env.CHASSEUR_ONIRIQUE_LIVE === '1'`.
2. **Deny-list of 7 regexes** (3 for `rm` family, then `curl|sh`, `wget|sh`,
   `sudo`, `dd if=`). Comment in the source spells out the rationale.
3. **Documented gap:** `rm -r -f /` (split flags) is **not** caught by any
   regex, by design. The `docs/deny-list.md` file documents this gap
   explicitly so future maintainers know what they're shipping.

`proposeCommands()` at the bottom maps prompt keywords → command lines.
This is the seam where an LLM would inject arbitrary shell. The deny-list
is what makes that seam survivable.

#### `src/agents/code_searcher.ts` and `src/agents/file_picker.ts`

Read-only. `code_searcher` runs ripgrep queries; `file_picker` walks
directories and fuzzy-matches paths. Both return `references: { kind, target }[]`
that the orchestrator merges into the parent's notes.

#### `src/agents/researcher_web.ts` and `src/agents/researcher_docs.ts`

Network-bound. The `researcher_web` agent fetches a URL and returns the
readable text; `researcher_docs` is its docs-focused variant. Both are
heuristic — they pick the top result for a query, no LLM ranking.

#### `src/agents/thinker.ts`

The synthesiser. Pure function: takes the per-step outputs as input, returns
a markdown string. The orchestrator surfaces the thinker's synthesis in the
parent conversation, which is how "Plan → reflect" actually works.

#### `src/agents/code_reviewer.ts`

The safety net. Runs after a change is applied. Returns a verdict
(approve/request-changes) plus a list of issues. The orchestrator logs it
but does not block on it — the human is the final gate.

---

## 4. The skills system — declarative knowledge

Three files, all under `.agents/skills/`. Each is a `SKILL.md` with a YAML
frontmatter (name + description) and a markdown body.

### `.agents/skills/research-tactics/SKILL.md`

The "how to research" playbook. Heuristics for choosing between
researcher_web and researcher_docs, plus the order of operations when
investigating a third-party library.

### `.agents/skills/refactor-tactics/SKILL.md`

The "how to refactor" playbook. When to write a test first, when to split
a file, when to extract a function. The orchestrator surfaces these in the
"Loaded skills:" line of the first log.

### `.agents/skills/chasseur-onirique/SKILL.md` — the meta-skill

**Read this third, but cite it first.** A skill that documents the
project's own invariants: the 4 laws, the header convention for new
files, the canonical commands, the safety rules, the file map, the known
pitfalls. Future agents load it before touching anything else.

The recursion is intentional: a project that documents itself for its own
agents is harder to drift.

---

## 5. Safety & configuration — the rails

### `package.json`

The script map: `test`, `typecheck`, `build`, `coverage`, `demo`, `snapshot`,
plus `self-check` (see §7). Dependencies are minimal: `chalk` for pretty
output, `tsx` for running TS directly, `vitest` + `@vitest/coverage-istanbul`
for tests. No runtime deps outside Node's stdlib + chalk.

### `vitest.config.ts`

The coverage gate: 80% lines / 80% functions / 75% branches / 80%
statements, **with a post-exclude scope** (the istanbul `exclude` array
prunes `src/index.ts`, `scripts/*`, and `*.test.ts` from the
calculation). Don't lower the thresholds without a comment in the PR.

### `tsconfig.json`

NodeNext modules, strict mode, ES2022 target. The `.js` extension on
relative imports is required by NodeNext — yes, this is annoying; no, it's
not optional.

### `.github/dependabot.yml`

Weekly Monday schedule, npm ecosystem, 5-PR cap. Three groups:
`types-and-runtime` (`@types/*` + `tsx`), `vitest-and-coverage` (`vitest` +
`@vitest/*`), and `typescript` (the compiler). The `chalk` major bumps are
ignored — `chalk@5` dropped CJS and we don't want to be on the bleeding
edge of that.

### `.github/workflows/ci.yml`

Runs `npm ci && npm run typecheck && npm test` on Node 18 and Node 20.
That's it. No deploy step. No release automation (releases are manual via
`gh release create`).

---

## 6. Documentation

### `README.md`

The landing page. ~150 lines. The "The try" section has the canonical
clone + install + demo flow. The rest is feature tour, file map, and the
four laws.

### `GITHUB_PROFILE_README.md`

The GitHub profile-style README. Same content as `README.md` but in the
profile format (capsule-render banner, typing SVG, badge grids, ASCII
dataflow). Linked from the repo description on GitHub.

### `CONTRIBUTING.md`

How to add a new agent / tool / skill. The meta-skill mirrors this
content, but the file is the human-facing version. The two are
intentionally redundant: the meta-skill is for agents, this is for humans.

### `ARCHITECTURE.md`

The high-level dataflow diagram. If you want a one-page mental model,
read this. If you want file-by-file detail, keep going with this tour.

### `LICENSE`

MIT. © 2026 El-hadj Ousmane.

### `docs/agents.md`, `docs/tools.md`, `docs/deny-list.md`

Per-feature reference docs. The deny-list file is the most important —
it documents the `rm -r -f /` gap explicitly so nobody can claim they
weren't warned.

### `examples/refactor-demo.md`

A hand-curated transcript of a refactor run. It exists so the project has
a "what success looks like" snapshot in the repo. The snapshot CLI can
regenerate it: `npm run snapshot -- --demo --out examples/`.

---

## 7. Tests — the safety net

9 files, 65 tests, all green. The tests are the contract that the meta-skill
documents.

### `src/skills.test.ts`

5 tests: 3 for the skills loader (discovery, description shape,
per-skill heading map) and 2 inside `describe('chasseur-onirique skill (meta)')`
that pin the meta-skill's body. The "no stray credit markers" test is the
regression for the frontmatter-anchor gotcha.

### `src/agents/registry.test.ts`

4 tests: pins the 7-agent shape, the dry-run default, and the `live` test
seam. This is the only test that breaks when a new agent is added — by
design.

### `src/agents/basher.test.ts`

Tests for the deny-list: catches `rm -rf /`, catches `--no-preserve-root`,
denies `curl|sh`, denies `sudo`. Also tests that the dry-run is the default
and that the env var flips it to live.

### The other 5 test files

One per agent (or per feature). Each test file is short (~50–100 lines)
and tests exactly one thing: the agent's contract.

---

## 8. The scripts directory

### `scripts/demo.sh`

The shell wrapper. Lives at the boundary between "user types a command" and
"the orchestrator runs." Don't put logic here — if you find yourself
wanting to add a `if` statement, move it to a `.ts` file.

### `scripts/snapshot-session.ts`

See §1. The capture CLI. Mirror of `src/index.ts` with disk output.

### `scripts/self-check.ts`

**The dogfooding script.** Runs the orchestrator on the project itself
with a divergence-detection prompt, then writes the report to
`docs/audits/<ISO>.md` and exits 1 if any divergence is detected. Use
`npm run self-check` to surface places where the docs have drifted from
the code.

A subtle implementation gotcha: the JSDoc must avoid `**/` patterns
(two stars then a slash), because esbuild interprets `**/` as a JSDoc
comment terminator (since `*/` ends a comment, and `**` + `/` contains
it). The first version of this script hit a silent exit 1 with no
output because of this — the file would parse, the JSDoc would end
prematurely, and the rest of the line would be treated as code, but
the error would only surface when esbuild re-tokenized from a path it
hadn’t seen before. The current version phrases the path glob
descriptions to avoid the pattern.

---

## The reading order, condensed

If you have 30 minutes:

1. `src/index.ts` (5 min)
2. `src/orchestrator.ts` (10 min)
3. `src/planner.ts` (5 min)
4. `src/agents/basher.ts` (5 min) — read the deny-list comments
5. `.agents/skills/chasseur-onirique/SKILL.md` (5 min)

If you have 10 minutes, skip 1 and start at 2.

If you have 2 minutes, read `.agents/skills/chasseur-onirique/SKILL.md`
and `ARCHITECTURE.md`. That's the project reading its own mind.
