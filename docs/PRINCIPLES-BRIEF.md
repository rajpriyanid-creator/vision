# VISION Agentic EdTech Principles & Architectural Manifesto

This document outlines the core principles, design philosophy, and agentic criteria governing **VISION — Multi-Agent Adaptive Study & Prerequisite Debugger**.

---

## 1. The Core Agentic Thesis

> **"An agent is not a fixed workflow; it is a system that can go backwards based on empirical evidence."**

Traditional EdTech tools apply linear pipelines: `Lesson -> Practice -> Score -> Next Lesson`. When a student fails, traditional software simply repeats the target question or forces re-reading. 

VISION breaks this linear trap by implementing a multi-agent **adaptive back-edge**:
$$\text{Target Failure} \longrightarrow \text{Diagnose Gap} \longrightarrow \text{Validate Edge} \longrightarrow \text{Reteach Prerequisite} \longrightarrow \text{Recheck Prerequisite} \longrightarrow \text{Re-test Target}$$

---

## 2. Alignment with AGENT-A-THON Criteria

The hackathon guidelines mandate that an agentic submission must demonstrate a combination of 4 key capabilities. VISION implements all four:

### 1. State Persistence Across Steps & Sessions
- **Within-Session State:** Tracks `GapHypothesis`, `revision_count`, active attempt logs, `AgentHandoff` records, and diagnostic evaluations.
- **Cross-Session Memory (Second Encounter):** Preserves `StudentState` (`mastered`, `weak`, `misconceptions`, `successful_modes`) in a durable store. Session 2 immediately utilizes Session 1 learning preferences (`successful_modes`) across courses (`ds_101` → `os_201`) without course memory bleed.

### 2. Autonomous Tool & Retrieval Usage
- Queries local prerequisite graphs dynamically via Diagnostic Agent.
- Retrieves chunked course material from `corpus/` via Resource Agent with exact quote provenance validation.

### 3. Multi-Step Reasoning & Decomposition
- Coordinated by a high-level Supervisor Agent across 5 specialist agents (Diagnostic, Resource, Tutor, Exercise, Evaluation).
- Deconstructs target concept failure into candidate prerequisites, issues tie-breakers, evaluates evidence, and executes targeted intervention.

### 4. Human-in-the-Loop Callback Mechanics
- Pauses execution cleanly at `WAITING_FOR_HUMAN` when `revision_count >= 3`, evidence retrieval fails (`could_not_establish`), or ambiguity exceeds bounds.
- Accepts asynchronous `HumanDecision` inputs to resume execution (`RESUME` → `DIAGNOSE_GAP`).

---

## 3. The 9 Operational Directives

1. **Adaptive Decisions Over Fixed Prompts:** The Supervisor Agent evaluates evidence dynamically to decide *which specialist acts next*.
2. **Persistent Student Cognition:** Learner state outlives chat sessions. It records proven mastery, persistent misconceptions, and effective explanation styles (`successful_modes`).
3. **Evidence-Based Transitions:** Model confidence alone never updates a student's mastery status; concrete, rubric-verified student performance determines state transitions.
4. **Data vs. Instruction Isolation:** External course corpus and student inputs are strictly treated as untrusted data (`<corpus_data>`), preventing prompt injection attacks.
5. **No Hallucinated Reteaching:** If retrieved corpus material is missing or insufficient, return `status="could_not_establish"` rather than synthesizing unverified facts.
6. **Explicit Escalation States:** Human pause is an explicit state (`WAITING_FOR_HUMAN`) with serialized state and pending status, not an unhandled exception or silent hang.
7. **Dual Budget Guards:** Separate model spend counters (18–20 API calls design target) and revision counters (Max 3 prerequisite depth steps) prevent infinite loops.
8. **Tie-Breaker Verification:** Always distinguish between a careless mistake and a structural conceptual gap using Concept-Gap Exit Ticket tie-breakers before triggering deep prerequisite remediation.
9. **Depth Over Breadth:** Perfecting one subject (Data Structures) and one core target (Inorder Traversal) with absolute agentic rigor is superior to a superficial multi-subject shell.
