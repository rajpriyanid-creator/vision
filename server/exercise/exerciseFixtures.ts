import {
  Exercise,
  ExerciseAnswerKey
} from '../models/contracts';

export interface ExerciseFixtureItem {
  id: string;
  domain: string;
  concept_id: string;
  concept_title: string;
  format: string;
  phase_intent: string;
  difficulty: string;
  exercise: Exercise;
  answer_key: ExerciseAnswerKey;
}

export const EXERCISE_FIXTURES: ExerciseFixtureItem[] = [
  // 1. DATA STRUCTURES — STACK INITIAL TARGET (MCQ)
  {
    id: 'fix_ds_stack_01',
    domain: 'Computer Science',
    concept_id: 'stack',
    concept_title: 'Stack',
    format: 'mcq',
    phase_intent: 'INITIAL_TARGET',
    difficulty: 'Intermediate',
    exercise: {
      exercise_id: 'fix_ds_stack_01',
      concept_id: 'stack',
      concept_title: 'Stack',
      format: 'mcq',
      question_format: 'mcq',
      prompt: 'You execute the following operations on an initially empty stack: push(10), push(20), push(30), pop(), push(40). What value does peek() (or top()) return immediately afterwards?',
      options: ['40', '30', '20', '10'],
      mcq_options: ['40', '30', '20', '10'],
      difficulty: 'Intermediate',
      phase_intent: 'INITIAL_TARGET',
      cognitive_demand: 'Application',
      starter_code: '// Operations: push(10) -> push(20) -> push(30) -> pop() -> push(40)'
    },
    answer_key: {
      exercise_id: 'fix_ds_stack_01',
      concept_id: 'stack',
      correct_option_id: 'A',
      correct_option_index: 0,
      accepted_answers: ['40'],
      canonical_answer: '40',
      required_evidence: ['Pushed 10,20,30', 'Popped 30', 'Pushed 40 on top of 20'],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [
          { id: 'lifo_pop', description: 'Correctly pops 30 leaving [10, 20]', required: true },
          { id: 'lifo_push', description: 'Places 40 at the top index', required: true }
        ],
        common_misconceptions: ['Thinking 30 is still on top', 'Thinking 10 is at the top (FIFO confusion)']
      },
      misconception_signals: ['fifo_confusion', 'unpopped_top_confusion'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'Sequential LIFO simulation' },
      evaluation_notes: []
    }
  },

  // 1b. DATA STRUCTURES — STACK TARGET RETEST (MCQ)
  {
    id: 'fix_ds_stack_retest_01',
    domain: 'Computer Science',
    concept_id: 'stack',
    concept_title: 'Stack',
    format: 'mcq',
    phase_intent: 'TARGET_RETEST',
    difficulty: 'Intermediate',
    exercise: {
      exercise_id: 'fix_ds_stack_retest_01',
      concept_id: 'stack',
      concept_title: 'Stack',
      format: 'mcq',
      question_format: 'mcq',
      prompt: 'Starting with an empty stack, the following operations are executed: push(5), push(15), pop(), push(25), pop(). What value was returned by the second pop() call?',
      options: ['25', '15', '5', 'undefined'],
      mcq_options: ['25', '15', '5', 'undefined'],
      difficulty: 'Intermediate',
      phase_intent: 'TARGET_RETEST',
      cognitive_demand: 'Application & Transfer',
      starter_code: '// Operations: push(5) -> push(15) -> pop() (returns 15) -> push(25) -> pop() (?)'
    },
    answer_key: {
      exercise_id: 'fix_ds_stack_retest_01',
      concept_id: 'stack',
      correct_option_id: 'A',
      correct_option_index: 0,
      accepted_answers: ['25'],
      canonical_answer: '25',
      required_evidence: ['25 was the most recent element pushed before the second pop'],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [{ id: 'lifo_retest', description: 'Applies LIFO to identify 25 as second popped element', required: true }]
      },
      misconception_signals: ['fifo_confusion'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'LIFO evaluation' },
      evaluation_notes: []
    }
  },

  // 1c. DATA STRUCTURES — BINARY TREE INORDER INITIAL TARGET (MCQ)
  {
    id: 'fix_ds_inorder_01',
    domain: 'Computer Science',
    concept_id: 'binary_tree_inorder_traversal',
    concept_title: 'Binary Tree Inorder Traversal',
    format: 'mcq',
    phase_intent: 'INITIAL_TARGET',
    difficulty: 'Intermediate',
    exercise: {
      exercise_id: 'fix_ds_inorder_01',
      concept_id: 'binary_tree_inorder_traversal',
      concept_title: 'Binary Tree Inorder Traversal',
      format: 'mcq',
      question_format: 'mcq',
      prompt: 'Given a Binary Tree with root node 2, left child 1, and right child 3, what is the Inorder Traversal output?',
      options: ['[1, 2, 3]', '[2, 1, 3]', '[1, 3, 2]', '[3, 2, 1]'],
      mcq_options: ['[1, 2, 3]', '[2, 1, 3]', '[1, 3, 2]', '[3, 2, 1]'],
      difficulty: 'Intermediate',
      phase_intent: 'INITIAL_TARGET',
      cognitive_demand: 'Application',
      starter_code: '// Tree: Root=2, Left=1, Right=3\n// Inorder visits: Left Subtree -> Node -> Right Subtree'
    },
    answer_key: {
      exercise_id: 'fix_ds_inorder_01',
      concept_id: 'binary_tree_inorder_traversal',
      correct_option_id: 'A',
      correct_option_index: 0,
      accepted_answers: ['[1, 2, 3]', '1, 2, 3', '1 2 3'],
      canonical_answer: '[1, 2, 3]',
      required_evidence: ['Visits Left child 1 before Root 2', 'Visits Root 2 before Right child 3'],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [
          { id: 'left_first', description: 'Visits left branch before root node', required: true },
          { id: 'right_last', description: 'Visits right branch after root node', required: true }
        ],
        common_misconceptions: ['Root-first preorder output [2, 1, 3]']
      },
      misconception_signals: ['root_first_preorder_confusion'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'Recursive Left-Root-Right traversal' },
      evaluation_notes: ['[2,1,3] indicates preorder traversal confusion']
    }
  },

  // 2. DATA STRUCTURES — TARGET RETEST (ISOMORPHIC MCQ with different tree values)
  {
    id: 'fix_ds_inorder_retest_01',
    domain: 'Computer Science',
    concept_id: 'binary_tree_inorder_traversal',
    concept_title: 'Binary Tree Inorder Traversal',
    format: 'mcq',
    phase_intent: 'TARGET_RETEST',
    difficulty: 'Intermediate',
    exercise: {
      exercise_id: 'fix_ds_inorder_retest_01',
      concept_id: 'binary_tree_inorder_traversal',
      concept_title: 'Binary Tree Inorder Traversal',
      format: 'mcq',
      question_format: 'mcq',
      prompt: 'Consider a 3-node Binary Tree where root is 10, left child is 5, and right child is 15. What is the correct Inorder Traversal order?',
      options: ['[5, 10, 15]', '[10, 5, 15]', '[5, 15, 10]', '[15, 10, 5]'],
      mcq_options: ['[5, 10, 15]', '[10, 5, 15]', '[5, 15, 10]', '[15, 10, 5]'],
      difficulty: 'Intermediate',
      phase_intent: 'TARGET_RETEST',
      cognitive_demand: 'Application & Transfer',
      starter_code: '// Retest: Apply Inorder ordering on fresh tree values {root: 10, left: 5, right: 15}'
    },
    answer_key: {
      exercise_id: 'fix_ds_inorder_retest_01',
      concept_id: 'binary_tree_inorder_traversal',
      correct_option_id: 'A',
      correct_option_index: 0,
      accepted_answers: ['[5, 10, 15]', '5, 10, 15'],
      canonical_answer: '[5, 10, 15]',
      required_evidence: ['5 followed by 10 followed by 15'],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [{ id: 'order_invariance', description: 'Applies Left-Root-Right to new node values', required: true }]
      },
      misconception_signals: ['root_first_preorder'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'Inorder evaluation on isomorphic instance' },
      evaluation_notes: []
    }
  },

  // 3. RECURSION — PREREQUISITE RECHECK (SHORT ANSWER / WRITING)
  {
    id: 'fix_ds_recursion_prereq_01',
    domain: 'Computer Science',
    concept_id: 'recursion',
    concept_title: 'Recursion',
    format: 'short_answer',
    phase_intent: 'PREREQ_RECHECK',
    difficulty: 'Foundational',
    exercise: {
      exercise_id: 'fix_ds_recursion_prereq_01',
      concept_id: 'recursion',
      concept_title: 'Recursion',
      format: 'short_answer',
      question_format: 'short_answer',
      prompt: 'Explain what happens when a recursive function reaches its base case and why the base case is essential.',
      difficulty: 'Foundational',
      phase_intent: 'PREREQ_RECHECK',
      cognitive_demand: 'Comprehension & Invariant Explanation'
    },
    answer_key: {
      exercise_id: 'fix_ds_recursion_prereq_01',
      concept_id: 'recursion',
      accepted_answers: ['terminates recursion and returns without making further recursive calls'],
      canonical_answer: 'The base case stops further recursive calls and begins returning values back up the call stack, preventing infinite recursion and stack overflow.',
      required_evidence: [
        'States that recursive calls stop / terminate',
        'Mentions unwinding or returning values up the call stack',
        'Identifies prevention of infinite recursion / stack overflow'
      ],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [
          { id: 'termination', description: 'Explains call sequence termination', required: true },
          { id: 'stack_safety', description: 'Mentions stack bounds / overflow prevention', required: true }
        ],
        acceptable_variants: [
          'returns directly without recursive call',
          'halts the loop of function invocations'
        ],
        common_misconceptions: [
          'believes the base case resets global memory',
          'believes base case deletes the call stack instantly'
        ]
      },
      misconception_signals: ['memory_reset_confusion'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'Base case invariant definition' },
      evaluation_notes: []
    }
  },

  // 3b. RECURSION — PREREQUISITE READINESS (MCQ)
  {
    id: 'fix_ds_recursion_readiness_01',
    domain: 'Computer Science',
    concept_id: 'recursion',
    concept_title: 'Recursion',
    format: 'mcq',
    phase_intent: 'PREREQ_READINESS',
    difficulty: 'Foundational',
    exercise: {
      exercise_id: 'fix_ds_recursion_readiness_01',
      concept_id: 'recursion',
      concept_title: 'Recursion',
      format: 'mcq',
      question_format: 'mcq',
      prompt: 'In a recursive function call, what prevents execution from continuing infinitely until memory exhaustion?',
      options: [
        'A base case condition that returns without initiating another recursive call',
        'An automatic operating system timeout after ten invocations',
        'The garbage collector clearing active execution frames',
        'Variables automatically resetting to null on each nested step'
      ],
      mcq_options: [
        'A base case condition that returns without initiating another recursive call',
        'An automatic operating system timeout after ten invocations',
        'The garbage collector clearing active execution frames',
        'Variables automatically resetting to null on each nested step'
      ],
      difficulty: 'Foundational',
      phase_intent: 'PREREQ_READINESS',
      cognitive_demand: 'Foundational Recall'
    },
    answer_key: {
      exercise_id: 'fix_ds_recursion_readiness_01',
      concept_id: 'recursion',
      correct_option_id: 'A',
      correct_option_index: 0,
      accepted_answers: ['A base case condition that returns without initiating another recursive call'],
      canonical_answer: 'A base case condition that returns without initiating another recursive call',
      required_evidence: ['Base case terminates recursive chain'],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [{ id: 'base_case_termination', description: 'Base case terminates calls', required: true }]
      },
      misconception_signals: ['os_timeout_confusion'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'Recursive termination invariant' },
      evaluation_notes: []
    }
  },

  // 4. MATHEMATICS / LINEAR ALGEBRA — MATRIX MULTIPLICATION (MCQ)
  {
    id: 'fix_math_matrix_01',
    domain: 'Mathematics',
    concept_id: 'matrix_multiplication',
    concept_title: 'Matrix Multiplication',
    format: 'mcq',
    phase_intent: 'INITIAL_TARGET',
    difficulty: 'Intermediate',
    exercise: {
      exercise_id: 'fix_math_matrix_01',
      concept_id: 'matrix_multiplication',
      concept_title: 'Matrix Multiplication',
      format: 'mcq',
      question_format: 'mcq',
      prompt: 'For two matrices A of dimension (2 x 3) and B of dimension (3 x 4), what is the dimension of the resulting product matrix AB?',
      options: ['2 x 4', '3 x 3', '2 x 3', 'Multiplication is undefined'],
      mcq_options: ['2 x 4', '3 x 3', '2 x 3', 'Multiplication is undefined'],
      difficulty: 'Intermediate',
      phase_intent: 'INITIAL_TARGET',
      cognitive_demand: 'Application'
    },
    answer_key: {
      exercise_id: 'fix_math_matrix_01',
      concept_id: 'matrix_multiplication',
      correct_option_id: 'A',
      correct_option_index: 0,
      accepted_answers: ['2 x 4', '2x4'],
      canonical_answer: '2 x 4',
      required_evidence: ['Matches inner dimension 3 and takes outer dimensions (2, 4)'],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [{ id: 'dimension_rule', description: 'Inner dimensions match, outer dimensions form product size', required: true }]
      },
      misconception_signals: ['inner_dimension_retention'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'Matrix dimension compatibility rule' },
      evaluation_notes: []
    }
  },

  // 5. BIOLOGY / CELLULAR RESPIRATION — ATP SYNTHESIS (TIE_BREAKER)
  {
    id: 'fix_bio_atp_01',
    domain: 'Biology',
    concept_id: 'atp_synthesis',
    concept_title: 'ATP Synthesis & Chemiosmosis',
    format: 'mcq',
    phase_intent: 'TIE_BREAKER',
    difficulty: 'Intermediate',
    exercise: {
      exercise_id: 'fix_bio_atp_01',
      concept_id: 'atp_synthesis',
      concept_title: 'ATP Synthesis & Chemiosmosis',
      format: 'mcq',
      question_format: 'mcq',
      prompt: 'What directly powers the rotation of ATP synthase during oxidative phosphorylation?',
      options: [
        'The electrochemical proton gradient across the inner mitochondrial membrane',
        'Direct transfer of phosphate from glucose molecules in the cytosol',
        'Thermal energy generated by electron transport friction',
        'Active consumption of ADP in the mitochondrial matrix'
      ],
      mcq_options: [
        'The electrochemical proton gradient across the inner mitochondrial membrane',
        'Direct transfer of phosphate from glucose molecules in the cytosol',
        'Thermal energy generated by electron transport friction',
        'Active consumption of ADP in the mitochondrial matrix'
      ],
      difficulty: 'Intermediate',
      phase_intent: 'TIE_BREAKER',
      cognitive_demand: 'Discrimination'
    },
    answer_key: {
      exercise_id: 'fix_bio_atp_01',
      concept_id: 'atp_synthesis',
      correct_option_id: 'A',
      correct_option_index: 0,
      accepted_answers: ['The electrochemical proton gradient across the inner mitochondrial membrane'],
      canonical_answer: 'The electrochemical proton gradient across the inner mitochondrial membrane',
      required_evidence: ['Proton-motive force / electrochemical gradient across inner membrane'],
      rubric: {
        rubric_type: 'conceptual',
        criteria: [{ id: 'proton_gradient', description: 'Identifies proton gradient as driving force', required: true }]
      },
      misconception_signals: ['substrate_level_confusion'],
      private_test_cases: [],
      reference_solution_metadata: { approach: 'Chemiosmotic coupling mechanism' },
      evaluation_notes: []
    }
  },

  // 6. CODING — REVERSE LINKED LIST (CODING PROBLEM with public examples & private test cases)
  {
    id: 'fix_coding_reverse_01',
    domain: 'Computer Science',
    concept_id: 'linked_list_reversal',
    concept_title: 'Linked List Reversal',
    format: 'coding',
    phase_intent: 'INITIAL_TARGET',
    difficulty: 'Intermediate',
    exercise: {
      exercise_id: 'fix_coding_reverse_01',
      concept_id: 'linked_list_reversal',
      concept_title: 'Linked List Reversal',
      format: 'coding',
      question_format: 'coding',
      prompt: 'Implement a function `reverseList(head)` that reverses a singly linked list in-place and returns the new head.',
      difficulty: 'Intermediate',
      phase_intent: 'INITIAL_TARGET',
      cognitive_demand: 'Implementation',
      starter_code: 'function reverseList(head) {\n  let prev = null;\n  let curr = head;\n  // Your code here\n  return prev;\n}',
      language: 'javascript',
      public_examples: [
        { input: '[1, 2, 3, 4, 5]', output: '[5, 4, 3, 2, 1]', explanation: 'Reverses list pointers' },
        { input: '[1, 2]', output: '[2, 1]', explanation: 'Two-node list reversed' }
      ]
    },
    answer_key: {
      exercise_id: 'fix_coding_reverse_01',
      concept_id: 'linked_list_reversal',
      accepted_answers: [],
      canonical_answer: 'while (curr) { const next = curr.next; curr.next = prev; prev = curr; curr = next; } return prev;',
      required_evidence: ['Pointer rewiring loop', 'Preservation of next node before rewiring', 'Correct return of new head'],
      rubric: {
        rubric_type: 'coding',
        criteria: [
          { id: 'functional_correctness', description: 'Correctly reverses link pointers', weight: 0.6, required: true },
          { id: 'edge_cases', description: 'Handles null and single-node inputs safely', weight: 0.2, required: true },
          { id: 'in_place_complexity', description: 'O(1) auxiliary space complexity', weight: 0.2, required: true }
        ]
      },
      misconception_signals: ['pointer_loss_before_rewiring'],
      private_test_cases: [
        { name: 'Normal 5-node list', input: '[1, 2, 3, 4, 5]', expected: '[5, 4, 3, 2, 1]' },
        { name: 'Empty list edge case', input: '[]', expected: '[]', is_edge_case: true },
        { name: 'Single node list', input: '[42]', expected: '[42]', is_edge_case: true },
        { name: 'Large 100-node list', input: 'range(100)', expected: 'range(100).reverse()', is_stress: true }
      ],
      reference_solution_metadata: {
        language: 'javascript',
        approach: 'Iterative 3-pointer reversal (prev, curr, next)',
        time_complexity: 'O(N)',
        space_complexity: 'O(1)',
        reference_code: 'function reverseList(head) { let prev = null, curr = head; while (curr) { const next = curr.next; curr.next = prev; prev = curr; curr = next; } return prev; }'
      },
      evaluation_notes: ['Client-provided test results must NOT be trusted blindly']
    }
  }
];

