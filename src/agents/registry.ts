// =============================================================================
// Chasseur Onirique — multi-agent orchestration
// (c) 2026 El-hadj Ousmane — MIT License (see ../../LICENSE)
// =============================================================================

/**
 * Agent registry factory.
 *
 * The 7 specialized agents plus their wiring into a `Map<AgentName, Agent>`.
 * Both `src/index.ts` (the CLI demo) and `scripts/snapshot-session.ts` (the
 * capture CLI) import this — so any new agent added to the project lands
 * in both entry points with one line here, instead of two changes in two
 * files.
 */

import type { AgentName } from '../planner.js';
import type { Agent } from './base.js';

import { filePicker } from './file_picker.js';
import { codeSearcher } from './code_searcher.js';
import { basher } from './basher.js';
import { researcherWeb } from './researcher_web.js';
import { researcherDocs } from './researcher_docs.js';
import { thinker } from './thinker.js';
import { codeReviewer } from './code_reviewer.js';

export function createAgentRegistry(): Map<AgentName, Agent<unknown, unknown>> {
  return new Map<AgentName, Agent<unknown, unknown>>([
    [filePicker.name, filePicker],
    [codeSearcher.name, codeSearcher],
    [basher.name, basher],
    [researcherWeb.name, researcherWeb],
    [researcherDocs.name, researcherDocs],
    [thinker.name, thinker],
    [codeReviewer.name, codeReviewer],
  ]);
}
