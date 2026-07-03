# Demo transcript — investigating a flaky test *(planned, not yet captured)*

> ⚠️ **STATUS**: this file describes what `npm run demo -- "Why does the AuthGuard test flake on CI but pass locally?"` *would* produce. It has not yet been captured verbatim from a real run. See `refactor-demo.md` for an actually-captured transcript.

> _Chasseur Onirique — by El-hadj Ousmane._

> `npx tsx src/index.ts "Why does the AuthGuard test flake on CI but pass locally?"`

The `HeuristicPlanner` detects `why does` → **investigate** mode. The plan's
second step becomes _"Diagnostiquer le problème en profondeur"_ and routes
through `researcher_web`, `researcher_docs`, and `thinker`.

## Step 1 — Recueillir le contexte

> `(file_picker, code_searcher)`

- `file_picker` returns the auth-related files plus `jest.config.ts` and any
  utility under `src/utils/time*.ts`.
- `code_searcher` greps `ci|flake|timeout|jest|circle|github-actions|process.env`.

Confidence: 0.7.

## Step 2 — Diagnostiquer en profondeur

> `(researcher_web, researcher_docs, thinker)`

**`researcher_web`** surfaces:

- Testing Library — "Findings on Timing in Tests"
- GitHub — `actions/runner-images` (CI image drift)

**`researcher_docs`** surfaces:

- jest "Environment Variables"
- vitest "vi.useFakeTimers"

**`thinker`** synthesizes:

> Sur la base des notes partagées pour l'étape « Diagnostiquer » (concernant « Why does the AuthGuard test flake on CI but pass locally? »), la constellation d'agents rapporte : 12 fichiers candidats sélectionnés · 80 hits grep détectés · 2 sources web identifiées · 2 docs identifiées. Recommandation : deux suspectes courants — horloge système (useFakeTimers non activé) et latence réseau (axios non mocké). Passer `process.env.CI` dans un mock pour vérifier.

Confidence: 0.78.

## Step 3 — Appliquer les changements

> `(basher)`

- `git status --porcelain` (dry-run)
- `grep -n 'FakeTimers|useFakeTimers' src/ test/ -r` (allowlisted probe soon, but
  currently only `basher` runs shell — add as a new agent if you want grep
  reproduction)

Exit 0. Confidence 0.85.

## Step 4 — Faire relire

> `(code_reviewer)`

Scans recently modified files. If you actually patched anything, the reviewer
will flag any `console.log` or `any`-casts you introduced.

---

## Take-away

Once this scenario is captured (a one-liner: `npm run demo -- "Why does the AuthGuard test flake on CI but pass locally?"` > examples/research-demo.captured.txt), the take-away is:

Five agents ran. Each one focused on its lane. The orchestrator merged their
notes into a single report you can read in 30 seconds. That is the value
proposition: **orchestration discipline**, not agent intelligence.
