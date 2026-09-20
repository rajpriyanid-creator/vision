import { generateWithGemini } from './gemini';
import { tutorAgent } from './agents/tutorAgent';
import { resourceAgent } from './agents/resourceAgent';
import { LearningPart } from './curriculum/partPlanner';

export interface DAGResult {
  dag: Record<string, string[]>;
  conceptTitles: Record<string, string>;
  targetId: string;
}

export function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export async function buildDAG(subject: string, targetConcept: string): Promise<DAGResult> {
  const normSubject = subject.toLowerCase();
  const normTarget = targetConcept.toLowerCase();

  // Try dynamic generation with Gemini first
  const prompt = `You are a curriculum architect and cognitive knowledge graph engineer.
Subject: "${subject}"
Target Concept: "${targetConcept}"

Construct a targeted prerequisite dependency graph (DAG) for this concept.
The DAG must include 2-3 essential prerequisite concepts that a learner must understand before mastering "${targetConcept}".
Output strictly valid JSON with no markdown formatting:
{
  "target_id": "short_snake_case_id",
  "concept_titles": {
    "short_snake_case_id": "Display Name",
    "prereq_1_id": "Direct Prereq 1 Name",
    "prereq_2_id": "Direct Prereq 2 Name",
    "sub_prereq_id": "Sub Prereq Name"
  },
  "dag": {
    "short_snake_case_id": ["prereq_1_id", "prereq_2_id"],
    "prereq_1_id": [],
    "prereq_2_id": ["sub_prereq_id"],
    "sub_prereq_id": []
  }
}`;

  const aiText = await generateWithGemini(prompt);
  if (aiText) {
    try {
      const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.dag && parsed.concept_titles && parsed.target_id) {
        return {
          targetId: parsed.target_id,
          conceptTitles: parsed.concept_titles,
          dag: parsed.dag
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Domain-specific curated fallback DAGs
  if (normTarget.includes('stack')) {
    return {
      targetId: 'stack_data_structure',
      conceptTitles: {
        stack_data_structure: targetConcept || 'Stack Data Structure',
        lifo_ordering_principles: 'LIFO Ordering & Core Mechanics (Push/Pop)',
        array_memory_allocation: 'Array & Dynamic Memory Allocation',
        call_stack_management: 'Call Stack & Execution Frames'
      },
      dag: {
        stack_data_structure: ['lifo_ordering_principles', 'array_memory_allocation'],
        lifo_ordering_principles: ['call_stack_management'],
        array_memory_allocation: [],
        call_stack_management: []
      }
    };
  }

  if (normTarget.includes('queue')) {
    return {
      targetId: 'queue_data_structure',
      conceptTitles: {
        queue_data_structure: targetConcept || 'Queue Data Structure',
        fifo_ordering_principles: 'FIFO Ordering Mechanics (Enqueue/Dequeue)',
        linked_nodes_pointers: 'Pointer & Node References',
        circular_buffer_mechanics: 'Circular Buffer & Bounds Checks'
      },
      dag: {
        queue_data_structure: ['fifo_ordering_principles', 'linked_nodes_pointers'],
        fifo_ordering_principles: ['circular_buffer_mechanics'],
        linked_nodes_pointers: [],
        circular_buffer_mechanics: []
      }
    };
  }

  if (normTarget.includes('inorder') || (normSubject.includes('data structure') && normTarget.includes('tree'))) {
    return {
      targetId: 'binary_tree_inorder_traversal',
      conceptTitles: {
        binary_tree_inorder_traversal: 'Binary Tree Inorder Traversal',
        tree_traversal_order: 'Tree Traversal Ordering Rules',
        recursion: 'Recursion',
        base_case_evaluation: 'Base-Case Evaluation',
        call_stack_reasoning: 'Call Stack Reasoning',
        array_traversal: 'Array Traversal'
      },
      dag: {
        binary_tree_inorder_traversal: ['tree_traversal_order', 'recursion'],
        tree_traversal_order: [],
        recursion: ['base_case_evaluation', 'call_stack_reasoning'],
        base_case_evaluation: [],
        call_stack_reasoning: [],
        array_traversal: []
      }
    };
  }

  // Generic heuristic fallback DAG
  const targetId = toId(targetConcept);
  const p1Id = `${targetId}_foundations`;
  const p2Id = `${targetId}_core_mechanics`;
  const subPId = `${targetId}_basic_principles`;

  return {
    targetId,
    conceptTitles: {
      [targetId]: targetConcept,
      [p1Id]: `${targetConcept} Foundations`,
      [p2Id]: `${targetConcept} Core Mechanics`,
      [subPId]: `${targetConcept} Basic Invariants`
    },
    dag: {
      [targetId]: [p1Id, p2Id],
      [p1Id]: [],
      [p2Id]: [subPId],
      [subPId]: []
    }
  };
}

export async function generateInitialTeaching(
  subject: string,
  targetConcept: string,
  learnerLevel = 'intermediate',
  learningGoal = 'understand',
  studentId = 'default_student',
  courseId = 'data_structures',
  learningPart?: LearningPart
): Promise<any> {
  const resource = await resourceAgent.selectResource({
    concept_id: toId(targetConcept),
    concept_title: learningPart ? `${targetConcept} - ${learningPart.title}` : targetConcept,
    query_context: `${subject} ${targetConcept} ${learningPart?.title || ''} ${learningPart?.objective || ''}`
  });

  const teaching = await tutorAgent.teach({
    teaching_context: learningPart ? (`PART_${learningPart.part_number}_TEACHING` as any) : 'INITIAL_TEACHING',
    concept_id: learningPart ? learningPart.id : toId(targetConcept),
    concept_title: learningPart ? `${learningPart.title}` : targetConcept,
    target_concept: targetConcept,
    active_concept: learningPart ? learningPart.id : toId(targetConcept),
    subject,
    student_id: studentId,
    course_id: courseId,
    learner_level: learnerLevel,
    learning_goal: learningGoal,
    evidence: resource.primary_evidence
  });

  return {
    ...teaching,
    learning_part: learningPart,
    explanation_text: teaching.explanation
  };
}

export async function generatePrereqQuiz(prereqId: string, prereqTitle: string, subject: string): Promise<any> {
  const normId = prereqId.toLowerCase();
  const normTitle = prereqTitle.toLowerCase();

  // Try dynamic generation with Gemini
  const prompt = `You are an expert diagnostic quiz author.
Subject: "${subject}"
Prerequisite Concept: "${prereqTitle}" (${prereqId})

Generate a 2-question multiple choice diagnostic quiz to assess whether a learner possesses the required foundation for this prerequisite.
Output strictly valid JSON with no markdown formatting:
{
  "concept": "${prereqId}",
  "prerequisite": "${prereqId}",
  "concept_title": "${prereqTitle}",
  "questions": [
    {
      "id": 1,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "correct_answer": "Option A",
      "explanation": "Why this answer is correct"
    },
    {
      "id": 2,
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1,
      "correct_answer": "Option B",
      "explanation": "Why this answer is correct"
    }
  ]
}`;

  const aiText = await generateWithGemini(prompt);
  if (aiText) {
    try {
      const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.questions && parsed.questions.length >= 2) {
        return parsed;
      }
    } catch {
      // Fallback below
    }
  }

  // Domain-specific fallbacks
  if (normId.includes('lifo') || normId.includes('stack') || normTitle.includes('lifo') || normTitle.includes('stack')) {
    return {
      concept: prereqId,
      prerequisite: prereqId,
      concept_title: prereqTitle,
      questions: [
        {
          id: 1,
          question: 'In a Last-In, First-Out (LIFO) data structure, which element is returned when a pop() operation is executed?',
          options: [
            'The element that was added earliest (oldest)',
            'The element that was added most recently (newest)',
            'The element with the minimum numerical value',
            'A randomly chosen element from the buffer'
          ],
          correct_index: 1,
          correct_answer: 'The element that was added most recently (newest)',
          explanation: 'LIFO guarantees that the most recently pushed element sits at the top and is popped first.'
        },
        {
          id: 2,
          question: 'If you push elements 10, 20, 30 onto an empty stack and then call pop(), what value is returned?',
          options: [
            '10',
            '20',
            '30',
            'undefined'
          ],
          correct_index: 2,
          correct_answer: '30',
          explanation: '30 was the last item pushed, so it is at the top of the stack and popped first.'
        }
      ]
    };
  }

  if (normId.includes('fifo') || normId.includes('queue') || normTitle.includes('fifo') || normTitle.includes('queue')) {
    return {
      concept: prereqId,
      prerequisite: prereqId,
      concept_title: prereqTitle,
      questions: [
        {
          id: 1,
          question: 'In a First-In, First-Out (FIFO) queue, where are new elements inserted and removed?',
          options: [
            'Inserted at the rear and removed from the front',
            'Inserted at the front and removed from the rear',
            'Inserted and removed from the same top end',
            'Inserted at random positions'
          ],
          correct_index: 0,
          correct_answer: 'Inserted at the rear and removed from the front',
          explanation: 'Queues process items in arrival order: enqueue at the rear/tail and dequeue from the front/head.'
        },
        {
          id: 2,
          question: 'If elements A, B, C are enqueued in that order into an empty queue, what does the first dequeue() return?',
          options: [
            'C',
            'B',
            'A',
            'None'
          ],
          correct_index: 2,
          correct_answer: 'A',
          explanation: 'A arrived first, so it is the first to exit in FIFO discipline.'
        }
      ]
    };
  }

  if (normId.includes('recursion') || normId.includes('call_stack')) {
    return {
      concept: prereqId,
      prerequisite: prereqId,
      concept_title: prereqTitle,
      questions: [
        {
          id: 1,
          question: 'What is the primary role of a base case in a recursive function?',
          options: [
            'To reset global memory variables',
            'To terminate recursive calls and prevent stack overflow',
            'To reorder input parameters',
            'To allocate extra memory on the heap'
          ],
          correct_index: 1,
          correct_answer: 'To terminate recursive calls and prevent stack overflow',
          explanation: 'Without a well-defined base case, recursive calls continue infinitely until exhausting the call stack.'
        },
        {
          id: 2,
          question: 'When a function calls itself recursively, what happens to the previous execution state?',
          options: [
            'It is discarded immediately',
            'It is paused and pushed onto the call stack until the inner call returns',
            'It is saved permanently to disk',
            'It runs concurrently on a separate worker thread'
          ],
          correct_index: 1,
          correct_answer: 'It is paused and pushed onto the call stack until the inner call returns',
          explanation: 'Each function invocation creates a stack frame that remains suspended until the nested child function returns.'
        }
      ]
    };
  }

  if (normId.includes('order') || normId.includes('traversal')) {
    return {
      concept: prereqId,
      prerequisite: prereqId,
      concept_title: prereqTitle,
      questions: [
        {
          id: 1,
          question: 'In inorder traversal of a tree node with left child L, root N, and right child R, which order is followed?',
          options: [
            'N -> L -> R (Preorder)',
            'L -> N -> R (Inorder)',
            'L -> R -> N (Postorder)',
            'R -> N -> L (Reverse Inorder)'
          ],
          correct_index: 1,
          correct_answer: 'L -> N -> R (Inorder)',
          explanation: 'Inorder specifically visits the left subtree first, then records the node value, then visits the right subtree.'
        },
        {
          id: 2,
          question: 'If a node has no left child, what is the immediate next step in inorder traversal?',
          options: [
            'Skip the current node and visit the right child',
            'Visit the current node immediately',
            'Halt the entire traversal',
            'Backtrack to the parent immediately'
          ],
          correct_index: 1,
          correct_answer: 'Visit the current node immediately',
          explanation: 'Because the left branch is empty (null base-case satisfied), the current node is visited next.'
        }
      ]
    };
  }

  return {
    concept: prereqId,
    prerequisite: prereqId,
    concept_title: prereqTitle,
    questions: [
      {
        id: 1,
        question: `Which fundamental principle is essential for mastering ${prereqTitle}?`,
        options: [
          'Recognizing core boundary rules and invariant constraints',
          'Memorizing raw variable names without context',
          'Skipping prerequisite definitions',
          'Assuming unhandled inputs produce zero side-effects'
        ],
        correct_index: 0,
        correct_answer: 'Recognizing core boundary rules and invariant constraints',
        explanation: 'Strong conceptual comprehension requires understanding how boundary conditions establish stability.'
      },
      {
        id: 2,
        question: `How does ${prereqTitle} interact with dependent higher-level operations?`,
        options: [
          'It operates in total isolation with zero influence on downstream algorithms',
          'It provides the structural invariant that subsequent execution stages rely upon',
          'It only applies to static single-pass programs',
          'It replaces the need for algorithmic correctness verification'
        ],
        correct_index: 1,
        correct_answer: 'It provides the structural invariant that subsequent execution stages rely upon',
        explanation: 'Prerequisites maintain the underlying state guarantees necessary for the main concept to function.'
      }
    ]
  };
}

import { exerciseAgent } from './agents/exerciseAgent';

export async function generateExercise(
  conceptId: string,
  conceptTitle: string,
  subject: string,
  isRecheck = false,
  learnerLevel = 'intermediate',
  learningGoal = 'understand',
  learningPart?: LearningPart
): Promise<any> {
  const outcome = await exerciseAgent.generateAssessment({
    student_id: 'active_student',
    subject,
    target_concept: conceptTitle,
    active_concept: conceptId,
    concept_title: learningPart ? `${learningPart.title} (${conceptTitle})` : conceptTitle,
    phase_intent: isRecheck ? 'PREREQ_RECHECK' : learningPart ? (`PART_${learningPart.part_number}_EXERCISE` as any) : 'INITIAL_TARGET',
    learner_level: learnerLevel,
    learning_goal: learningGoal
  });

  const exercise = {
    ...outcome.exercise,
    learning_part: learningPart
  };

  return {
    exercise,
    answer_key: outcome.answer_key
  };
}

export async function generateReteachLesson(
  prereqId: string,
  prereqTitle: string,
  misconception = 'prerequisite_gap',
  subject = 'Computer Science',
  learnerLevel = 'intermediate',
  learningGoal = 'understand',
  studentId = 'default_student',
  courseId = 'data_structures'
): Promise<any> {
  const resource = await resourceAgent.selectResource({
    concept_id: prereqId,
    concept_title: prereqTitle,
    query_context: `${subject} ${prereqTitle}`
  });

  const teaching = await tutorAgent.teach({
    teaching_context: 'PREREQUISITE_REPAIR',
    concept_id: prereqId,
    concept_title: prereqTitle,
    target_concept: prereqTitle,
    active_concept: prereqId,
    subject,
    student_id: studentId,
    course_id: courseId,
    learner_level: learnerLevel,
    learning_goal: learningGoal,
    evidence: resource.primary_evidence,
    misconception
  });

  return {
    ...teaching,
    explanation_text: teaching.explanation
  };
}
