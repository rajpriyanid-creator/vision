# RESOURCE & QUALITY GATE PROMPTS

## Resource Agent (`prompts/resource.md`)
Retrieves verified excerpts from approved domain corpora (`corpus/*.md`), attaches provenance metadata, and confirms relevance to the active prerequisite before handing off to the Tutor Agent.

---

## Quality Gate Prompt (`prompts/gate.md`)
Validates that generated exercises do not leak answers, match the learner's calibrated cognitive level, and include verifiable private unit tests.

---

## Spot Check / Tie-Breaker Prompt (`prompts/spot.md`)
Generates single-question calibration probes when diagnostic confidence is split between two adjacent prerequisite nodes in the DAG.
