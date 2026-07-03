---
name: research-tactics
description: When the prompt is "compare / recommend / which is best", triangulate web and docs before declaring a winner.
---

<!-- Chasseur Onirique — (c) 2026 El-hadj Ousmane. Skill: research-tactics. -->

# Research tactics

The hallmark of a bad LLM answer is a confident ranking of three things the model
has never installed. The hallmark of a good answer is *evidence*.

When the orchestrator routes to `researcher_web` and `researcher_docs`:

1. **Pin the comparison axis.** "Best database" is bad. "Best database for a 50
   GB OLTP workload on a single-node VPS" is good. The orchestrator's planner
   already extracts the axis for you — surface it back in the synthesis.

2. **Triangulate.** The orchestrator fan-outs `researcher_web` and
   `researcher_docs` in parallel. Treat their agreement as strong signal and
   their disagreement as a flag for the synthesizer ("verify the date" / "the
   blog is two years old").

3. **Refuse single-source claims.** If only one source weighs in, surface it as
   "single-source observation" in the synthesis, not as a verdict.

4. **Prefer official docs over blog posts.** A library's own README is the
   spec; a Medium post is a footnote. Once per session, the synthesizer should
   call this out explicitly when a third-party blog carries the verdict.

5. **Never recommend without at least one concrete reference.** A "best"
   recommendation with no URL is suspicious.
