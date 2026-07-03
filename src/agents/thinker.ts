// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * thinker — cross-agent synthesizer.
 *
 * Pure transform: takes the AgentCallContext (shared notes from previous
 * agents in this step) and emits a structured recommendation paragraph.
 * Real orchestrators swap this for an LLM call; we keep the *shape*.
 */

import type { Agent } from './base.js';

interface Synthesis {
  recommendation: string;
  tradeoffs: string[];
  nextActions: string[];
}

export const thinker: Agent<{ prompt: string; step: string }, Synthesis> = {
  name: 'thinker',
  description: 'Synthesize shared notes into a structured recommendation.',
  async run({ prompt, step }, ctx) {
    const notes = ctx.sharedNotes as Record<string, unknown>;
    const findings: string[] = [];

    const cand = notes['file_picker:candidates'] as string[] | undefined;
    if (cand && cand.length) findings.push(`${cand.length} fichiers candidats sélectionnés`);
    const hits = notes['code_searcher:hits'] as number | undefined;
    if (typeof hits === 'number') findings.push(`${hits} hits grep détectés`);
    const cmds = notes['basher:commands-run'] as number | undefined;
    if (typeof cmds === 'number') findings.push(`${cmds} commandes à exécuter`);

    const finds = findings.length > 0 ? findings.join(' · ') : 'aucune observation détaillée';
    const recommendation =
      `Sur la base des notes partagées pour l'étape « ${step} » (concernant « ${truncate(prompt, 90)} »), ` +
      `la constellation d'agents rapporte : ${finds}. ` +
      `Recommandation : procéder par passes micro-testables, garder l'API publique stable, ` +
      `rejouer les commandes de vérification (typecheck, tests) après chaque patch.`;
    const tradeoffs = [
      'Refactor étendu (gain élevé, risque régression) vs. patch ciblé (gain modeste, risque bas)',
      'Mocks d\'horloge/réseau : vraie séparation vs. surface de test plus étroite',
    ];
    const nextActions = [
      'Identifier une seam (injection) testable',
      'Isoler un effet de bord (I/O / temps) derrière une interface',
      'Aligner le style du composant sur les conventions du repo',
    ];

    return {
      agent: 'thinker',
      data: { recommendation, tradeoffs, nextActions },
      notes: { 'thinker:synthesis': recommendation },
      references: [],
      confidence: 0.78,
      durationMs: 0,
      log: [`synthesized from ${findings.length} notes`],
    };
  },
};

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
