# VISION Detailed 24-Hour Build & Implementation Roadmap

This document outlines the precise hour-by-hour build schedule for **VISION — Multi-Agent Adaptive Study & Prerequisite Debugger** during the hackathon event.

---

## Build Plan Strategy
- **Total Planned Build Time:** 24 Hours
- **Event Buffer:** Reserved for live user testing, adversarial fixes, video recording, and presentation prep.

---

## Phase Breakdown

### Phase 1: Core Spine, State Machine & Schemas (Hours 0–4)
* **Goal:** Build the deterministic state machine framework, Pydantic dataclasses, and fake agent mocks.
* **Tasks:**
  1. Initialize project structure in `slice/`, `agents/`, `domain/`, `corpus/`, `prompts/`, `app/`, `tests/`, `evidence/`.
  2. Implement all 14 Pydantic data models in `slice/state_manager.py`.
  3. Construct Workflow Controller transition logic in `slice/controller.py`.
  4. Create agent handoff skeleton in `slice/handoff.py`.
* **Owner:** Jeevananthan K & Anushya M
* **Hard Cut-Line:** State machine transitions from `START_STUDY` through `SESSION_COMPLETE` deterministically using fake agent outputs.

### Phase 2: Core Multi-Agent System (Hours 4–12)
* **Goal:** Implement the 6 specialized AI agents and integrate course context and corpus retrieval.
* **Tasks:**
  1. Build Supervisor, Diagnostic, Resource, Tutor, Exercise, and Evaluation agents in `agents/`.
  2. Embed `domain/prerequisite_graph.json` and `corpus/data_structures_notes.md`.
  3. Implement exact quote provenance validator in `slice/validator.py`.
* **Owner:** Rajpriyan S (Prompts/Agents) & Jeevananthan K (Controller/Retriever)
* **Hard Cut-Line:** Single-course adaptive study loop completes end-to-end with live LLM calls.

### Phase 3: Agentic Depth & Backtracking (Hours 12–19)
* **Goal:** Implement prerequisite validation, tie-breakers, 3-revision backward loop (`GO_DEEPER`), human pause/resume, and 2nd encounter memory transfer.
* **Tasks:**
  1. Wire prerequisite validator gate to check dependency graph edges.
  2. Implement Concept-Gap Exit Ticket tie-breaker questions for ambiguous responses.
  3. Enforce hard spend limit counter (18–20 calls design target) and revision counter (3 revisions max).
  4. Implement pause/resume endpoints for `WAITING_FOR_HUMAN`.
  5. Test cross-course memory transfer (Data Structures `ds_101` → Operating Systems `os_201`).
* **Owner:** Jeevananthan K & Anushya M
* **Hard Cut-Line:** System executes backward loop (`GO_DEEPER`), pauses on 3 revisions, and demonstrates 2nd encounter preference transfer without course memory bleed.

### Phase 4: Verification & Real-User Testing (Hours 19–24)
* **Goal:** Build user interface, execute 3 user walkthroughs, and 1 adversarial stress test.
* **Tasks:**
  1. Build web UI in `app/main.py` displaying active state, agent handoffs, and diagnostic cards.
  2. Conduct 3 real-user walkthroughs with engineering students (Dhanush S).
  3. Conduct 1 adversarial stress test (prompt injection & tie-breaker checks).
  4. Document iteration log in `evidence/stress_test_log.md`.
* **Owner:** Megala M (UI Design), Anushya M (Frontend), Dhanush S (QA/Testing)
* **Hard Cut-Line:** Live demo playable end-to-end with recorded user feedback and iteration log ready for submission.

### Phase 5: Stretch Features (Post-Core)
* **Goal:** Optional Voice synthesis and UI Dashboard enhancements, built strictly after core stability is verified.
