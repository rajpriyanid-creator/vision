# Data Structures Prerequisite Graph Specification

This document details the 6-concept branching prerequisite graph topology, diagnostic triggers, and edge rejection test nodes for the hackathon prototype.

---

## 1. Graph Topology

```text
               [Node 1: binary_tree_inorder_traversal] (Target)
                       /                       \
                      /                         \
                     ▼                           ▼
          [Node 2: tree_traversal_order]     [Node 3: recursion]
                                             /                 \
                                            /                   \
                                           ▼                     ▼
                             [Node 4: base_case_evaluation]  [Node 5: call_stack_reasoning]

   [Node 6: array_traversal] (Unconnected Concept — Used for Edge Rejection Validation)
```

---

## 2. Concept Node Definitions

### Node 1: `binary_tree_inorder_traversal` (Target Concept)
- **Description:** Visiting every node in a binary tree in symmetric order ($L \rightarrow N \rightarrow R$).
- **Success Criteria:** Correctly produces sequence `B, A, C` for tree `A(B, C)`.
- **Misconception Patterns:**
  - `preorder_confusion`: Outputs `Root, Left, Right` (`A, B, C`).
  - `postorder_confusion`: Outputs `Left, Right, Root` (`B, C, A`).

### Node 2: `tree_traversal_order` (Prerequisite Branch 1)
- **Description:** Grasping the rule definition without recursive implementation details.
- **Tie-Breaker Question:** "In a 3-node tree $A \leftarrow B \rightarrow C$, which node is processed first in inorder traversal?"
- **Expected Answer:** "Node B" (the left child).

### Node 3: `recursion` (Prerequisite Branch 2)
- **Description:** Understanding recursive function self-calls on subproblems.
- **Diagnostic Question:** "When `inorder(node)` is called, what action occurs before printing the current node's value?"
- **Expected Answer:** "Call `inorder(node.left)` to process the left subtree."

### Node 4: `base_case_evaluation` (Sub-Branch 2A)
- **Description:** NULL node pointer checks and base-case termination rules.
- **Diagnostic Question:** "What happens in `inorder(node)` immediately when `node` is NULL?"
- **Expected Answer:** "The function returns without making further calls or printing a value."

### Node 5: `call_stack_reasoning` (Sub-Branch 2B)
- **Description:** Stack frame push/pop operations, execution suspension, and return unwinding.
- **Diagnostic Question:** "What happens to the execution context of the root node frame while `inorder(node.left)` is executing?"
- **Expected Answer:** "The root node frame remains suspended on the call stack until the left call returns."

### Node 6: `array_traversal` (Unconnected Concept — Validator Edge Test)
- **Description:** Linear array iteration.
- **Validator Role:** Used to test that the Workflow Controller deterministically rejects candidate prerequisites missing from the target's dependency DAG with `could_not_establish`.
