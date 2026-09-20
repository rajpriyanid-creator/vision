# Approved Course Notes — Data Structures

---

## [Source ID: DS-NOTE-01] Binary Tree Inorder Traversal

Inorder traversal is a depth-first traversal method for binary trees.
The sequence of operations for a node is:
1. Traverse the left subtree recursively by calling `inorder(node.left)`.
2. Visit and process the current node (e.g., print `node.value`).
3. Traverse the right subtree recursively by calling `inorder(node.right)`.

For a 3-node binary tree with Root A, Left Child B, and Right Child C ($B \leftarrow A \rightarrow C$), the inorder traversal order is **B, A, C**.

---

## [Source ID: DS-NOTE-02] Recursion Foundations

Recursion is a programming technique where a function calls itself to solve a smaller instance of the same problem.
Every valid recursive function must contain two essential components:
1. **Base Case:** A terminating condition that stops further recursive calls (e.g., `if (node == null) return;`).
2. **Recursive Step:** The call to the function itself with modified arguments moving towards the base case.

When a recursive function reaches a node, it defers processing the current node until the recursive call on its left child returns.

---

## [Source ID: DS-NOTE-03] Call Stack & Execution Depth

When a function call is executed in a program, a new frame is pushed onto the system **Call Stack**.
The frame stores:
- Function parameters
- Local variables
- Return memory address

In deep recursion, each recursive invocation pushes a new frame onto the stack. When the base case is reached, frames are popped off the stack in Last-In, First-Out (LIFO) order, returning control to the caller.

---

## [Source ID: DS-NOTE-04] Stack Data Structure & LIFO Mechanics

A **Stack** is a linear data structure that follows the **Last-In, First-Out (LIFO)** principle. The element inserted last is the first to be retrieved.

### Core Stack Invariants:
1. **Push Operation:** Adds an element to the top of the stack ($O(1)$ time).
2. **Pop Operation:** Removes and returns the top element from the stack ($O(1)$ time). Underflow occurs if popping an empty stack.
3. **Peek/Top Operation:** Inspects the top element without removing it ($O(1)$ time).
4. **IsEmpty / Size:** Verifies whether the stack contains active elements.

### Applications:
- Evaluating balanced parentheses `{[()]}` and algebraic expressions (Infix to Postfix/Prefix).
- Backtracking algorithms, browser history navigation (Back/Forward), and undo/redo buffers.
- Execution call stack management in compilers and runtime virtual machines.

---

## [Source ID: DS-NOTE-05] Queue Data Structure & FIFO Mechanics

A **Queue** is a linear data structure that adheres to the **First-In, First-Out (FIFO)** discipline. The element inserted first is processed first.

### Core Queue Operations:
1. **Enqueue:** Appends an element to the rear/tail of the queue ($O(1)$ time).
2. **Dequeue:** Removes and returns the front/head element of the queue ($O(1)$ time).
3. **Front/Peek:** Reads the front element without removal ($O(1)$ time).

### Applications:
- Breadth-First Search (BFS) graph and tree traversals.
- Task scheduling, print spoolers, and message streaming buffers.
