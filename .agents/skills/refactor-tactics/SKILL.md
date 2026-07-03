---
name: refactor-tactics
description: Seams, breaking points, and the Working Effectively with Legacy Code checklist, distilled.
---

<!-- Chasseur Onirique — (c) 2026 El-hadj Ousmane. Skill: refactor-tactics. -->

# Refactor tactics — the seam catalogue

When the orchestrator sees `refactor`, `clean`, `improve`, or `rewrite` in the
prompt, this skill pops into context. The point: bias the team toward
_Behavior-Preserving Refactors_ (Fowler), not rewrites.

## Decision tree

1. **Is the change observable from outside?** If yes → behavior-preserving refactor only.
2. **Is there a unit test covering the current behaviour?** If no → write characterization tests first.
3. **Is the seam skillable?** If yes → inject, don't modify.
4. **Is the effect boundary clear?** If no → draw it before coding.

## The six seams (Feathers)

| Seam                      | Tool                       | When                                  |
| :------------------------ | :------------------------- | :------------------------------------ |
| **Object seams**          | wrap, override, replace    | Tightly coupled collaborators         |
| **Link seams**            | extract factory            | `new` of a concrete type inside unit  |
| **Method seams**          | extract / override         | Method too big to test                |
| **Parameter seams**       | parameterize               | Hidden globals leaking through        |
| **Pre-processing seams**  | preprocessing step         | Pre-conditions hard to set up         |
| **Partial seams**         | partial mock with a seam   | APIs without virtual substitutability |

## Trade-off reminder

- Refactor-extended ⇒ gain ↑↑, regression risk ↑↑
- Patch-ciblé ⇒ gain 1 mark, regression risk ↓
- The orchestrator defaults to **patch-ciblé** with a learner step into
  refactor-extended if the file count balloons.

## Exit checklist (before a green CI)

- [ ] Public API unchanged
- [ ] No new `any` cast
- [ ] No `console.log` / `debugger` left
- [ ] Test count `n` ≥ previous `n`
- [ ] `tsc --noEmit` clean
