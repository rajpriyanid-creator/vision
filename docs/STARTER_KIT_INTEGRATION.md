# VISION Starter Kit Integration Guide

**Reference Repository:** [`rsimhan/agentic-slice-kit`](https://github.com/rsimhan/agentic-slice-kit)

This document specifies how **VISION** builds upon the official agentic starter kit spine, mapping generic agentic mechanisms to learning-specific abstractions.

---

## 1. Architectural Separation: Runtime Spine vs. Domain Layer

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   STARTER KIT REUSABLE RUNTIME SPINE                   │
│                                                                        │
│  - Durable State Machine Controller - Hard Cost & Spend Budget Counter │
│  - SQLite Persistent Storage        - Revision Loop Limit Guard        │
│  - Human-in-the-Loop Callback Host  - Schema Verification Gate         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Hooks & Event Interfaces
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        VISION EDTECH DOMAIN LAYER                      │
│                                                                        │
│  - 6 Specialized AI Agents (`agents/supervisor.py`, `diagnostic.py`...)│
│  - Data Structures Prerequisite Graph (`domain/prerequisite_graph.json`)│
│  - Persistent Learner State Manager (`slice/state_manager.py`)         │
│  - Concept Gap Diagnostic Evaluator & Rubrics (`domain/rubric.json`)   │
│  - Local Corpus Citation & Provenance Validator (`slice/validator.py`) │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Mapping Table

| Starter Kit Capability | Starter Kit Module | VISION Domain Implementation |
|---|---|---|
| **Durable State Machine** | `runtime/runner.py` | Workflow Controller (`slice/controller.py`) implementing 20 VISION study states (`START_STUDY` $\rightarrow$ `SESSION_COMPLETE`) |
| **State Persistence** | `runtime/db.py` | `StudentState` database layer preserving student mastery, misconceptions, and learning styles (`successful_modes`) across sessions |
| **Spend Limit Guard** | `runtime/budget.py` | 18–20 LLM API calls per run (design target); automatically transitions to `status="given_up"` on breach |
| **Revision Limit Guard** | `runtime/budget.py` | Hard limit of 3 backward prerequisite depth steps; triggers `WAITING_FOR_HUMAN` |
| **Human Callback** | `runtime/human.py` | Serialization & resume engine for `HumanDecision` records when user or mentor input is requested |
| **Retrieval Engine** | `runtime/retrieval.py` | Structured retrieval from `corpus/data_structures_notes.md` with exact quote verification |

---

## 3. Starter Kit Verification & Smoke Test Protocol

Before attaching LLM API keys or building domain UI, the team must execute the starter kit verification protocol:

1. **Verify Controller Spine:** Verify `slice/controller.py`, `slice/state_manager.py`, and `slice/validator.py` compile cleanly.
2. **Execute Smoke Test:** Run `python -m tests.test_workflow` to verify deterministic state transitions without API keys using fake agent outputs.
3. **Verify Schema Support:** Pass mock JSON responses through state transitions to validate Pydantic schema serialization for all 14 records including `AgentHandoff`.
4. **Test Pause/Resume:** Trigger a mock human callback at `WAITING_FOR_HUMAN` and verify that session state serializes to disk and resumes cleanly upon receiving `HumanDecision`.
