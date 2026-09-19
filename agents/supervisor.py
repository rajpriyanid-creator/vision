"""
VISION Supervisor Agent — Specialized for Computer Science & Programming.
Focus areas: Data Structures, Algorithms, Programming Languages (C++, Java, Python, C, JS/TS, Go, Rust),
Web Frameworks (React, Angular, Vue, Node.js, Next.js, Django), Databases, and Systems.
Dynamically builds prerequisite graphs and conducts Prerequisite Readiness Checks.
"""

from __future__ import annotations
from typing import Dict, Any, List, Optional
from slice.state_manager import StudentState, CourseContext, StudySession
from slice.llm_client import LLMClient
import json
from pathlib import Path


class SupervisorAgent:
    """
    Session Coordinator & Prerequisite Architecture Agent for Computer Science.
    Capabilities:
    1. Generates CS prerequisite DAGs (Data Structures, Algorithms, Frameworks, Languages).
    2. Generates 2-3 question Prerequisite Readiness Quizzes for self-declared "partially" known topics.
    3. Evaluates quiz responses against a 70% mastery threshold.
    4. Orchestrates study pathways and dynamic topic switching.
    """

    SYSTEM_PROMPT_CURRICULUM = """You are a Principal Computer Science Curriculum Architect and Assessment Engineer.

Your domain is STRICTLY COMPUTER SCIENCE & SOFTWARE DEVELOPMENT:
- Data Structures & Algorithms (Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Hash Tables, Heaps, Sorting, Recursion, Dynamic Programming)
- Programming Languages (C++, Java, Python, C, JavaScript, TypeScript, Go, Rust)
- Web & App Frameworks (React, Angular, Vue, Node.js, Next.js, Django, Spring Boot)
- Core Systems (Pointers, Memory Allocation, Concurrency, Databases, OS, Networking)

Given a target concept, determine:
1. DIRECT PREREQUISITES (Level 1 only, no deeper prerequisites):
   - For Foundational Concepts (e.g. Arrays, Strings, Variables, Basic Syntax, Arithmetic) -> Return empty list `[]` (ZERO prerequisites).
   - For other CS concepts, identify the exact direct prerequisite data structure or programming concept.
     EXAMPLES OF EXACT DIRECT PREREQUISITES:
     * Graph / Graphs -> Arrays (or Lists for Adjacency Matrix / Adjacency List representation)
     * Binary Trees / BST -> Linked Lists (for linked node pointers)
     * Linked Lists -> Pointers & References (or Memory Addresses)
     * Stacks / Queues -> Arrays (or Lists)
     * Heaps / Priority Queues -> Arrays
     * Hash Tables / Hashing -> Arrays
     * Dynamic Programming -> Recursion
     * Recursion -> Call Stack & Functions
     * React Hooks / Component State -> JavaScript Closures & Functions
   - CRITICAL: NEVER use placeholder phrases like "${concept} Foundations", "${concept} Basics", "Fundamentals", or "Core Primitives". You must output the REAL, EXACT computer science prerequisite name (e.g. "Arrays", "Linked Lists", "Pointers", "Recursion", etc.).

2. CRITICAL DEPTH LIMIT (Strictly Level 1 only!):
   - You MUST NOT give prerequisites of level more than 1.
   - For example: For Binary Trees, the prerequisite is Linked Lists. DO NOT include Pointers (which is a prerequisite of Linked Lists).
   - For Graphs, the prerequisite is Arrays. DO NOT include Pointers or Bits.
   - Every prerequisite node MUST have an empty list `[]`.
   - There must NEVER be any edge that is not directly connected to the main requested target concept.

3. 3-4 high quality, technically accurate assessment questions specifically about the target concept to prepare downstream Exercise and Evaluation agents.

Return ONLY a JSON object with this exact structure:
{
  "course_name": "<subject/framework name>",
  "concepts": ["target_id", "direct_prereq_1"],
  "dependency_graph": {
    "target_id": ["direct_prereq_1"],
    "direct_prereq_1": []
  },
  "concept_titles": {
    "target_id": "Target Concept Name",
    "direct_prereq_1": "Exact CS Prerequisite Name (e.g. Arrays, Linked Lists, Pointers)"
  },
  "questions": [
    {
      "id": 1,
      "question": "<Clear, technically rigorous CS question on the target concept>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "correct_answer": "Option A",
      "explanation": "<Technical explanation of why this is correct and why distractors are wrong>",
      "question_format": "mcq",
      "difficulty": 2
    },
    {
      "id": 2,
      "question": "<Second CS question evaluating mechanics, time/space complexity, or memory>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1,
      "correct_answer": "Option B",
      "explanation": "<Explanation>",
      "question_format": "mcq",
      "difficulty": 3
    },
    {
      "id": 3,
      "question": "<Third CS question on edge cases, operations, or implementation details>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 2,
      "correct_answer": "Option C",
      "explanation": "<Explanation>",
      "question_format": "mcq",
      "difficulty": 3
    }
  ]
}

Rules:
- Strictly Level 1 prerequisites only. Zero indirect or transitive prerequisites.
- Questions must be 100% specific to the target concept.
- NEVER use generic labels like 'Foundations' or 'Basics'. Use exact CS terms.
- Use clean snake_case for concept IDs."""

    SYSTEM_PROMPT_PREREQ_QUIZ = """You are the VISION Prerequisite Diagnostic Examiner for Computer Science.
Generate a focused 2-3 question diagnostic quiz to verify if a student genuinely understands the prerequisite concept.
Questions must test fundamental conceptual understanding or code behavior in Computer Science.

Return JSON only in this exact structure:
{
  "concept": "<concept_id>",
  "questions": [
    {
      "id": 1,
      "question": "<Clear, concise CS question>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0, // 0-based index of correct option
      "explanation": "<Brief explanation of why this answer is correct>"
    },
    {
      "id": 2,
      "question": "<Second CS question>",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1,
      "explanation": "<Brief explanation>"
    }
  ]
}"""

    def __init__(self):
        self.llm = LLMClient()

    def build_course_context(
        self,
        subject: str,
        target_concept: str,
        course_id: str
    ) -> tuple[CourseContext, Dict[str, str], List[Dict[str, Any]]]:
        """Dynamically generates a Level-1 CS prerequisite DAG and 3-4 targeted questions for any programming topic."""
        target_id = _to_id(target_concept)
        curriculum_questions: List[Dict[str, Any]] = []

        if self.llm.is_live:
            user_prompt = f"""Computer Science Domain: {subject or 'Data Structures & Algorithms'}
Target Concept Name: {target_concept}
Target Concept ID (use this exact key): {target_id}

For this topic "{target_concept}", determine its direct prerequisites (Level 1 only, no deeper prerequisites).
Rules:
1. Foundational concepts (e.g. Arrays, Strings, Variables, Primitive Types) have ZERO prerequisites -> Return empty list `[]`.
2. For concepts with prerequisites, provide the EXACT CS prerequisite (e.g., Graph -> Arrays, Binary Trees -> Linked Lists, Linked Lists -> Pointers, Stack -> Arrays, Dynamic Programming -> Recursion).
3. NEVER use vague labels like "{target_concept} Foundations" or "Basics".
4. Max depth is strictly 1: every prerequisite node must have an empty dependency list `[]`.
5. Return JSON only with key "{target_id}"."""
            try:
                result = self.llm.escalate(self.SYSTEM_PROMPT_CURRICULUM, user_prompt, max_tokens=1536)
                if isinstance(result, str):
                    from slice.llm_client import LLMClient as _LC
                    result = _LC._parse_json(result)

                raw_dep_graph: Dict[str, List[str]] = result.get("dependency_graph", {})
                raw_concept_titles: Dict[str, str] = result.get("concept_titles", {})
                course_name = result.get("course_name", subject)
                curriculum_questions = result.get("questions", [])

                # Flexible key resolution for target_id
                target_key = target_id
                if target_key not in raw_dep_graph:
                    for k in raw_dep_graph.keys():
                        if _to_id(k) == target_id or target_id in _to_id(k) or _to_id(k) in target_id:
                            target_key = k
                            break

                direct_prereqs = raw_dep_graph.get(target_key, [])
                
                # Sanitize: filter out any invalid or self-referential or generic placeholders
                cleaned_prereqs: List[str] = []
                for p in direct_prereqs:
                    p_id = _to_id(p)
                    if (p_id != target_id and 
                        not p_id.endswith("_foundations") and 
                        not p_id.endswith("_foundation") and 
                        not p_id.endswith("_basics") and 
                        p_id != f"{target_id}_fundamentals"):
                        cleaned_prereqs.append(p_id)

                dep_graph: Dict[str, List[str]] = {target_id: cleaned_prereqs}
                concepts = [target_id]
                concept_titles = {target_id: raw_concept_titles.get(target_key, target_concept)}

                for p in cleaned_prereqs:
                    dep_graph[p] = []  # Strictly Level 1
                    concepts.append(p)
                    title = raw_concept_titles.get(p) or raw_concept_titles.get(p.replace("_", " ")) or p.replace("_", " ").title()
                    concept_titles[p] = title

                return CourseContext(
                    course_id=course_id,
                    course_name=course_name,
                    concepts=concepts,
                    dependency_graph=dep_graph,
                    source_ids=["gemini-dynamic-dag"]
                ), concept_titles, curriculum_questions
            except Exception as e:
                print(f"[SupervisorAgent] LLM DAG generation fallback triggered ({e})")

        # Robust, concept-specific CS Knowledge Builder (Offline / Fallback) with Level-1 rule enforced
        dep_graph, concepts, concept_titles, curriculum_questions = self._build_offline_cs_curriculum(subject, target_concept, target_id)

        return CourseContext(
            course_id=course_id,
            course_name=subject or "Computer Science",
            concepts=concepts,
            dependency_graph=dep_graph,
            source_ids=["vision-cs-curriculum-engine"]
        ), concept_titles, curriculum_questions

    def _build_offline_cs_curriculum(self, subject: str, target_concept: str, target_id: str):
        """Intelligent, concept-specific Level-1 Computer Science prerequisite & question generator."""
        c_lower = target_concept.lower()

        # 1. Foundational concepts: ZERO prerequisites
        if (target_id in {"array", "arrays", "string", "strings", "variables", "basic_syntax", "primitive_types"} or
            "array" == c_lower or "arrays" == c_lower or "string" == c_lower or "strings" == c_lower):
            dep_graph = {target_id: []}
            concept_titles = {target_id: target_concept.title()}
            questions = [
                {
                    "id": 1,
                    "question": f"In Computer Science, what is the defining characteristic of {target_concept.title()}?",
                    "options": [
                        "Contiguous indexed sequential storage with O(1) random access by index",
                        "Non-contiguous linked node chaining",
                        "Automatic hashing with key-value eviction",
                        "Hierarchical parent-child recursive tree structure"
                    ],
                    "correct_index": 0,
                    "correct_answer": "Contiguous indexed sequential storage with O(1) random access by index",
                    "explanation": "Arrays/strings store elements in contiguous memory locations, enabling O(1) direct index address computation."
                },
                {
                    "id": 2,
                    "question": "What is the time complexity of inserting an element at the beginning of a fixed-size contiguous array of size N?",
                    "options": [
                        "O(N) linear time due to shifting existing elements",
                        "O(1) constant time",
                        "O(log N) logarithmic time",
                        "O(N^2) quadratic time"
                    ],
                    "correct_index": 0,
                    "correct_answer": "O(N) linear time due to shifting existing elements",
                    "explanation": "Inserting at index 0 requires shifting all N elements right by one position."
                }
            ]

        # 2. Graph / Graphs: Level 1 prereq is Arrays (Adjacency Matrix / Adjacency List)
        elif "graph" in target_id or "graph" in c_lower:
            dep_graph = {
                target_id: ["arrays"],
                "arrays": []
            }
            concept_titles = {
                target_id: "Graph Data Structure",
                "arrays": "Arrays & Lists"
            }
            questions = [
                {
                    "id": 1,
                    "question": "In Graph representation, what is the primary space complexity difference between an Adjacency Matrix and an Adjacency List for a graph with V vertices and E edges?",
                    "options": [
                        "Adjacency Matrix requires O(V^2) space; Adjacency List requires O(V + E) space",
                        "Adjacency Matrix requires O(V + E) space; Adjacency List requires O(V^2) space",
                        "Both require strictly O(E^2) space",
                        "Adjacency List requires O(1) auxiliary memory"
                    ],
                    "correct_index": 0,
                    "correct_answer": "Adjacency Matrix requires O(V^2) space; Adjacency List requires O(V + E) space",
                    "explanation": "An Adjacency Matrix uses a 2D V x V array taking O(V^2) memory, whereas an Adjacency List only allocates entries for actual existing edges O(V + E), which is far more memory-efficient for sparse graphs."
                },
                {
                    "id": 2,
                    "question": "Which data structure is typically utilized to perform Breadth-First Search (BFS) graph traversal?",
                    "options": [
                        "Queue (FIFO)",
                        "Stack (LIFO)",
                        "Binary Max Heap",
                        "Hash Set only"
                    ],
                    "correct_index": 0,
                    "correct_answer": "Queue (FIFO)",
                    "explanation": "BFS explores vertices level by level, using a Queue (FIFO) to visit adjacent neighbors before moving to the next distance layer."
                },
                {
                    "id": 3,
                    "question": "What is the time complexity of checking if an edge exists between vertex u and vertex v in an Adjacency Matrix of size V?",
                    "options": [
                        "O(1) constant time direct matrix lookup matrix[u][v]",
                        "O(V) linear search across the row",
                        "O(E) edge traversal",
                        "O(log V) binary search"
                    ],
                    "correct_index": 0,
                    "correct_answer": "O(1) constant time direct matrix lookup matrix[u][v]",
                    "explanation": "Because an adjacency matrix is a 2D array, accessing matrix[u][v] is a direct O(1) index calculation."
                }
            ]

        # 3. Binary Tree / Trees / BST: Level 1 prereq is Linked List only (NOT pointers)
        elif "tree" in target_id or "tree" in c_lower:
            dep_graph = {
                target_id: ["linked_list"],
                "linked_list": []
            }
            concept_titles = {
                target_id: target_concept.title(),
                "linked_list": "Linked List"
            }
            questions = [
                {
                    "id": 1,
                    "question": f"How do nodes in a Binary Tree differ from nodes in a Singly Linked List?",
                    "options": [
                        "A Binary Tree node has two child pointers (left & right) rather than a single next pointer",
                        "A Binary Tree stores data in contiguous array indices only",
                        "A Binary Tree does not use heap memory allocation",
                        "A Binary Tree can only hold numeric floating point values"
                    ],
                    "correct_index": 0,
                    "correct_answer": "A Binary Tree node has two child pointers (left & right) rather than a single next pointer",
                    "explanation": "Each binary tree node extends linked node structures by maintaining up to two branch references (left and right)."
                },
                {
                    "id": 2,
                    "question": "In a balanced Binary Search Tree (BST) with N nodes, what is the average time complexity for searching a key?",
                    "options": [
                        "O(log N)",
                        "O(N)",
                        "O(1)",
                        "O(N log N)"
                    ],
                    "correct_index": 0,
                    "correct_answer": "O(log N)",
                    "explanation": "Each comparison in a balanced BST halves the search space, yielding O(log N) average time."
                }
            ]

        # 4. Linked List: Level 1 prereq is Pointers & References only
        elif "linked_list" in target_id or "linked list" in c_lower:
            dep_graph = {
                "linked_list": ["pointers_and_references"],
                "pointers_and_references": []
            }
            concept_titles = {
                "linked_list": "Linked List",
                "pointers_and_references": "Pointers & References"
            }
            questions = [
                {
                    "id": 1,
                    "question": "What is the primary advantage of a Singly Linked List over a standard fixed-size Array?",
                    "options": [
                        "O(1) dynamic insertion and deletion at known node references without shifting elements",
                        "O(1) random access to any arbitrary element by index",
                        "Lower memory consumption per stored element",
                        "Automatic hardware cache line optimization"
                    ],
                    "correct_index": 0,
                    "correct_answer": "O(1) dynamic insertion and deletion at known node references without shifting elements",
                    "explanation": "Linked lists store elements non-contiguously using pointers, allowing insertions and deletions in O(1) time without element shifting."
                },
                {
                    "id": 2,
                    "question": "In a Singly Linked List, what is the time complexity of accessing the k-th node from the head?",
                    "options": [
                        "O(1) constant time",
                        "O(k) linear sequential traversal from the head pointer",
                        "O(log k) binary search time",
                        "O(k^2) quadratic time"
                    ],
                    "correct_index": 1,
                    "correct_answer": "O(k) linear sequential traversal from the head pointer",
                    "explanation": "Because linked list nodes are not stored in contiguous memory addresses, random indexing is impossible and requires sequential traversal from the head."
                }
            ]

        # 5. Heap / Priority Queue: Level 1 prereq is Arrays
        elif "heap" in target_id or "heap" in c_lower or "priority_queue" in target_id:
            dep_graph = {
                target_id: ["arrays"],
                "arrays": []
            }
            concept_titles = {
                target_id: "Binary Heap / Priority Queue",
                "arrays": "Arrays & Index Storage"
            }
            questions = [
                {
                    "id": 1,
                    "question": "In an array-based representation of a 0-indexed Binary Max Heap, what is the index of the parent of a node at index i?",
                    "options": [
                        "(i - 1) // 2",
                        "2 * i + 1",
                        "2 * i + 2",
                        "i // 2"
                    ],
                    "correct_index": 0,
                    "correct_answer": "(i - 1) // 2",
                    "explanation": "In a 0-indexed complete binary tree array, the parent of index i is at (i - 1) // 2, left child is at 2i + 1, and right child is at 2i + 2."
                }
            ]

        # 6. Hash Table / Hashing: Level 1 prereq is Arrays
        elif "hash" in target_id or "hash" in c_lower:
            dep_graph = {
                target_id: ["arrays"],
                "arrays": []
            }
            concept_titles = {
                target_id: "Hash Table & Hashing",
                "arrays": "Arrays & Memory Indexing"
            }
            questions = [
                {
                    "id": 1,
                    "question": "What is the expected average-case time complexity of lookup, insert, and delete operations in a Hash Table?",
                    "options": [
                        "O(1)",
                        "O(log N)",
                        "O(N)",
                        "O(N log N)"
                    ],
                    "correct_index": 0,
                    "correct_answer": "O(1)",
                    "explanation": "A good hash function distributes keys uniformly across array buckets, yielding O(1) average-case time."
                }
            ]

        # 7. Dynamic Programming: Level 1 prereq is Recursion
        elif "dynamic_programming" in target_id or "dp" in target_id or "dynamic programming" in c_lower:
            dep_graph = {
                target_id: ["recursion"],
                "recursion": []
            }
            concept_titles = {
                target_id: "Dynamic Programming",
                "recursion": "Recursion & Subproblems"
            }
            questions = [
                {
                    "id": 1,
                    "question": "What two key properties must a problem exhibit for Dynamic Programming to be applicable?",
                    "options": [
                        "Optimal Substructure and Overlapping Subproblems",
                        "Greedy Choice Property and Infinite Recursion",
                        "Linear Independence and Matrix Invertibility",
                        "Strict Monotonicity and Fixed Memory Allocation"
                    ],
                    "correct_index": 0,
                    "correct_answer": "Optimal Substructure and Overlapping Subproblems",
                    "explanation": "DP optimizes solutions by memoizing or tabulating solutions to overlapping subproblems that compose an optimal global solution."
                }
            ]

        # 8. Recursion: Level 1 prereq is Call Stack & Functions
        elif "recursion" in target_id or "recursion" in c_lower:
            dep_graph = {
                target_id: ["call_stack_and_functions"],
                "call_stack_and_functions": []
            }
            concept_titles = {
                target_id: "Recursion",
                "call_stack_and_functions": "Call Stack & Functions"
            }
            questions = [
                {
                    "id": 1,
                    "question": "What is the consequence of omitting a base case in a recursive function?",
                    "options": [
                        "Unbounded stack frame growth leading to a Stack Overflow runtime exception",
                        "Automatic garbage collection of all global variables",
                        "Immediate compilation failure with static analysis warnings only",
                        "Reversal of the input data stream"
                    ],
                    "correct_index": 0,
                    "correct_answer": "Unbounded stack frame growth leading to a Stack Overflow runtime exception",
                    "explanation": "Without a terminating base case, each recursive invocation pushes a new stack frame until available call stack memory is exhausted."
                }
            ]

        # 9. Stack: Level 1 prereq is Arrays
        elif "stack" in target_id or "stack" in c_lower:
            dep_graph = {
                "stack": ["arrays"],
                "arrays": []
            }
            concept_titles = {
                "stack": "Stack Data Structure",
                "arrays": "Arrays & Sequential Storage"
            }
            questions = [
                {
                    "id": 1,
                    "question": "Which operation ordering discipline defines a Stack data structure?",
                    "options": [
                        "LIFO (Last-In, First-Out)",
                        "FIFO (First-In, First-Out)",
                        "Random Access by key hash",
                        "Priority-based eviction"
                    ],
                    "correct_index": 0,
                    "correct_answer": "LIFO (Last-In, First-Out)",
                    "explanation": "In a stack, the last element pushed onto the top is the first element popped off."
                }
            ]

        # 10. Queue: Level 1 prereq is Arrays
        elif "queue" in target_id or "queue" in c_lower:
            dep_graph = {
                "queue": ["arrays"],
                "arrays": []
            }
            concept_titles = {
                "queue": "Queue Data Structure",
                "arrays": "Arrays & Sequential Storage"
            }
            questions = [
                {
                    "id": 1,
                    "question": "What is the characteristic ordering of a Queue data structure?",
                    "options": [
                        "FIFO (First-In, First-Out): elements are enqueued at the tail and dequeued from the head",
                        "LIFO (Last-In, First-Out): elements are popped from the top",
                        "Elements sorted automatically upon insertion",
                        "Bidirectional indexing with middle-out removal"
                    ],
                    "correct_index": 0,
                    "correct_answer": "FIFO (First-In, First-Out)",
                    "explanation": "Queues maintain FIFO ordering where the earliest enqueued item is served first."
                }
            ]

        # 11. React Hooks / State: Level 1 prereq is JavaScript Closures & Functions
        elif "react" in target_id or "react" in c_lower:
            dep_graph = {
                "react_hooks": ["javascript_closures_and_functions"],
                "javascript_closures_and_functions": []
            }
            concept_titles = {
                "react_hooks": "React Hooks & Component State",
                "javascript_closures_and_functions": "JavaScript Closures & Functions"
            }
            questions = [
                {
                    "id": 1,
                    "question": "Why must React state never be mutated directly (e.g. state.count = 5)?",
                    "options": [
                        "Direct mutation does not trigger the component re-render reconciliation cycle",
                        "Direct mutation causes syntax compile errors in JavaScript",
                        "React converts all variables to frozen strings",
                        "Direct mutation automatically clears browser localStorage"
                    ],
                    "correct_index": 0,
                    "correct_answer": "Direct mutation does not trigger the component re-render reconciliation cycle",
                    "explanation": "React detects state changes by reference equality comparison. Direct mutations bypass setter triggers and prevent UI re-renders."
                }
            ]

        # 12. General Fallback: Concrete CS concepts (Arrays/Lists) — NEVER generic "Foundations"
        else:
            dep_graph = {
                target_id: ["arrays"],
                "arrays": []
            }
            concept_titles = {
                target_id: target_concept.title(),
                "arrays": "Arrays & Data Types"
            }
            questions = [
                {
                    "id": 1,
                    "question": f"In Computer Science, what is the core mechanism and defining property of {target_concept}?",
                    "options": [
                        f"It structures and processes data according to specific algorithmic invariants and time/space constraints",
                        f"It bypasses CPU instruction execution",
                        f"It is solely an operating system kernel thread interrupt",
                        f"It disables variable scope evaluation"
                    ],
                    "correct_index": 0,
                    "correct_answer": f"It structures and processes data according to specific algorithmic invariants and time/space constraints",
                    "explanation": f"{target_concept} provides defined structures and operations for computational efficiency."
                }
            ]

        concepts = list(dep_graph.keys())
        return dep_graph, concepts, concept_titles, questions

    def generate_prereq_quiz(self, prereq_concept: str, subject: str = "", count: int = 2) -> Dict[str, Any]:
        """Generates a 2-question diagnostic multiple choice quiz to test 'Partially' known prerequisites."""
        concept_clean = prereq_concept.replace("_", " ").title()

        if not self.llm.is_live:
            return {
                "concept": prereq_concept,
                "concept_title": concept_clean,
                "questions": [
                    {
                        "id": 1,
                        "question": f"In Computer Science, what is the core purpose or defining characteristic of {concept_clean}?",
                        "options": [
                            f"It manages structure, sequencing, or references for dependent operations.",
                            f"It completely bypasses memory management.",
                            f"It is only used for graphic rendering.",
                            f"It terminates program execution immediately."
                        ],
                        "correct_index": 0,
                        "explanation": f"{concept_clean} is a foundational building block for data handling and program flow."
                    },
                    {
                        "id": 2,
                        "question": f"Which of the following statements about {concept_clean} is TRUE?",
                        "options": [
                            f"It cannot be combined with other data structures.",
                            f"Understanding it is required to reason about more complex composite structures.",
                            f"It has zero runtime complexity.",
                            f"It is deprecated in modern programming languages."
                        ],
                        "correct_index": 1,
                        "explanation": f"{concept_clean} forms the prerequisite foundation for higher-level structures and algorithms."
                    }
                ]
            }

        user_prompt = f"""Subject/Language: {subject or 'Computer Science'}
Prerequisite Concept: {prereq_concept} ({concept_clean})
Number of diagnostic questions: {count}

Generate a high quality {count}-question CS diagnostic check."""

        raw = self.llm.chat_json(self.SYSTEM_PROMPT_PREREQ_QUIZ, user_prompt, max_tokens=768)
        questions = raw.get("questions", [])
        if not questions:
            # Fallback
            return self.generate_prereq_quiz(prereq_concept, subject, count=2)

        return {
            "concept": prereq_concept,
            "concept_title": concept_clean,
            "questions": questions
        }

    def evaluate_prereq_quiz(
        self,
        prereq_concept: str,
        quiz_data: Dict[str, Any],
        student_answers: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluates student's responses to the prerequisite quiz.
        Returns score percentage, passed (>= 70%), and itemized breakdown.
        """
        questions = quiz_data.get("questions", [])
        if not questions:
            return {"score": 100.0, "passed": True, "details": []}

        correct_count = 0
        total_count = len(questions)
        details = []

        for q in questions:
            q_id = str(q.get("id"))
            selected = student_answers.get(q_id)
            correct_idx = q.get("correct_index", 0)
            
            # Match either index (int or str) or exact option text
            is_correct = False
            if selected is not None:
                if str(selected).isdigit() and int(selected) == correct_idx:
                    is_correct = True
                elif isinstance(selected, str) and q.get("options") and selected in q["options"]:
                    if q["options"].index(selected) == correct_idx:
                        is_correct = True

            if is_correct:
                correct_count += 1

            details.append({
                "question_id": q.get("id"),
                "question": q.get("question"),
                "selected": selected,
                "correct_option": q.get("options", [])[correct_idx] if q.get("options") and correct_idx < len(q.get("options")) else correct_idx,
                "is_correct": is_correct,
                "explanation": q.get("explanation", "")
            })

        score = (correct_count / total_count) * 100.0
        passed = score >= 70.0

        return {
            "concept": prereq_concept,
            "score": round(score, 1),
            "passed": passed,
            "correct_count": correct_count,
            "total_count": total_count,
            "details": details,
            "threshold": 70.0
        }

    def plan_next_step(
        self,
        student_state: StudentState,
        course_context: CourseContext,
        session: StudySession
    ) -> Dict[str, Any]:
        user_prompt = f"""Target concept: {session.target_concept}
Mastered: {student_state.mastered}
Weak: {student_state.weak}
Call count so far: {session.call_count}

Plan the next step for this CS topic. Return JSON."""

        if not self.llm.is_live:
            return {
                "target_concept": session.target_concept,
                "next_agent": "Exercise",
                "action": "generate_initial_target_question",
                "reasoning": "Start with a low-stakes target check before deciding whether a prerequisite needs repair.",
            }

        result = self.llm.chat_json(
            "You are the VISION Supervisor Agent. Plan the next action. Return JSON: {\"target_concept\": \"...\", \"next_agent\": \"...\", \"action\": \"...\", \"reasoning\": \"...\"}",
            user_prompt,
            max_tokens=256
        )
        return {
            "target_concept": result.get("target_concept", session.target_concept),
            "next_agent": result.get("next_agent", "Exercise"),
            "action": result.get("action", "generate_initial_target_question"),
            "reasoning": result.get("reasoning", "Initiating study session.")
        }


def _to_id(text: str) -> str:
    """Convert concept name to snake_case id."""
    import re
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")