export class ExerciseFixtureRegistry {
  static findFixture(
    conceptId: string,
    phaseIntent?: string,
    format?: string
  ): ExerciseFixtureItem | undefined {
    const normConcept = conceptId.toLowerCase();
    return EXERCISE_FIXTURES.find((f) => {
      const matchConcept =
        f.concept_id.toLowerCase() === normConcept ||
        normConcept.includes(f.concept_id.toLowerCase()) ||
        f.concept_id.toLowerCase().includes(normConcept);
      const matchIntent = phaseIntent ? f.phase_intent === phaseIntent : true;
      const matchFormat = format ? f.format === format : true;
      return matchConcept && matchIntent && matchFormat;
    });
  }

  static getFallbackFixture(
    conceptTitle: string,
    subject: string,
    phaseIntent: string,
    difficulty = 'Intermediate'
  ): ExerciseFixtureItem {
    const exId = `ex_vetted_${Date.now()}`;
    const conceptSlug = conceptTitle.toLowerCase().replace(/\s+/g, '_');
    return {
      id: exId,
      domain: subject,
      concept_id: conceptSlug,
      concept_title: conceptTitle,
      format: 'mcq',
      phase_intent: phaseIntent,
      difficulty,
      exercise: {
        exercise_id: exId,
        concept_id: conceptSlug,
        concept_title: conceptTitle,
        format: 'mcq',
        question_format: 'mcq',
        prompt: `When applying ${conceptTitle} in ${subject}, what condition is strictly required to preserve correctness?`,
        options: [
          `All governing structural invariants and boundary constraints must be satisfied`,
          `Edge conditions should be bypassed to minimize execution latency`,
          `Parameter values may mutate arbitrarily without validation`,
          `Execution proceeds without verifying terminating base criteria`
        ],
        mcq_options: [
          `All governing structural invariants and boundary constraints must be satisfied`,
          `Edge conditions should be bypassed to minimize execution latency`,
          `Parameter values may mutate arbitrarily without validation`,
          `Execution proceeds without verifying terminating base criteria`
        ],
        difficulty,
        phase_intent: phaseIntent as any,
        cognitive_demand: 'Comprehension',
        starter_code: `// Evaluate correctness criteria for ${conceptTitle}`
      },
      answer_key: {
        exercise_id: exId,
        concept_id: conceptSlug,
        correct_option_id: 'A',
        correct_option_index: 0,
        accepted_answers: [`All governing structural invariants and boundary constraints must be satisfied`],
        canonical_answer: `All governing structural invariants and boundary constraints must be satisfied`,
        required_evidence: ['Preservation of governing invariants and boundary constraints'],
        rubric: {
          rubric_type: 'conceptual',
          criteria: [{ id: 'invariants', description: 'Requires structural invariants to hold', required: true }]
        },
        misconception_signals: ['boundary_bypass_error'],
        private_test_cases: [],
        reference_solution_metadata: { approach: 'Invariant validation' },
        evaluation_notes: []
      }
    };
  }
}
