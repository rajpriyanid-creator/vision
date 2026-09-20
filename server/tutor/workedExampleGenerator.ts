import { WorkedExample, FadedExample } from '../models/contracts';
import { TutorContext } from './schemas';

export class WorkedExampleGenerator {
  /**
   * Generates a pedagogical worked example tailored to the concept.
   * Uses analogous problem instances and avoids reusing exact assessment questions.
   */
  static generateWorkedExample(context: TutorContext): WorkedExample {
    const { concept_title, concept_id, subject, teaching_context } = context;
    const normTitle = (concept_title || '').toLowerCase();
    const normId = (concept_id || '').toLowerCase();

    if (teaching_context === 'PREREQUISITE_REPAIR') {
      if (normTitle.includes('stack') || normTitle.includes('lifo') || normId.includes('stack') || normId.includes('lifo')) {
        return {
          problem: `Trace LIFO stack frame push and pop order for sequential operations.`,
          goal: `Understand how the top element transitions when pushing and popping elements.`,
          steps: [
            {
              step_number: 1,
              action: `Push element 'A', then push element 'B' onto an empty stack.`,
              reason: `'B' is placed on top of 'A', making the stack state [A, B] with top pointing to 'B'.`
            },
            {
              step_number: 2,
              action: `Execute pop() operation.`,
              reason: `LIFO discipline requires the most recently inserted item ('B') to be popped first.`
            },
            {
              step_number: 3,
              action: `Inspect remaining stack state.`,
              reason: `Only element 'A' remains in the stack [A], and next pop() will yield 'A'.`
            }
          ],
          result: `Sequence popped: ['B'], remaining top: 'A'.`,
          why_this_works: `LIFO guarantees the newest element added is the first one removed.`
        };
      }

      return {
        problem: `Trace the boundary condition and state suspension for a sample invocation of ${concept_title}.`,
        goal: `Verify that base cases resolve cleanly and activation records unfreeze in expected sequence.`,
        steps: [
          {
            step_number: 1,
            action: `Evaluate if the input parameter satisfies the termination base case.`,
            reason: `Base cases must return immediately to prevent infinite execution expansion.`
          },
          {
            step_number: 2,
            action: `Freeze current execution state and dispatch the nested sub-routine.`,
            reason: `The caller frame remains suspended on the call stack until the sub-routine completes.`
          },
          {
            step_number: 3,
            action: `Receive the sub-routine return value and resume the paused operation.`,
            reason: `Ensures all sub-routine state transformations are fully reconciled before proceeding.`
          }
        ],
        result: `State successfully resolved without stack overflow or corrupted boundary invariants.`,
        why_this_works: `Strict separation between active frames and suspended caller frames guarantees deterministic execution.`
      };
    }

    // Concept-specific modeling
    if (normTitle.includes('stack') || normTitle.includes('lifo') || normId.includes('stack') || normId.includes('lifo')) {
      return {
        problem: `Apply Stack operations to evaluate sequential insertions and deletions: push(10), push(20), push(30), pop(), push(40).`,
        goal: `Determine the exact top element and popped sequence using LIFO (Last-In, First-Out) discipline.`,
        steps: [
          {
            step_number: 1,
            action: `Push elements 10, 20, 30 sequentially onto an empty stack S.`,
            reason: `Each push places the new value on the top: S = [10, 20, 30], top is 30.`
          },
          {
            step_number: 2,
            action: `Execute pop() on the stack.`,
            reason: `LIFO principle retrieves and removes the most recent element (30). S becomes [10, 20], top is 20.`
          },
          {
            step_number: 3,
            action: `Execute push(40) onto the stack.`,
            reason: `40 is placed on top of 20: S becomes [10, 20, 40], top is 40.`
          }
        ],
        result: `Popped value: 30. Final stack: [10, 20, 40] with Top = 40.`,
        why_this_works: `Because Stacks enforce Last-In, First-Out access, the most recently pushed item is always at the top.`
      };
    }

    if (normTitle.includes('queue') || normTitle.includes('fifo') || normId.includes('queue') || normId.includes('fifo')) {
      return {
        problem: `Apply Queue operations to process items: enqueue(10), enqueue(20), dequeue(), enqueue(30).`,
        goal: `Determine the exact queue state using FIFO (First-In, First-Out) discipline.`,
        steps: [
          {
            step_number: 1,
            action: `Enqueue elements 10 and 20 into an empty queue Q.`,
            reason: `10 is at the front and 20 is at the rear: Q = [10 (front), 20 (rear)].`
          },
          {
            step_number: 2,
            action: `Execute dequeue().`,
            reason: `FIFO principle removes the oldest element (10). Front is now 20: Q = [20].`
          },
          {
            step_number: 3,
            action: `Execute enqueue(30).`,
            reason: `30 is added to the rear: Q = [20 (front), 30 (rear)].`
          }
        ],
        result: `Dequeued value: 10. Current Queue: [20, 30] with Front = 20.`,
        why_this_works: `Queues process elements strictly in arrival order (FIFO).`
      };
    }

    if (normTitle.includes('tree') || normTitle.includes('inorder') || normTitle.includes('traversal')) {
      return {
        problem: `Apply ${concept_title} to evaluate a 3-element hierarchy [Left: A, Root: B, Right: C].`,
        goal: `Produce the exact deterministic visitation sequence without violating traversal ordering invariants.`,
        steps: [
          {
            step_number: 1,
            action: `Descend to the left branch node 'A' and verify it has no sub-children.`,
            reason: `Inorder traversal prioritizes exhausting the entire left subtree first.`
          },
          {
            step_number: 2,
            action: `Record node 'A' value, then return to the parent node 'B' and record 'B'.`,
            reason: `Once left branch processing completes, the current root node is visited immediately.`
          },
          {
            step_number: 3,
            action: `Traverse to the right branch node 'C' and record its value.`,
            reason: `Right branch exploration begins only after the current root has been processed.`
          }
        ],
        result: `Sequence output: ['A', 'B', 'C'].`,
        why_this_works: `Following Left -> Node -> Right consistently guarantees structured, sorted item processing.`
      };
    }

    return {
      problem: `Apply the core invariant of ${concept_title} to evaluate a standard test case.`,
      goal: `Verify that boundary conditions hold and state transitions follow governing rules.`,
      steps: [
        {
          step_number: 1,
          action: `Initialize baseline state and validate incoming parameters for ${concept_title}.`,
          reason: `Establishing valid initial preconditions prevents invariant violations.`
        },
        {
          step_number: 2,
          action: `Execute the core transformation step according to ${concept_title} rules.`,
          reason: `Applies the fundamental algorithmic mechanism to mutate state predictably.`
        },
        {
          step_number: 3,
          action: `Verify postconditions and return the verified outcome.`,
          reason: `Ensures all structural guarantees are preserved upon completion.`
        }
      ],
      result: `Deterministic transformation completed in compliance with ${concept_title} principles.`,
      why_this_works: `Adhering to explicit boundary preconditions guarantees reliable execution.`
    };
  }

