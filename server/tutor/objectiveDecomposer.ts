import { LearningObjective } from '../models/contracts';
import { TutorContext } from './schemas';

export class ObjectiveDecomposer {
  /**
   * Decomposes the target/prerequisite concept into a prioritized list of structured learning objectives.
   */
  static decompose(context: TutorContext): LearningObjective[] {
    const { concept_title, teaching_context, learner_level, learning_goal, misconception } = context;

    const objectives: LearningObjective[] = [];

    if (teaching_context === 'PREREQUISITE_REPAIR') {
      objectives.push({
        objective_id: 'obj_prereq_isolate',
        objective_type: 'conceptual',
        objective: `Identify the core invariant of ${concept_title} that must hold before downstream operations execute.`,
        priority: 'core'
      });

      if (misconception) {
        objectives.push({
          objective_id: 'obj_prereq_misconception',
          objective_type: 'reasoning',
          objective: `Differentiate the correct execution mechanism of ${concept_title} from the common misunderstanding (${misconception.slice(0, 60)}...).`,
          priority: 'core'
        });
      }

      objectives.push({
        objective_id: 'obj_prereq_boundary',
        objective_type: 'procedural',
        objective: `Correctly verify base cases and termination criteria for ${concept_title}.`,
        priority: 'supporting'
      });

      return objectives;
    }

    // Initial Teaching Objectives based on Goal & Level
    if (learning_goal === 'revision') {
      objectives.push({
        objective_id: 'obj_rev_recall',
        objective_type: 'conceptual',
        objective: `Rapidly retrieve and state the primary operational sequence for ${concept_title}.`,
        priority: 'core'
      });
      objectives.push({
        objective_id: 'obj_rev_contrast',
        objective_type: 'reasoning',
        objective: `Contrast ${concept_title} with adjacent techniques to prevent boundary confusion.`,
        priority: 'supporting'
      });
      return objectives;
    }

    if (learning_goal === 'interview') {
      objectives.push({
        objective_id: 'obj_int_tradeoffs',
        objective_type: 'reasoning',
        objective: `Articulate the time/space complexity invariants and architectural trade-offs of ${concept_title}.`,
        priority: 'core'
      });
      objectives.push({
        objective_id: 'obj_int_edge_cases',
        objective_type: 'application',
        objective: `Identify edge cases and potential failure modes when implementing ${concept_title}.`,
        priority: 'supporting'
      });
      return objectives;
    }

    if (learning_goal === 'exam') {
      objectives.push({
        objective_id: 'obj_exam_precision',
        objective_type: 'conceptual',
        objective: `Precisely define the formal invariants and step ordering of ${concept_title}.`,
        priority: 'core'
      });
      objectives.push({
        objective_id: 'obj_exam_traps',
        objective_type: 'reasoning',
        objective: `Recognize and avoid standard examination distractor patterns and state traps in ${concept_title}.`,
        priority: 'core'
      });
      return objectives;
    }

    if (learning_goal === 'practice') {
      objectives.push({
        objective_id: 'obj_prac_execute',
        objective_type: 'procedural',
        objective: `Step through the execution trace of ${concept_title} on concrete sample inputs.`,
        priority: 'core'
      });
      objectives.push({
        objective_id: 'obj_prac_apply',
        objective_type: 'application',
        objective: `Apply the rules of ${concept_title} independently to achieve the expected output.`,
        priority: 'supporting'
      });
      return objectives;
    }

    // Default Understand goal
    objectives.push({
      objective_id: 'obj_und_core',
      objective_type: 'conceptual',
      objective: `Understand why ${concept_title} works and internalize its mental model.`,
      priority: 'core'
    });

    if (learner_level === 'beginner') {
      objectives.push({
        objective_id: 'obj_und_concrete',
        objective_type: 'application',
        objective: `Trace a concrete, guided walkthrough of ${concept_title} from start to finish.`,
        priority: 'core'
      });
    } else if (learner_level === 'expert') {
      objectives.push({
        objective_id: 'obj_und_transfer',
        objective_type: 'transfer',
        objective: `Generalize the governing principles of ${concept_title} to non-standard or distributed configurations.`,
        priority: 'supporting'
      });
    } else {
      objectives.push({
        objective_id: 'obj_und_mechanism',
        objective_type: 'procedural',
        objective: `Trace the state transitions and intermediate invariants during execution of ${concept_title}.`,
        priority: 'supporting'
      });
    }

    return objectives;
  }
}
