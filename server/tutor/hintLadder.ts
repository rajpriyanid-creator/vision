import { HintLadderStep } from '../models/contracts';
import { TutorContext } from './schemas';

export class HintLadder {
  /**
   * Generates a 5-tier progressive scaffolding hint ladder for the concept.
   * Progresses from subtle conceptual reminder to analogous modeling without ever giving the raw answer.
   */
  static generateLadder(context: TutorContext): HintLadderStep[] {
    const { concept_title, concept_id, teaching_context } = context;
    const normTitle = (concept_title || '').toLowerCase();
    const normId = (concept_id || '').toLowerCase();

    if (normTitle.includes('stack') || normTitle.includes('lifo') || normId.includes('stack') || normId.includes('lifo')) {
      return [
        {
          level: 1,
          label: 'HINT_1',
          hint_type: 'broad_conceptual_cue',
          text: `Recall the core access discipline of a Stack: What does LIFO stand for?`
        },
        {
          level: 2,
          label: 'HINT_2',
          hint_type: 'relevant_principle',
          text: `Remember the LIFO rule: The element pushed most recently is the first one retrieved when popping.`
        },
        {
          level: 3,
          label: 'HINT_3',
          hint_type: 'specific_subproblem',
          text: `Trace the current 'top' pointer index after each push and pop operation sequentially.`
        },
        {
          level: 4,
          label: 'HINT_4',
          hint_type: 'next_procedural_step',
          text: `Identify the element currently at the top of the stack immediately prior to the pop() call.`
        },
        {
          level: 5,
          label: 'HINT_5',
          hint_type: 'analogous_worked_example',
          text: `Consider a stack of cafeteria trays: when you add trays [10, 20, 30], tray 30 sits on top and is taken off first.`
        }
      ];
    }

    if (normTitle.includes('queue') || normTitle.includes('fifo') || normId.includes('queue') || normId.includes('fifo')) {
      return [
        {
          level: 1,
          label: 'HINT_1',
          hint_type: 'broad_conceptual_cue',
          text: `Recall the core access discipline of a Queue: What does FIFO stand for?`
        },
        {
          level: 2,
          label: 'HINT_2',
          hint_type: 'relevant_principle',
          text: `Remember the FIFO rule: Elements are inserted at the back (rear) and removed from the front (head).`
        },
        {
          level: 3,
          label: 'HINT_3',
          hint_type: 'specific_subproblem',
          text: `Identify which element entered the queue earliest among all active items.`
        },
        {
          level: 4,
          label: 'HINT_4',
          hint_type: 'next_procedural_step',
          text: `Inspect the element at the head index of the queue before executing dequeue().`
        },
        {
          level: 5,
          label: 'HINT_5',
          hint_type: 'analogous_worked_example',
          text: `Consider people waiting in a line at a ticket booth: the person who arrived first is served and leaves first.`
        }
      ];
    }

    if (teaching_context === 'PREREQUISITE_REPAIR') {
      return [
        {
          level: 1,
          label: 'HINT_1',
          hint_type: 'broad_conceptual_cue',
          text: `Think about what condition stops an iterative or recursive process from continuing indefinitely.`
        },
        {
          level: 2,
          label: 'HINT_2',
          hint_type: 'relevant_principle',
          text: `Check the base case and boundary condition. Every valid execution path must reach a termination check before proceeding.`
        },
        {
          level: 3,
          label: 'HINT_3',
          hint_type: 'specific_subproblem',
          text: `Identify what state is preserved while a nested sub-routine is still running.`
        },
        {
          level: 4,
          label: 'HINT_4',
          hint_type: 'next_procedural_step',
          text: `Trace what happens immediately after the base case returns: which suspended frame resumes next?`
        },
        {
          level: 5,
          label: 'HINT_5',
          hint_type: 'analogous_worked_example',
          text: `Think of a nested list: each inner level must resolve before the outer level can finish calculation.`
        }
      ];
    }

    if (normTitle.includes('tree') || normTitle.includes('inorder') || normTitle.includes('traversal')) {
      return [
        {
          level: 1,
          label: 'HINT_1',
          hint_type: 'broad_conceptual_cue',
          text: `Recall the relative order between Left Subtree, Current Node, and Right Subtree in ${concept_title}.`
        },
        {
          level: 2,
          label: 'HINT_2',
          hint_type: 'relevant_principle',
          text: `Remember the L-N-R invariant: Left branch must be fully resolved before recording the current node.`
        },
        {
          level: 3,
          label: 'HINT_3',
          hint_type: 'specific_subproblem',
          text: `Look at the root node: ensure it is not visited before its entire left subtree has finished returning.`
        },
        {
          level: 4,
          label: 'HINT_4',
          hint_type: 'next_procedural_step',
          text: `Trace down the leftmost pointers until you hit null, then process the current node before inspecting right pointers.`
        },
        {
          level: 5,
          label: 'HINT_5',
          hint_type: 'analogous_worked_example',
          text: `For a small tree [Root: 2, Left: 1, Right: 3]: left child 1 is visited first, then root 2, then right child 3, yielding [1, 2, 3].`
        }
      ];
    }

    return [
      {
        level: 1,
        label: 'HINT_1',
        hint_type: 'broad_conceptual_cue',
        text: `Consider the foundational definition and primary goal of ${concept_title}.`
      },
      {
        level: 2,
        label: 'HINT_2',
        hint_type: 'relevant_principle',
        text: `Identify the core invariants that must remain true throughout each step of ${concept_title}.`
      },
      {
        level: 3,
        label: 'HINT_3',
        hint_type: 'specific_subproblem',
        text: `Break down the problem into initial preconditions and intermediate state transitions.`
      },
      {
        level: 4,
        label: 'HINT_4',
        hint_type: 'next_procedural_step',
        text: `Check boundary conditions and edge cases to ensure no state violations occur.`
      },
      {
        level: 5,
        label: 'HINT_5',
        hint_type: 'analogous_worked_example',
        text: `Apply the step-by-step procedure to a minimal 2-element test case to verify expected behavior.`
      }
    ];
  }
}