  /**
   * Generates a faded (partially worked) example to scaffold student independence.
   */
  static generateFadedExample(context: TutorContext): FadedExample {
    const { concept_title, concept_id } = context;
    const normTitle = (concept_title || '').toLowerCase();
    const normId = (concept_id || '').toLowerCase();

    if (normTitle.includes('stack') || normTitle.includes('lifo') || normId.includes('stack') || normId.includes('lifo')) {
      return {
        problem: `Trace a series of Stack operations on an initially empty stack: push(5), push(15), push(25), pop().`,
        completed_steps: [
          {
            step_number: 1,
            action: `Push 5, then 15, then 25 onto the stack. Stack state: [5, 15, 25] with Top = 25.`,
            reason: `Each push places the element at the top index.`
          },
          {
            step_number: 2,
            action: `Execute first pop(). Output returned: 25. Stack state becomes: [5, 15] with Top = 15.`,
            reason: `LIFO rule removes the most recent element (25).`
          }
        ],
        faded_step: {
          step_number: 3,
          prompt: `Now determine the outcome if another pop() is executed: What value is returned and what is the new Top?`,
          scaffold_hint: `Look at the current top of the stack [5, 15]. The next item popped will be the current top.`
        },
        target_outcome: `Returned value: 15. New Stack: [5] with Top = 5.`
      };
    }

    if (normTitle.includes('queue') || normTitle.includes('fifo') || normId.includes('queue') || normId.includes('fifo')) {
      return {
        problem: `Trace Queue operations on an initially empty queue: enqueue('X'), enqueue('Y'), enqueue('Z'), dequeue().`,
        completed_steps: [
          {
            step_number: 1,
            action: `Enqueue 'X', 'Y', 'Z'. Queue state: ['X' (front), 'Y', 'Z' (rear)].`,
            reason: `Items are added to the back in FIFO order.`
          },
          {
            step_number: 2,
            action: `Execute dequeue(). Output returned: 'X'. Queue state: ['Y' (front), 'Z' (rear)].`,
            reason: `'X' was the earliest arrival, so it departs first.`
          }
        ],
        faded_step: {
          step_number: 3,
          prompt: `Now determine the outcome if another dequeue() is executed: What value is removed and what is the new front?`,
          scaffold_hint: `In FIFO, the next item at the front of the queue ['Y', 'Z'] will exit.`
        },
        target_outcome: `Returned value: 'Y'. New Queue: ['Z'] with Front = 'Z'.`
      };
    }

    if (normTitle.includes('tree') || normTitle.includes('inorder') || normTitle.includes('traversal')) {
      return {
        problem: `Trace the traversal of a sub-tree with Root: 10, Left: 5, Right: 15.`,
        completed_steps: [
          {
            step_number: 1,
            action: `Navigate to Left child (5) and process it completely. Output: [5].`,
            reason: `Left subtree must be fully explored before visiting the parent.`
          },
          {
            step_number: 2,
            action: `Visit the current Root node (10). Output so far: [5, 10].`,
            reason: `Left child is finished, so the parent node is recorded next.`
          }
        ],
        faded_step: {
          step_number: 3,
          prompt: `Now determine the final step for the Right child (15): What is recorded next and why?`,
          scaffold_hint: `Remember that after processing the root, the traversal moves into the right subtree.`
        },
        target_outcome: `Final sequence: [5, 10, 15]`
      };
    }

    return {
      problem: `Trace the evaluation of ${concept_title} across a 3-step sequence.`,
      completed_steps: [
        {
          step_number: 1,
          action: `Verify initial preconditions and configure the initial state.`,
          reason: `Ensures all baseline invariants are established.`
        },
        {
          step_number: 2,
          action: `Execute the first phase of ${concept_title}.`,
          reason: `Advances the execution state toward the final target.`
        }
      ],
      faded_step: {
        step_number: 3,
        prompt: `Now determine the resolution step: How should the final state be computed?`,
        scaffold_hint: `Apply the core governing rule of ${concept_title}.`
      },
      target_outcome: `Final state successfully verified in accordance with ${concept_title} rules.`
    };
  }
}

