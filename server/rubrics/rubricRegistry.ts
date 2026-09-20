/**
 * VISION Exercise Rubrics Registry
 * Decouples grading criteria from hardcoded code.
 */

export interface RubricCriterion {
  id: string;
  pattern_description: string;
  is_positive: boolean;
  score_weight: number;
  suspected_prerequisite?: string;
  misconception_tag?: string;
  feedback: string;
}

export interface ConceptRubric {
  concept_id: string;
  title: string;
  core_principles: string[];
  required_reasoning: string[];
  acceptable_evidence_patterns: string[];
  misconceptions: RubricCriterion[];
}

export class RubricRegistry {
  private rubrics = new Map<string, ConceptRubric>();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register({
      concept_id: 'binary_tree_inorder_traversal',
      title: 'Binary Tree Inorder Traversal',
      core_principles: [
        'Left Subtree → Current Node → Right Subtree (LNR) traversal order',
        'Null leaf node triggers base case return',
        'Produces ascending order on Binary Search Trees'
      ],
      required_reasoning: [
        'Left subtree must be traversed completely before recording current root value',
        'Right subtree is traversed after recording current root value'
      ],
      acceptable_evidence_patterns: [
        '[1, 2, 3]',
        '1, 2, 3',
        '1,2,3',
        'left, root, right',
        'left subtree first',
        'b, a, c'
      ],
      misconceptions: [
        {
          id: 'preorder_confusion',
          pattern_description: 'Visits root before traversing left subtree',
          is_positive: false,
          score_weight: 40,
          suspected_prerequisite: 'tree_traversal_order',
          misconception_tag: 'preorder_vs_inorder',
          feedback: 'You visited the root node before finishing the left subtree. Inorder requires Left first, then Root, then Right.'
        },
        {
          id: 'recursion_confusion',
          pattern_description: 'Cannot trace recursive function unwinding',
          is_positive: false,
          score_weight: 30,
          suspected_prerequisite: 'recursion',
          misconception_tag: 'call_stack_unwinding',
          feedback: 'Understanding traversal sequence requires tracing how recursive calls pause parent callers on the stack.'
        }
      ]
    });

    this.register({
      concept_id: 'recursion',
      title: 'Recursion Foundations',
      core_principles: [
        'Function calls itself with smaller subproblem arguments',
        'Must have explicit base-case termination condition to prevent stack overflow',
        'Suspends caller frame on stack until inner call returns'
      ],
      required_reasoning: [
        'Base-case termination prevents infinite calls',
        'Call frames return values back up the stack'
      ],
      acceptable_evidence_patterns: [
        'base case',
        'stack overflow',
        'maximum call stack',
        'terminat',
        'subproblem',
        'unwinds'
      ],
      misconceptions: [
        {
          id: 'missing_base_case',
          pattern_description: 'Omits or misunderstands base case role',
          is_positive: false,
          score_weight: 35,
          suspected_prerequisite: 'call_stack_reasoning',
          misconception_tag: 'infinite_recursion',
          feedback: 'Without a base case check, recursive invocations continue indefinitely until exhausting the call stack.'
        }
      ]
    });

    this.register({
      concept_id: 'call_stack_reasoning',
      title: 'Call Stack Reasoning',
      core_principles: [
        'Stack frames push on invocation and pop on return (LIFO order)',
        'Outer function remains suspended until inner child returns'
      ],
      required_reasoning: ['LIFO frame unwinding'],
      acceptable_evidence_patterns: ['lifo', 'push', 'pop', 'suspended', 'stack frame', 'unwind'],
      misconceptions: []
    });
  }

  register(rubric: ConceptRubric): void {
    this.rubrics.set(rubric.concept_id.toLowerCase(), rubric);
  }

  getRubric(conceptId: string): ConceptRubric | null {
    return this.rubrics.get(conceptId.toLowerCase()) || null;
  }
}

export const rubricRegistry = new RubricRegistry();
