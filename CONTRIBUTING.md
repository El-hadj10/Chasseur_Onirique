# Contributing to Chasseur Onirique

Thanks for taking a look. This is a small project — the rules are simple.

## Workflow

1. Fork, branch from `main`.
2. Make your change. Keep PRs small and focused.
3. Run the three gates before opening a PR:

   ```bash
   npm install
   npm run typecheck
   npm test
   ```

4. Open a PR with a one-line summary.

## Conventions

- **No new top-level dependencies** without discussion. `chalk` is the runtime
  dep. Anything else must live behind an `npm install --save-dev`.
- **Agents are pure.** They receive a snapshot and return an `AgentOutput`.
  Never mutate the parent `Context` (you only get a `Readonly<>` snapshot).
- **Tools are sandboxed to `rootDir`.** Any tool that takes a `path` MUST be
  safe to point at an arbitrary string — the orchestrator restricts paths but
  the tool itself is a defence-in-depth line.
- **Tests live in `src/*.test.ts`.** They run through `vitest` and are excluded
  from the npm build via `tsconfig.json`.
- **Header credit**: every `.ts` source file in `src/` is prefixed with the
  *Chasseur Onirique / El-hadj Ousmane* banner block. New files must include it
  before the existing JSDoc.

## Adding a new agent

1. Add the name to `AgentName` in `src/planner.ts`.
2. Create `src/agents/<name>.ts` exporting `const <name>: Agent<…>`.
3. Register it in `src/index.ts` (the CLI agent map).
4. Add a unit test in `src/agents/<name>.test.ts`.

## Adding a new skill

Create `.agents/skills/<skill-name>/SKILL.md` with front-matter:

```markdown
---
name: <skill-name>
description: one sentence
---
```

The skill is auto-loaded by the orchestrator at startup.

## Live-mode toggle

To actually execute shell commands (instead of dry-run), pass
`CHASSEUR_ONIRIQUE_LIVE=1`. The toggle is read by `basher` only — non-shell
agents (file picker, searcher, reviewer, …) never need it.
