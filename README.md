# Chasseur Onirique

> _L'orchestrateur d'agents CLI en TypeScript pur._
> _A miniature, runnable, zero-dependency multi-agent orchestrator._
> _By El-hadj Ousmane — MIT._

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](./tsconfig.json)
[![Node](https://img.shields.io/badge/Node-%E2%89%A518-green.svg)](./package.json)
[![Tests](https://img.shields.io/badge/tests-97%2F97-brightgreen.svg)](./src)
[![Coverage](https://img.shields.io/badge/coverage-%E2%89%A580%25-blue.svg)](./vitest.config.ts)
[![Project: Chasseur Onirique](https://img.shields.io/badge/chasseur--onirique-v0.3.1-orange.svg)](./package.json)

---

## The hook — Un projet de plus, ou un agent qui orchestre les autres ?

Le bureau contient déjà 32 dossiers. Chacun a sa personnalité : `Ware-Defender` défend, `AI_Nour` raisonne, `Tourabou` lit les signes du ciel. Tous ont un point commun : ils prennent un **but** et produisent une **trace écrite** — code, audit, note astrologique.

`chasseur-onirique`, lui, ne produit rien lui-même. Il **délègue**. Et c'est toute sa raison d'être.

```
┌─────────────────────────────────────────────────────────────────┐
│  user prompt ──► Planner ──► Orchestrator ──► specialized agents │
│                                    │                              │
│                                    └──► merge ──► single report  │
└─────────────────────────────────────────────────────────────────┘
```

Huit agents spécialisés, un seul *conductor* (le registre et la base sont des utilitaires, pas des agents appelables). Pas d'API key requise, pas de dépendance lourde : juste le pattern d'orchestration, en clair.

---

## The how — Comment ça marche ?

### Architecture (3 actes)

#### 1 · Plan

Le `Planner` (heuristique par défaut, swappable vers un LLM) transforme un prompt libre en une liste ordonnée de **PlanStep**. Chaque step porte : un titre, une justification, et **les agents suggérés**.

#### 2 · Orchestrate

L'`Orchestrator` boucle :
- dépile le step suivant,
- lance en parallèle **tous les agents suggérés**,
- collecte leurs `AgentOutput`,
- injecte leurs `notes` dans le `Context` parent — *et nulle part ailleurs*.

C'est la garde-fou : un sub-agent ne mute jamais le contexte du parent. Il envoie un message structuré, le parent décide.

#### 3 · Reflect

Un `thinker` peut être invoqué entre deux steps pour **synthétiser** les notes accumulées. Un `code_reviewer` ferme la boucle : il scanne les fichiers récemment modifiés et sort des findings typés.

### Le diagramme complet

```
                       ┌──────────────────┐
            prompt ───►│   HeuristicPlanner        │
                       └────────────┬──────┘
                                    │  Plan: [S1, S2, S3, S4]
                       ┌────────────▼──────────────────┐
                       │        Orchestrator                  │
                       │  ┌────────────────────────┐     │
                       │  │  Context (rolling msgs │     │
                       │  │  + scoped notes bag)   │     │
                       │  └───────────┬────────────┘     │
                       └────────────┼────────────────────┘
                                    │
        ┌────────────┬──────────────┼──────────────┬───────────────┐
        │            │              │              │               │
   ┌────▼─────┐ ┌────▼─────┐  ┌──────▼──────┐ ┌─────▼─────┐  ┌─────▼─────┐
   │file_pick │ │code_sear │  │  researcher │ │  basher   │  │  thinker  │
   │   er     │ │  cher    │  │    _web/_docs│ │(dry-run*) │  │ (synth)   │
   └────┬─────┘ └────┬─────┘  └──────┬──────┘ └─────┬─────┘  └─────┬─────┘
        │            │              │              │               │
        └────────────┴──── AgentOutput (notes, refs, conf) ─────────┘
                                          │
                                          ▼
                                 ┌──────────────────┐
                                 │     Report         │
                                 │  - summary        │
                                 │  - per-step refs   │
                                 │  - confidence      │
                                 └──────────────────┘
```

\* `basher` est en **dry-run par défaut**. Mettez `CHASSEUR_ONIRIQUE_LIVE=1` pour qu'il exécute réellement.

---

## The try — En une ligne

```bash
# voir Chasseur Onirique travailler
git clone https://github.com/El-hadj10/Chasseur_Onirique.git chasseur-onirique
cd chasseur-onirique
npm install
npm run demo
```

Ou, sans rien installer :

```bash
npx tsx src/index.ts --demo
```

### Une session — capturée d'un vrai `npm run demo`


> Sortie capturée à la v0.2.0 (conservée à titre historique). La démo actuelle à v0.3.1 produit un log de structure identique, avec 8 agents dans le registre au lieu de 7.
```
[demo] running with local tsx
2026-07-03T17:24:41.622Z [INF] cli chasseur-onirique v0.2.0 — root: /home/el-hadj-ousmane/Bureau/chasseur-onirique
2026-07-03T17:24:41.624Z [INF] orchestrator 🚀 run() — prompt: "Refactor the Login component so it becomes unit-testable. Don't break…" {"planSteps":4,"agents":["file_picker","code_searcher","basher","researcher_web","researcher_docs","thinker","code_reviewer"],"skills":["research-tactics","refactor-tactics"]}
2026-07-03T17:24:41.625Z [INF] orchestrator step 1 → Recueillir le contexte (fichiers + recherches code) {"agents":["file_picker","code_searcher"]}
2026-07-03T17:24:41.625Z [DBG] orchestrator spawn file_picker {"step":1}
2026-07-03T17:24:41.627Z [DBG] orchestrator spawn code_searcher {"step":1}
2026-07-03T17:24:41.978Z [OK ] orchestrator file_picker done {"conf":0.3,"refs":2}
2026-07-03T17:24:41.978Z [OK ] orchestrator code_searcher done {"conf":0.95,"refs":20}
2026-07-03T17:24:41.979Z [OK ] orchestrator step 1/4 done: Recueillir le contexte (fichiers + recherches code)
2026-07-03T17:24:41.979Z [INF] orchestrator step 2 → Concevoir la solution {"agents":["thinker"]}
2026-07-03T17:24:41.979Z [DBG] orchestrator spawn thinker {"step":2}
2026-07-03T17:24:41.979Z [OK ] orchestrator thinker done {"conf":0.78,"refs":0}
2026-07-03T17:24:41.979Z [OK ] orchestrator step 2/4 done: Concevoir la solution
2026-07-03T17:24:41.979Z [INF] orchestrator step 3 → Appliquer les changements {"agents":["basher"]}
2026-07-03T17:24:41.979Z [DBG] orchestrator spawn basher {"step":3}
2026-07-03T17:24:41.980Z [OK ] orchestrator basher done {"conf":0.85,"refs":2}
2026-07-03T17:24:41.980Z [OK ] orchestrator step 3/4 done: Appliquer les changements
2026-07-03T17:24:41.980Z [INF] orchestrator step 4 → Faire relire et vérifier {"agents":["code_reviewer"]}
2026-07-03T17:24:41.980Z [DBG] orchestrator spawn code_reviewer {"step":4}
2026-07-03T17:24:41.982Z [OK ] orchestrator code_reviewer done {"conf":0.5,"refs":0}
2026-07-03T17:24:41.982Z [OK ] orchestrator step 4/4 done: Faire relire et vérifier

================ REPORT ================
## Résumé de la session
- **Recueillir le contexte (fichiers + recherches code)** (file_picker, code_searcher) — confiance ≈ 0.95
   refs: examples/refactor-demo.md, .agents/skills/refactor-tactics/SKILL.md, examples/research-demo.md, node_modules/rollup/dist/shared/rollup.js, node_modules/rollup/dist/es/shared/node-entry.js
- **Concevoir la solution** (thinker) — confiance ≈ 0.78
- **Appliquer les changements** (basher) — confiance ≈ 0.85
   refs: cmd:npm test --silent, cmd:git status --porcelain
- **Faire relire et vérifier** (code_reviewer) — confiance ≈ 0.50
========================================
agents fired: 5
duration:     359 ms
```

> (Sortie réelle — capture `npm run demo`. Les deux skills `research-tactics` et `refactor-tactics` sont chargées au démarrage et injectées dans le contexte parent — visibles dans la ligne `skills` du premier `[INF]` log.)

---

## Pourquoi c'est *de haut niveau*

| Critère                     | Ce projet                                                |
| :-------------------------- | :------------------------------------------------------- |
| **Zero dépendance runtime** | seulement `chalk`. Tout le reste est `node:fs`, `node:cp` |
| **Observable**              | chaque décision apparaît dans un `LogEvent` horodaté     |
| **Composable**              | ajoute ton agent en 1 fichier + 1 ligne dans `index.ts`  |
| **Testable**                | 97 tests unitaires, dry-run par défaut, sandboxing         |
| **Documenté**               | ce README + `ARCHITECTURE.md` + `docs/*.md`              |
| **Sécurisé**                | `basher` refuse `rm -rf /`, `curl \| sh`, `sudo`…        |
| **Reproduction fidèle**     | suit les 4 lois de l'orchestrateur parent (voir ARCHI)   |
| **CI verte**                | GitHub Actions sur Node 18 + 20, gate de couverture 80 % |
| **Open source**             | MIT, `CONTRIBUTING.md`, conventional `npm test && npm run build` |

---

## Quick start

```bash
# 1. install
npm install

# 2. run the canned demo
npm run demo
# (alias: npx tsx src/index.ts --demo)

# 3. or bring your own prompt
npx tsx src/index.ts "Pourquoi ce useEffect boucle-t-il ?"

# 4. live shell mode (dangerous — you own the consequences)
CHASSEUR_ONIRIQUE_LIVE=1 npx tsx src/index.ts "run typecheck and tests"

# 5. type-check only
npm run typecheck

# 6. full test suite (vitest)
npm test

# 7. coverage report
npm run coverage

# 8. full build
npm run build
```

Ajouter une **Skill** ? Créez `.agents/skills/<votre-domaine>/SKILL.md` avec frontmatter YAML :

```markdown
---
name: my-domain
description: One sentence the orchestrator uses to pick this skill.
---

# Workflow
1. ...
2. ...
```

Elle sera listée dans la sortie `--demo` automatiquement. Le `chasseur-onirique` lui-même embarque déjà deux skills :
- `refactor-tactics` — catalogue des seams de Michael Feathers
- `research-tactics` — triangulation web + docs avant de recommander

Visibles dans le bloc `skills: [...]` du premier `[INF] orchestrator` log.

---

## Le mot de la fin

> Je suis **Chasseur Onirique**. Mon métier : découper une intention en pas, déléguer chaque pas à l'agent qui sait le faire, puis recoller les pièces dans un rapport que tu peux vérifier.
> Ce projet, c'est mon **plan de travail**, posé sur le bureau — sans rien déplacer d'autre.
>
> — _Chasseur Onirique, orchestrateur — par El-hadj Ousmane_

Pour creuser :

- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — les 4 lois, le dataflow et les invariants
- [`docs/agents.md`](./docs/agents.md) — chaque agent en détail
- [`docs/tools.md`](./docs/tools.md) — chaque outil en détail
- [`docs/orchestration.md`](./docs/orchestration.md) — la boucle en pas-à-pas
- [`examples/`](./examples/) — transcripts complets
- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — conventions locales
- [`LICENSE`](./LICENSE) — MIT
