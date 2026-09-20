# DEMO CHEATSHEET & JUDGING PRESENTATION GUIDE

**Project:** VISION — Multi-Agent Adaptive Learning & Prerequisite Debugger  
**Repo:** `https://github.com/rajpriyanid-creator/vision`  
**Team:** Binary Beasts (Rajpriyan S, Megala M, Jeevananthan K, Dhanush S)  

---

## 1. The 1-Slide Pitch (Single Slide Maximum)

* **Problem:** Traditional AI tutors operate as linear prompt wrappers. When a student fails a problem, they repeat the same explanation or move on, ignoring underlying conceptual prerequisite gaps and hallucinating citations.
* **Solution (VISION):** A 6-agent system operating as a **Smart Loop Restaurant Kitchen**:
  1. **Saved State (`StoredSession`):** Memory lives outside chat in a persistent DB across sessions.
  2. **Hard Loop Limits (`revision_count > 4`):** Strictly capped loops prevent runaway token spend; escalates to `WAITING_FOR_HUMAN`.
  3. **Explicit Contracts (`contracts.ts`):** Typed JSON schemas govern all agent-to-agent handoffs.
  4. **Human Approval Checkpoint:** Pauses for instructor sign-off when stuck before resuming.
* **Result:** Real testing with 3 external engineering students proved a 100% target retest pass rate after prerequisite gap repair.

---

## 2. Live Demo Script (Step-by-Step Walkthrough)

> **CRITICAL RULE:** Must clearly show the **step that sends work backwards**!

1. **Step 1 — Start Target Session (30 sec):**
   - Click **"Start Study Session"** on Data Structures (`cs_101`).
   - Supervisor Agent loads the DAG and N-Part Roadmap, presenting Part 1 initial teaching and target question: `binary_tree_inorder_traversal`.

2. **Step 2 — Trigger Backward Loop (30 sec - MOST CRITICAL STEP):**
   - Select the **incorrect answer** (`A, B, C`).
   - Click **Submit Answer**.
   - Watch the UI update live: `DiagnosticAgent` analyzes the misstep, traces the prerequisite DAG down to `recursion`, and **sends work BACKWARD**.
   - Highlight the banner to the judges:
     `🔄 BACKWARD LOOP ACTIVE · Diagnostic Agent Sent Work Backward to Repair Prerequisite Gap`.

3. **Step 3 — Grounded Repair & Recheck (45 sec):**
   - Show how `ResourceAgent` pulled verified quotes from `corpus/data_structures_notes.md`.
   - Show the code sandbox execution and Socratic hint ladder.
   - Click **"Complete Repair Practice"** and answer the recursion question correctly.

4. **Step 4 — Forward Target Retest & Mastery (30 sec):**
   - System loops forward back to `RECHECK_ORIGINAL` for `binary_tree_inorder_traversal`.
   - Select the correct answer (`B, A, C`).
   - System transitions to `TARGET_MASTERED`.

---

## 3. The 30-Second Failure Drill (Handling Judge "Show It Failing" Questions)

> Judges will ask: *"Show it failing, right now."*

* **How to trigger:**
  - In `PRACTICE` mode, rapidly submit 5 wrong answers.
* **What happens:**
  - The loop counter hits `revision_count = 5` (`> 4`).
  - The **Hard Loop Limit** fires immediately. The workflow stops repeating AI calls and displays the **`WAITING_FOR_HUMAN` Escalation Card**.
* **What to tell judges:**
  - *"This demonstrates Principle 2 (Hard Loop Limits) and Principle 4 (Human Approval). Instead of endlessly looping and burning cloud credit, the system catches itself, saves state to the ledger, and requests human head-chef sign-off before resuming."*

---

## 4. Scoring Rubric Alignment Quick Reference

| Rubric Dimension | Weight | Our Implementation & Location |
| :--- | :--- | :--- |
| **Working Agentic Slice** | **35 Points** | End-to-end multi-agent orchestration (`server/workflow/controller.ts`) with visible backward loop in `RepairLesson.tsx`. |
| **Real User Evidence** | **35 Points** | Documented in `USER-TESTING-EVIDENCE.md` with 3 named external student walkthroughs, identified friction points, and code changes. |
| **Whether it Helped / Pivot** | **20 Points** | Pre/post 100% retest pass rate; pivoted from pure verbal text to interactive code sandbox based on user testing. |
| **Work Rhythm & Demo** | **10 Points** | Regular commit rhythm, `PRE-EVENT-ASSETS.md`, `doctor.py` diagnostic, frozen commit ready. |
