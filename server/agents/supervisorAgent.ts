/**
 * AGENT 1: SUPERVISOR AGENT
 * Coordinates the adaptive learning process and plans the next action based on current state,
 * learner telemetry, budget, and diagnostic validation.
 */

import { CourseContext, SupervisorDecision, WorkflowState, LearnerMemory, SessionBudget } from '../models/contracts';
import { generateWithGemini } from '../gemini';

export interface SupervisorInput {
  run_id: string;
  current_state: WorkflowState;
  target_concept_id: string;
  active_concept_id: string;
  course_context: CourseContext;
  last_evaluation?: any;
  last_diagnosis?: any;
  learner_memory?: LearnerMemory;
  budget: SessionBudget;
}

export class SupervisorAgent {
  async planNextAction(input: SupervisorInput): Promise<SupervisorDecision> {
    const { current_state, target_concept_id, active_concept_id, course_context, last_evaluation, budget } = input;

    // Check budget guard
    if (budget.revisions_made >= budget.max_revisions) {
      return {
        next_state: 'WAITING_FOR_HUMAN',
        target_concept_id,
        active_concept_id,
        action: 'escalate_to_human',
        reason: `Maximum adaptive revision depth (${budget.max_revisions}) reached without resolution. Escalating to human educator.`,
        hand_off_to: 'HumanInstructor',
        requires_human: true,
        human_prompt: 'The learner has attempted multiple remediation loops. Please provide instructor guidance or override.'
      };
    }

    // Deterministic state-based transitions
    switch (current_state) {
      case 'START_STUDY': {
        const directPrereqs = course_context.dag[target_concept_id] || [];
        if (directPrereqs.length > 0) {
          return {
            next_state: 'PREREQ_SURVEY',
            target_concept_id,
            active_concept_id: target_concept_id,
            action: 'prereq_survey',
            reason: `Identified ${directPrereqs.length} foundational prerequisites for ${target_concept_id}. Calibrating readiness.`,
            hand_off_to: 'Controller'
          };
        }
        return {
          next_state: 'INITIAL_TEACHING',
          target_concept_id,
          active_concept_id: target_concept_id,
          action: 'teach_target',
          reason: 'No prerequisites required. Initiating core concept teaching.',
          hand_off_to: 'TutorAgent'
        };
      }

      case 'PREREQ_SURVEY':
      case 'PREREQ_QUIZ':
        return {
          next_state: 'INITIAL_TEACHING',
          target_concept_id,
          active_concept_id: target_concept_id,
          action: 'teach_target',
          reason: 'Prerequisite calibration complete. Ready for target instruction.',
          hand_off_to: 'TutorAgent'
        };

      case 'INITIAL_TEACHING':
        return {
          next_state: 'PRACTICE',
          target_concept_id,
          active_concept_id,
          action: 'generate_exercise',
          reason: 'Lesson delivered. Generating formative assessment probe.',
          hand_off_to: 'ExerciseAgent'
        };

      case 'PRACTICE':
      case 'EVALUATION': {
        if (!last_evaluation) {
          return {
            next_state: 'PRACTICE',
            target_concept_id,
            active_concept_id,
            action: 'await_submission',
            reason: 'Waiting for student exercise attempt.',
            hand_off_to: 'Controller'
          };
        }

        if (last_evaluation.status === 'demonstrated') {
          if (active_concept_id !== target_concept_id) {
            // Prerequisite mastered! Return to target concept
            return {
              next_state: 'RECHECK_ORIGINAL',
              target_concept_id,
              active_concept_id: target_concept_id,
              action: 'recheck_target',
              reason: `Prerequisite ${active_concept_id} verified as mastered. Re-testing original target ${target_concept_id}.`,
              hand_off_to: 'ExerciseAgent'
            };
          } else {
            // Target concept mastered!
            return {
              next_state: 'TARGET_MASTERED',
              target_concept_id,
              active_concept_id: target_concept_id,
              action: 'complete_session',
              reason: `Target concept ${target_concept_id} demonstrated successfully.`,
              hand_off_to: 'Controller'
            };
          }
        }

        if (last_evaluation.status === 'uncertain') {
          return {
            next_state: 'TIE_BREAKER',
            target_concept_id,
            active_concept_id,
            action: 'tie_breaker',
            reason: 'Student response was ambiguous. Initiating tie-breaker question to disambiguate.',
            hand_off_to: 'ExerciseAgent'
          };
        }

        // Unresolved: Must diagnose root-cause gap
        return {
          next_state: 'DIAGNOSE_GAP',
          target_concept_id,
          active_concept_id,
          action: 'diagnose_gap',
          reason: 'Student struggle detected. Handing off to Diagnostic Agent to analyze error telemetry.',
          hand_off_to: 'DiagnosticAgent'
        };
      }

      case 'DIAGNOSE_GAP':
        return {
          next_state: 'VALIDATE_HYPOTHESIS',
          target_concept_id,
          active_concept_id,
          action: 'validate_hypothesis',
          reason: 'Candidate gap proposed. Validating against course DAG.',
          hand_off_to: 'Controller'
        };

      case 'VALIDATE_HYPOTHESIS':
        return {
          next_state: 'SELECT_RESOURCE',
          target_concept_id,
          active_concept_id,
          action: 'retrieve_resource',
          reason: 'Hypothesis validated. Sourcing verified curriculum evidence.',
          hand_off_to: 'ResourceAgent'
        };

      case 'SELECT_RESOURCE':
        return {
          next_state: 'RETEACH_PREREQ',
          target_concept_id,
          active_concept_id,
          action: 'reteach_prerequisite',
          reason: 'Verified evidence obtained. Delivering targeted prerequisite remediation.',
          hand_off_to: 'TutorAgent'
        };

      case 'RETEACH_PREREQ':
        return {
          next_state: 'RECHECK_GAP',
          target_concept_id,
          active_concept_id,
          action: 'recheck_prereq_exercise',
          reason: 'Remediation completed. Re-assessing foundational gap.',
          hand_off_to: 'ExerciseAgent'
        };

      case 'RECHECK_GAP':
        return {
          next_state: 'EVALUATION',
          target_concept_id,
          active_concept_id,
          action: 'evaluate_recheck',
          reason: 'Evaluating prerequisite recheck response.',
          hand_off_to: 'EvaluationAgent'
        };

      default:
        return {
          next_state: 'PRACTICE',
          target_concept_id,
          active_concept_id,
          action: 'continue_study',
          reason: `Continuing flow from ${current_state}.`,
          hand_off_to: 'Controller'
        };
    }
  }
}

export const supervisorAgent = new SupervisorAgent();
