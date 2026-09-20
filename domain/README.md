# VISION Data Structures Learning Domain Specification

This directory defines the bounded learning domain, prerequisite graph topology, diagnostic rubrics, and concept schemas for **Data Structures** (Target Topic: **Binary Tree Inorder Traversal**).

---

## 1. Domain Structure Overview

- **`prerequisite_graph.md`**: Human-readable graph topology, concept nodes, and misconception patterns.
- **`prerequisite_graph.json`**: Machine-readable JSON definition of nodes, edges, dependencies, and tie-breaker prompts.
- **`rubric.json`**: Formative assessment rubric mapping student error patterns to candidate prerequisite hypotheses.

---

## 2. Target Concept & Dependency Graph

$$\text{Binary Tree Inorder Traversal} \longrightarrow \text{Recursion} \longrightarrow \text{Call Stack \& Base-Case Reasoning}$$

### Key Concept Identifiers
1. `binary_tree_inorder_traversal`: Main target concept. Rules: Visit Left Subtree $\rightarrow$ Process Node $\rightarrow$ Visit Right Subtree ($L \rightarrow N \rightarrow R$).
2. `recursion`: Core prerequisite. Rules: Function calling itself with smaller subproblems; required base-case handling.
3. `call_stack_reasoning`: Deep prerequisite. Rules: Understanding stack depth, return addresses, and unwinding.

