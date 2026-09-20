import {
  ExerciseFormat,
  ExercisePhaseIntent,
  ExerciseDifficultyBand
} from '../models/contracts';
import {
  ExerciseInputContext,
  ExerciseBlueprint,
  ExerciseGenerationStrategy
} from './types';

export class StrategySelector {
  static selectBlueprint(context: ExerciseInputContext): ExerciseBlueprint {
    const {
      phase_intent,
      learner_level = 'intermediate',
      learning_goal = 'understand',
      tutor_handoff,
      latest_diagnosis,
      latest_evaluation,
      previous_exercise_ids = [],
      attempt_count = 0,
      revision_depth = 0
    } = context;

    const normalizedLevel = String(learner_level).toLowerCase();
    const normalizedGoal = String(learning_goal).toLowerCase();

    // 1. Determine Difficulty Band
    let difficultyBand: ExerciseDifficultyBand = 'Intermediate';
    if (phase_intent === 'PREREQ_RECHECK' || normalizedLevel === 'beginner' || revision_depth > 1) {
      difficultyBand = 'Foundational';
    } else if (
      normalizedLevel === 'advanced' ||
      normalizedLevel === 'expert' ||
      normalizedGoal === 'deep_dive' ||
      normalizedGoal === 'interview'
    ) {
      difficultyBand = 'Advanced';
    } else {
      difficultyBand = 'Intermediate';
    }

    // 2. Determine Strategy & Format based on Phase Intent & Diagnosis
    let strategy: ExerciseGenerationStrategy = 'CONCEPT_CHECK';
    let format: ExerciseFormat = 'mcq';
    let cognitiveDemand = 'Comprehension';
    let targetMisconception: string | undefined = undefined;
    let isomorphic = false;

    // Check if there is an active diagnosed misconception
    const diagnosedMisconception =
      latest_diagnosis?.confirmed_misconception ||
      latest_diagnosis?.candidate_misconception ||
      latest_diagnosis?.reasoning_summary;

    if (phase_intent === 'TIE_BREAKER') {
      strategy = 'TIE_BREAKER';
      format = 'mcq';
      cognitiveDemand = 'Discrimination';
      difficultyBand = 'Intermediate';
    } else if (phase_intent === 'PREREQ_RECHECK') {
      strategy = 'PREREQUISITE_RECHECK';
      format = normalizedLevel === 'beginner' ? 'mcq' : 'short_answer';
      cognitiveDemand = 'Foundational Recall & Verification';
      difficultyBand = 'Foundational';
    } else if (phase_intent === 'TARGET_RETEST') {
      strategy = 'TRANSFER';
      isomorphic = true;
      cognitiveDemand = 'Application & Transfer';
      // Vary format from previous if possible
      format = previous_exercise_ids.length % 2 === 0 ? 'mcq' : 'short_answer';
      difficultyBand = 'Intermediate';
    } else if (diagnosedMisconception) {
      strategy = 'MISCONCEPTION_DISCRIMINATION';
      targetMisconception = diagnosedMisconception;
      format = 'mcq';
      cognitiveDemand = 'Contrastive Reasoning';
    } else {
      // INITIAL_TARGET: derive from Tutor handoff or Learning Goal
      const tutorStrategy = tutor_handoff?.teaching_strategy;
      const primaryObjective = tutor_handoff?.learning_objectives?.[0];

      if (tutorStrategy === 'CODE_TRACE' || tutor_handoff?.teaching_mode?.includes('trace')) {
        strategy = 'CODE_TRACE';
        format = 'code_trace';
        cognitiveDemand = 'Procedural Execution';
      } else if (tutorStrategy === 'WORKED_EXAMPLE' || tutorStrategy === 'FADED_WORKED_EXAMPLE') {
        strategy = 'APPLICATION';
        format = normalizedGoal === 'interview' ? 'coding' : 'mcq';
        cognitiveDemand = 'Stepwise Application';
      } else if (tutorStrategy === 'CONTRASTIVE_EXPLANATION' || tutorStrategy === 'MISCONCEPTION_REPAIR') {
        strategy = 'CONTRASTIVE';
        format = 'mcq';
        cognitiveDemand = 'Boundary Discrimination';
      } else if (normalizedGoal === 'exam') {
        strategy = 'APPLICATION';
        format = 'mcq';
        cognitiveDemand = 'Precise Problem Solving';
      } else if (normalizedGoal === 'interview') {
        strategy = 'APPLICATION';
        format = 'short_answer';
        cognitiveDemand = 'Trade-off & Mechanism Justification';
      } else if (normalizedGoal === 'revision') {
        strategy = 'RETRIEVAL';
        format = 'fill_in_blank';
        cognitiveDemand = 'Active Recall';
      } else if (normalizedGoal === 'deep_dive') {
        strategy = 'TRANSFER';
        format = 'writing';
        cognitiveDemand = 'System Analysis & Transfer';
      } else {
        // Default Understand
        strategy = 'CONCEPT_CHECK';
        format = 'mcq';
        cognitiveDemand = 'Conceptual Verification';
      }
    }

    // Determine target objective text
    let targetObjective = `Verify independent understanding of ${context.concept_title}`;
    let objectiveType = 'conceptual';
    if (tutor_handoff?.learning_objectives && tutor_handoff.learning_objectives.length > 0) {
      const obj = tutor_handoff.learning_objectives[0];
      targetObjective = obj.objective || targetObjective;
      objectiveType = obj.objective_type || objectiveType;
    } else if (strategy === 'PREREQUISITE_RECHECK') {
      targetObjective = `Verify foundational invariant of prerequisite ${context.concept_title}`;
      objectiveType = 'procedural';
    } else if (strategy === 'MISCONCEPTION_DISCRIMINATION') {
      targetObjective = `Discriminate correct conceptual model from diagnosed misconception on ${context.concept_title}`;
      objectiveType = 'reasoning';
    }

    // Required evidence criteria
    const requiredEvidenceCriteria = [
      `Demonstrate valid reasoning regarding ${context.concept_title}`,
      `Identify or apply the governing invariants correctly`
    ];
    if (targetMisconception) {
      requiredEvidenceCriteria.push(`Avoid the known misconception: ${targetMisconception}`);
    }

    return {
      strategy,
      format,
      difficulty_band: difficultyBand,
      target_objective: targetObjective,
      objective_type: objectiveType,
      cognitive_demand: cognitiveDemand,
      target_misconception: targetMisconception,
      isomorphic_to_previous: isomorphic,
      required_evidence_criteria: requiredEvidenceCriteria
    };
  }
}
