// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../LICENSE)
// =============================================================================

/**
 * Planner.
 *
 * Chasseur Onirique's law #2 (lineage: Buffy orchestrator): before any action,
 * commit to a plan.
 * The plan is a sequence of *codeless* TODOs that the orchestrator walks through.
 * The orchestrator does NOT decide what to do next — it executes the plan.
 */

export interface PlanStep {
  id: number;
  title: string;
  rationale: string;
  status: 'pending' | 'in_progress' | 'done' | 'skipped';
  suggestedAgents: AgentName[];
}

export type AgentName =
  | 'file_picker'
  | 'code_searcher'
  | 'basher'
  | 'researcher_web'
  | 'researcher_docs'
  | 'thinker'
  | 'code_reviewer'
  | 'pentest';

export class Plan {
  constructor(public readonly steps: PlanStep[]) {}
  next(): PlanStep | undefined {
    return this.steps.find((s) => s.status === 'pending' || s.status === 'in_progress');
  }
  mark(status: PlanStep['status'], id: number): void {
    const s = this.steps.find((x) => x.id === id);
    if (s) s.status = status;
  }
  remaining(): number {
    return this.steps.filter((s) => s.status === 'pending' || s.status === 'in_progress').length;
  }
}

/**
 * Naive default planner. In a real orchestrator this would call an LLM.
 * We expose the interface so a real model can be plugged in later.
 */
export interface PlannerStrategy {
  makePlan(prompt: string): Promise<Plan>;
}

export class HeuristicPlanner implements PlannerStrategy {
  async makePlan(prompt: string): Promise<Plan> {
    const normalized = prompt.trim().toLowerCase();
    const isInvestigate = /(?:why|debug|investigate|why does|what's wrong)/.test(normalized);
    const isRefactor = /(?:refactor|clean|improve|rewrite)/.test(normalized);
    const isResearch = /(?:compare|recommend|which|best)/.test(normalized);

    const steps: PlanStep[] = [
      {
        id: 1,
        title: 'Recueillir le contexte (fichiers + recherches code)',
        rationale: "On ne touche jamais à du code sans avoir vu le terrain.",
        status: 'pending',
        suggestedAgents: ['file_picker', 'code_searcher'],
      },
      {
        id: 2,
        title: isResearch
          ? 'Comparer / rechercher en ligne et dans la doc'
          : isInvestigate
            ? 'Diagnostiquer le problème en profondeur'
            : 'Concevoir la solution',
        rationale: "Phase de réflexion : on sort le crayon avant le clavier.",
        status: 'pending',
        suggestedAgents: isResearch
          ? ['researcher_web', 'researcher_docs', 'thinker']
          : ['thinker'],
      },
      {
        id: 3,
        title: 'Appliquer les changements',
        rationale: isRefactor ? 'Refactor ciblé, par petites passes vérifiables.' : 'Patch minimal, idempotent.',
        status: 'pending',
        suggestedAgents: ['basher'],
      },
      {
        id: 4,
        title: 'Faire relire et vérifier',
        rationale: 'Une seconde paire d’yeux — c’est Buffy.',
        status: 'pending',
        suggestedAgents: ['code_reviewer'],
      },
    ];
    return new Plan(steps);
  }
}
