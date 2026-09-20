# VISION Builder Guide & Technical Blueprint

**Owners:** Jeevananthan K (Backend / Builder) & Anushya M (Frontend / DB / Builder)

This guide provides the complete developer blueprint for implementing the **VISION Execution Engine**, 6-agent system, persistent state engine, API routes, and frontend integration.

---

## 1. Directory Structure & Module Layout

```text
vision-adaptive-study-agent/
├── slice/                      # Deterministic Controller & State Management
│   ├── controller.py           # Workflow Controller logic, budgets & guards
│   ├── state_manager.py        # Pydantic state persistence & updates
│   ├── validator.py            # Prerequisite & provenance validator
│   └── handoff.py              # Agent handoff recorder
├── agents/                     # Specialized AI Agents
│   ├── supervisor.py           # High-level coordinator agent
│   ├── diagnostic.py           # Root cause & tie-breaker agent
│   ├── resource.py             # Corpus retrieval & grounding agent
│   ├── tutor.py                # Personalised reteaching agent
│   ├── exercise.py             # Targeted exercise generator agent
│   └── evaluation.py           # Rubric-based evaluation agent
├── domain/                     # Bounded Course Structures & Rubrics
│   ├── prerequisite_graph.json # Dependency DAGs for demo courses
│   └── rubric.json             # Explicit concept evaluation rubrics
├── corpus/                     # Verified Approved Learning Materials
│   └── data_structures_notes.md# Approved course notes & textbook snippets
├── prompts/                    # System Prompts for AI Agents
│   ├── supervisor_prompt.md
│   ├── diagnostic_prompt.md
│   ├── resource_prompt.md
│   ├── tutor_prompt.md
│   ├── exercise_prompt.md
│   └── evaluation_prompt.md
├── app/                        # User Interface Layer
│   └── main.py                 # Streamlit / Web application interface
├── tests/                      # Verification & Test Suites
│   └── test_workflow.py        # Fixtures for pass, fail & stress paths
└── evidence/                   # User Testing & Stress Logs
    └── stress_test_log.md      # Results of real-user & adversarial tests
```

---

## 2. Persistent Storage Schema (SQLite & JSON)

`slice/state_manager.py` manages persistent student profiles across multiple sessions.

### SQLite Schema (`vision.db`)

```sql
CREATE TABLE IF NOT EXISTS student_states (
    student_id TEXT PRIMARY KEY,
    course_id TEXT NOT NULL,
    mastered TEXT NOT NULL,         -- JSON Array of string concept IDs
    weak TEXT NOT NULL,             -- JSON Array of string concept IDs
    misconceptions TEXT NOT NULL,   -- JSON Array of string misconception IDs
    prerequisite_history TEXT,      -- JSON Array of attempt paths
    successful_modes TEXT,          -- JSON Array of teaching modes
    failed_modes TEXT,              -- JSON Array of teaching modes
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS study_sessions (
    run_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    target_concept TEXT NOT NULL,
    status TEXT NOT NULL,           -- 'active', 'completed', 'waiting_human', 'given_up'
    revision_count INTEGER DEFAULT 0,
    call_count INTEGER DEFAULT 0,
    session_data TEXT NOT NULL,     -- Full serialized execution context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(student_id) REFERENCES student_states(student_id)
);

CREATE TABLE IF NOT EXISTS agent_handoffs (
    handoff_id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL,
    from_agent TEXT NOT NULL,
    to_agent TEXT NOT NULL,
    action TEXT NOT NULL,
    input_record_refs TEXT NOT NULL,
    output_record_refs TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Step-by-Step Build Order & Hard Cut-Lines

### Phase 1: Spine, Typed Schemas & Controller Spine (Hours 0–4)
- Implement `slice/state_manager.py` with all 14 Pydantic dataclasses.
- Build `slice/controller.py` with pure deterministic state transitions driven by mock agent outputs.
- **Hard Cut-Line 1:** Complete study session transitions from `START_STUDY` to `SESSION_COMPLETE` using fake specialist outputs without live LLM calls.

### Phase 2: Core Multi-Agent System (Hours 4–12)
- Implement 6 Specialist Agents in `agents/` (Supervisor, Diagnostic, Resource, Tutor, Exercise, Evaluation).
- Connect `domain/prerequisite_graph.json`, `corpus/data_structures_notes.md`, and `domain/rubric.json`.
- Implement provenance quote validation in `slice/validator.py`.
- **Hard Cut-Line 2:** Single-course adaptive loop completes with live LLM calls.

### Phase 3: Agentic Depth & Backtracking (Hours 12–19)
- Wire prerequisite validation, tie-breakers, 3-revision backward loop (`GO_DEEPER`), human pause/resume (`WAITING_FOR_HUMAN`), and 2nd encounter cross-course preference transfer.
- Enforce hard spend limit counter (18–20 calls design target) and revision counter (3 revisions).
- **Hard Cut-Line 3:** Agent backtracks 2 levels, pauses on 3 revisions, and reuses transferable teaching preferences in a 2nd encounter.

### Phase 4: Verification & Real-User Testing (Hours 19–24)
- Conduct 3 real-student walkthroughs and 1 adversarial stress test.
- Document iteration log in `evidence/stress_test_log.md` with pre-fix vs post-fix commits.
- **Hard Cut-Line 4:** All verification test scripts pass cleanly; walkthroughs and stress test evidence logged.

---

## 4. API Endpoints Contract

```http
POST /api/session/start
Content-Type: application/json

{
  "student_id": "student_123",
  "course_id": "ds_101",
  "target_concept": "binary_tree_inorder_traversal",
  "study_request": "Teach me inorder traversal and check whether I really understand it."
}

Response 200:
{
  "run_id": "run_98234",
  "current_state": "PRACTICE",
  "handoff": {
    "from_agent": "Supervisor",
    "to_agent": "Exercise",
    "action": "generate_initial_target_question"
  },
  "exercise": {
    "concept": "binary_tree_inorder_traversal",
    "question": "For a binary tree node with left child B, root A, and right child C, what is the output sequence of an inorder traversal?"
  }
}
```

```http
POST /api/session/step
Content-Type: application/json

{
  "run_id": "run_98234",
  "student_answer": "A, B, C."
}

Response 200:
{
  "run_id": "run_98234",
  "current_state": "TIE_BREAKER",
  "handoff": {
    "from_agent": "Evaluation",
    "to_agent": "Diagnostic",
    "action": "trigger_tie_breaker"
  },
  "exercise": {
    "type": "tie_breaker",
    "question": "When performing an inorder traversal, which sub-tree or node must be completely visited BEFORE processing the current root node?"
  }
}
```

```http
POST /api/session/human-resume
Content-Type: application/json

{
  "run_id": "run_98234",
  "decision": "change_mode",
  "note": "Switch to diagrammatic step-by-step example."
}
```
