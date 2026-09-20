# VISION Real-User Walkthrough & Testing Plan

**Lead Tester:** Dhanush S (QA and Tester / Verifier)

This document details the operational execution plan for testing **VISION — Multi-Agent Adaptive Study & Prerequisite Debugger** with 3 real engineering students during Phase 4 of the hackathon.

---

## 1. Test Objectives & Target Participants

The goal is to gather empirical qualitative and quantitative evidence on how real students experience adaptive prerequisite debugging and persistent cognitive tracking.

### Test Participants
- **User 1 (Student A — Weak Baseline):** Has struggled with recursion in past semesters. Tests the full diagnostic, prerequisite reteaching, and target re-test path.
- **User 2 (Student B — Intermediate):** Understands tree concepts well; tests Concept-Gap Exit Ticket tie-breaker differentiation on careless errors.
- **User 3 (Student C — Second Encounter Tester):** Completes Session 1 (**Data Structures**, target `binary_tree_inorder_traversal`) and returns for Session 2 (**Operating Systems**, target `process_scheduling`) to verify cross-course memory transfer without domain bleeding.

---

## 2. Step-by-Step Walkthrough Scripts

### Script for Session 1 (Users 1 & 2 — Data Structures `ds_101`)

```text
[Step 1] Initial Setup:
  - Direct student to open the VISION Study Interface.
  - Prompt: "Teach me Binary Tree Inorder Traversal and check whether I really understand it."

[Step 2] Diagnostic Check:
  - Supervisor routes to Exercise Agent for initial target question.
  - Question: "For a binary tree node with left child B, root A, and right child C, what is the output sequence of an inorder traversal?"
  - User 1 answers incorrectly: "A, B, C" (Root → Left → Right).
  - User 2 answers correctly: "B, A, C" (Immediate pass path → TARGET_MASTERED).

[Step 3] Concept-Gap Exit Ticket Tie-Breaker:
  - Diagnostic Agent detects ambiguity for User 1.
  - Tie-Breaker Question: "When performing an inorder traversal, which sub-tree or node must be completely visited BEFORE processing the current root node?"
  - User 1 Response: "The root node is processed first."
  - Confirms recursion / sub-tree processing breakdown.

[Step 4] Grounded Reteaching:
  - Diagnostic Agent proposes candidate prerequisite ("recursion"). Validator checks graph edge.
  - Resource Agent retrieves verified notes (ds_notes_sec3).
  - Tutor Agent reteaches recursion using preferred mode ("short_example_and_diagram").
  - Explanation does NOT reveal answer to original target question ("B, A, C").

[Step 5] Prerequisite Recheck:
  - Exercise Agent presents targeted recursion base-case question.
  - User 1 answers correctly: "Returns without processing node when NULL."
  - Evaluation Agent marks recursion as "demonstrated".

[Step 6] Target Re-test & Mastery:
  - Supervisor routes back to RECHECK_ORIGINAL.
  - User 1 answers target question correctly ("B, A, C").
  - Session transitions to TARGET_MASTERED -> SESSION_COMPLETE. Persistent state updated.
```

### Script for Session 2 (User 3 — Second Encounter in Operating Systems `os_201`)

```text
[Step 1] Initiate Session 2:
  - Student C initiates study session for a NEW course & target: "Process Scheduling" (os_201).

[Step 2] Observe Memory Persistence & Isolation:
  - System loads StudentState from Session 1.
  - Confirm system reuses successful_modes ("short_example_and_diagram") for explaining context switching.
  - Confirm system does NOT transfer Data Structures concepts, recursion history, or tree nodes into OS.
  - OS prerequisite diagnosis operates strictly on OS dependency graph edges.
```

---

## 3. Feedback Capture Sheet

| Field | User 1 (Student A) | User 2 (Student B) | User 3 (Student C) |
|---|---|---|---|
| **Student ID / Alias** | Student A | Student B | Student C |
| **First Point of Hesitation** | | | |
| **Did Tie-Breaker Clarify Gap? (Y/N)** | | | |
| **Did Reteaching Feel Grounded? (1-5)**| | | |
| **Was 2nd Session Preference Reuse Visible?** | N/A | N/A | |
| **Student Quote / Qualitative Note**| | | |
| **Concrete UX Improvement Identified**| | | |
