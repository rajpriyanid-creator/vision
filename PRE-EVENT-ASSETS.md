# PRE-EVENT ASSETS & INVENTORY

**Project:** VISION — Multi-Agent Adaptive Learning & Prerequisite Debugger  
**Hackathon Event:** Agentic Personalized Education Challenge  
**Team:** Binary Beasts (Rajpriyan S, Megala M, Jeevananthan K, Dhanush S)

---

## 1. Executive Summary & Pre-Event Declaration

All code and assets developed before or during the event window are declared below in accordance with competition rules. The repository leverages foundational course dependency models, domain knowledge graphs, and pedagogical rubrics designed for offline-first resilience and real-time agentic orchestration.

---

## 2. Pre-Event Asset Inventory

### A. Domain Knowledge Graphs & Prerequisite DAGs (`domain/`, `corpus/`)
* **Data Structures & Algorithms Course DAG**:
  - `binary_tree_inorder_traversal` $\rightarrow$ `tree_traversal_ordering` $\rightarrow$ `recursion` $\rightarrow$ `call_stack_reasoning` $\rightarrow$ `base_case_evaluation` $\rightarrow$ `array_traversal`
  - `stack_operations` $\rightarrow$ `lifo_ordering` $\rightarrow$ `array_indexing` $\rightarrow$ `boundary_conditions`
  - `queue_operations` $\rightarrow$ `fifo_ordering` $\rightarrow$ `circular_buffer` $\rightarrow$ `pointer_manipulation`
* **Operating Systems Course DAG**:
  - `virtual_memory` $\rightarrow$ `paging` $\rightarrow$ `tlb_lookup` $\rightarrow$ `page_tables` $\rightarrow$ `address_translation`
* **Approved Pedagogical Evidence Corpus**:
  - `corpus/data_structures_notes.md`: Grounded canonical course notes, invariant definitions, and verified worked examples for binary trees, stacks, and recursion.

### B. Structured Evaluation Rubrics (`server/rubrics/`)
* **Rubric Registry**:
  - Multi-tiered Bloom's Taxonomy rubrics for conceptual understanding, execution tracing, algorithmic invariants, and edge case coverage.
  - Defined private misconception signals (e.g. confusing post-order with in-order, omitting base case returns, off-by-one pointer increments).

### C. Agent Prompt Contracts (`prompts/`)
* Standardized markdown system prompt definitions for all 6 specialized agents:
  - `prompts/supervisor.md`: State machine controller and N-Part Vision Roadmap planner.
  - `prompts/tutor.md`: Grounded lesson synthesizer and Socratic hint ladder.
  - `prompts/exercise.md`: Dynamic assessment generator and code problem designer.
  - `prompts/evaluation.md`: Objective multi-modal grader and sandbox executor.
  - `prompts/diagnostic.md`: DAG causal graph tracer and misconception classifier.
  - `prompts/resource.md`: Verified evidence retriever and provenance validator.

### D. Benchmark Test Fixtures (`tests/`, `evaluation/`)
* **Diagnostic Test Benchmarks**: 15+ synthetic learner profiles testing misconception classification, careless slips, and deep prerequisite voids.
* **Isolated Sandbox Engine**: Node.js VM sandbox harness for executing student code with private test cases and timeout enforcement.

---

## 3. Provenance & Integrity Statement

All AI model interactions strictly enforce grounded evidence retrieval from approved course corpora. No external third-party copyrighted material was incorporated outside the declared open computer science curricula.
