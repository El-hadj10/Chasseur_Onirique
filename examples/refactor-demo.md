# Demo transcript — refactoring a Login component (captured)

> `npm run demo` est équivalent à `npx tsx src/index.ts --demo`.

> _Chasseur Onirique — by El-hadj Ousmane._

Le prompt joué :

> _"Refactor the Login component so it becomes unit-testable. Don't break the public API."_

> Capture depuis `/home/el-hadj-ousmane/Bureau/chasseur-onirique`.

## Sortie brute (verbatim)

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

## Lecture humaine

### Step 1 — Recueillir le contexte

> `(file_picker, code_searcher)`

- `file_picker` a classé 2 fichiers candidats par recouvrement de tokens (le mot « Login » n'apparaissant que peu dans ce repo, la confiance reste modeste à 0.30 — c'est attendu, et c'est *intentionnel* : `file_picker` ne gonfle jamais sa confiance).
- `code_searcher` a réellement lancé `rg` sur plusieurs motifs, ramené 20 hits sur `examples/*`, `.agents/*`, `node_modules/rollup/*` — **confiance 0.95** car l'évidence est dense.
- La **confiance d'étape** retenue est le max des deux : `0.95`.

### Step 2 — Concevoir la solution

> `(thinker)`

Le `thinker` est un transform pur : il lit les `sharedNotes` accumulés pendant l'étape et sort une recommandation, deux trade-offs, trois next actions. Sa confiance **0.78** est cohérente : il s'appuie sur l'évidence du step 1 sans halluciner.

### Step 3 — Appliquer les changements

> `(basher)`

`basher` propose ici deux commandes à exécuter **en dry-run** :
- `npm test --silent` — déclenche la suite de tests
- `git status --porcelain` — montre les fichiers modifiés

Sortie JSON typique :

```json
{
  "command": "npm test --silent",
  "exitCode": 0,
  "stdout": "(dry-run: npm test --silent)",
  "stderr": "",
  "dryRun": true
}
```

Le deny-list du basher refuserait `rm -rf /`, `curl ... | sh`, `sudo apt ...`, `dd if=...`. Le seul *gap* connu est `rm -r -f /` (split flags, pas de substring `-rf` contiguë).

### Step 4 — Faire relire

> `(code_reviewer)`

Scan des fichiers modifiés dans les 10 dernières minutes. Sur un repo fraîchement créé, la fenêtre temporelle est courte ⇒ peu de findings ⇒ confiance moyenne (0.50).

---

## Ce que vous en faites

1. Lisez les références du step 1 — vraies sources sur disque.
2. Lisez la synthèse du `thinker` — raisonnement structuré, pas d'hallucination.
3. Si `CHASSEUR_ONIRIQUE_LIVE=1` était passé, les exit codes des commandes apparaîtraient ici.
4. Les findings du `code_reviewer` sont vos blockers à corriger avant commit.

Puis demandez une suite :

- « Renomme `handleSubmit` en `submitHandler` »
- « Extrais `Login` en split présentational + container »
- « Ajoute un `useReducer` autour du flow d'auth »

## La ligne skills (à noter)

Le tout premier `[INF] orchestrator` log contient `"skills":["research-tactics","refactor-tactics"]` — ce sont les deux skills chargées au démarrage depuis `.agents/skills/*/SKILL.md`. Ces skills sont injectées dans le contexte parent et conditionnent les choix routage du planner.

Pour remplacer ou ajouter des skills, il suffit de poser un nouveau répertoire `SKILL.md` dans `.agents/skills/` — l'orchestrateur les détecte automatiquement au prochain `run()`.
