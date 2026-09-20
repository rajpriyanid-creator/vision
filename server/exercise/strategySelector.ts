/**
 * Dynamic Evidence-Driven Strategy & Format Selector.
 * Selects the optimal assessment blueprint based on learner profile, tutor handoff,
 * active roadmap part, diagnostic signals, and assessment history.
 */

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
      phase_intent = 'INITIAL_TARGET',
      learner_level = 'intermediate',
      learning_goal = 'understand',
      tutor_handoff,
      latest_diagnosis,
      latest_evaluation,
      previous_exercise_ids = [],
      recent_formats = [],
      attempt_count = 0,
      revision_depth = 0,
      roadmap_part
    } = context;

    const normalizedLevel = String(learner_level).toLowerCase();
    const normalizedGoal = String(learning_goal).toLowerCase();
    const normPhase = String(phase_intent).toUpperCase();

    // 1. Determine Difficulty Band
    let difficultyBand: ExerciseDifficultyBand = 'Intermediate';
    if (
      normPhase.includes('PREREQ') ||
      normalizedLevel === 'beginner' ||
      revision_depth > 1
    ) {
      difficultyBand = 'Foundational';
    } else if (
      normalizedLevel === 'advanced' ||
      normalizedLevel === 'expert' ||
      normalizedGoal === 'deep_dive' ||
      normalizedGoal === 'interview' ||
      normPhase === 'CHALLENGE'
    ) {
      difficultyBand = 'Advanced';
    } else {
      difficultyBand = 'Intermediate';
    }

    // 2. Determine Strategy, Format, and Cognitive Demand
    let strategy: ExerciseGenerationStrategy = 'CONCEPT_CHECK';
    let format: ExerciseFormat = 'mcq';
    let cognitiveDemand = 'Comprehension';
    let targetMisconception: string | undefined = undefined;
    let isomorphic = false;
    let reasonForSelection = '';
    let independenceLevel: 'guided' | 'faded' | 'independent' = 'independent';

    // Scaffold / Independence state based on Tutor support level
    if (tutor_handoff?.support_level === 'FULLY_WORKED') {
      independenceLevel = 'guided';
    } else if (tutor_handoff?.support_level === 'GUIDED') {
      independenceLevel = 'faded';
    } else {
      independenceLevel = 'independent';
    }

    // Check for diagnosed misconception
    const diagnosedMisconception =
      latest_diagnosis?.confirmed_misconception ||
      latest_diagnosis?.candidate_misconception ||
      (latest_diagnosis?.category === 'MISCONCEPTION' ? latest_diagnosis.reasoning_summary : undefined);

    // Branch A: Explicit Phase Intents
    if (normPhase === 'TIE_BREAKER' || normPhase.includes('TIE_BREAKER')) {
      strategy = 'TIE_BREAKER';
      format = 'mcq';
      cognitiveDemand = 'Discrimination';
      difficultyBand = 'Intermediate';
      reasonForSelection = 'Compact high-discrimination item selected to resolve evaluation uncertainty.';
    } else if (normPhase === 'PREREQ_READINESS' || normPhase.includes('READINESS')) {
      strategy = 'DIRECT_RECALL';
      format = 'mcq';
      cognitiveDemand = 'Foundational Readiness';
      difficultyBand = 'Foundational';
      reasonForSelection = 'Readiness check selected to verify prerequisite foundation before target instruction.';
    } else if (normPhase === 'PREREQ_RECHECK' || normPhase.includes('RECHECK')) {
      strategy = 'PREREQUISITE_RECHECK';
      format = 'mcq';
      cognitiveDemand = 'Foundational Verification';
      difficultyBand = 'Foundational';
      reasonForSelection = 'Targeted prerequisite recheck selected to confirm foundational repair.';
    } else if (normPhase === 'TARGET_RETEST' || normPhase.includes('RETEST')) {
      strategy = 'TRANSFER';
      isomorphic = true;
      cognitiveDemand = 'Isomorphic Transfer & Application';
      format = 'mcq';
      difficultyBand = 'Intermediate';
      reasonForSelection = 'Fresh isomorphic retest selected to distinguish genuine mastery from surface memorization.';
    } else if (diagnosedMisconception) {
      strategy = 'MISCONCEPTION_DISCRIMINATION';
      targetMisconception = diagnosedMisconception;
      format = 'mcq';
      cognitiveDemand = 'Contrastive Discrimination';
      reasonForSelection = `Misconception discrimination item selected targeting identified error: ${diagnosedMisconception}`;
    } else {
      // Branch B: Derivation from Tutor Handoff, Roadmap Part & Learning Goal
      const tutorStrategy = tutor_handoff?.teaching_strategy;
      const primaryObjective = tutor_handoff?.learning_objectives?.[0];

      if (tutorStrategy === 'CODE_TRACE' || tutor_handoff?.teaching_mode?.includes('trace')) {
        strategy = 'CODE_TRACE';
        format = 'mcq';
        cognitiveDemand = 'Procedural State Tracing';
        reasonForSelection = 'Procedural trace selected matching Tutor code execution walkthrough.';
      } else if (tutorStrategy === 'WORKED_EXAMPLE' || tutorStrategy === 'FADED_WORKED_EXAMPLE') {
        strategy = 'APPLICATION';
        format = 'mcq';
        cognitiveDemand = 'Stepwise Application';
        reasonForSelection = 'Application item selected to practice applying worked example principles.';
      } else if (tutorStrategy === 'CONTRASTIVE_EXPLANATION' || tutorStrategy === 'MISCONCEPTION_REPAIR') {
        strategy = 'CONTRASTIVE';
        format = 'mcq';
        cognitiveDemand = 'Boundary Discrimination';
        reasonForSelection = 'Contrastive item selected to test discrimination of edge boundaries.';
      } else if (normalizedGoal === 'exam') {
        strategy = 'APPLICATION';
        format = 'mcq';
        cognitiveDemand = 'Precise Problem Solving';
        reasonForSelection = 'Exam-style application scenario selected with strict distractors.';
      } else if (normalizedGoal === 'interview') {
        strategy = 'APPLICATION';
        format = 'mcq';
        cognitiveDemand = 'Mechanism & Trade-off Justification';
        reasonForSelection = 'Interview-style problem selected requiring justification of algorithmic invariants.';
      } else if (normalizedGoal === 'revision') {
        strategy = 'RETRIEVAL';
        format = 'mcq';
        cognitiveDemand = 'Active Recall';
        reasonForSelection = 'Retrieval MCQ item selected for efficient concept verification.';
      } else if (normalizedGoal === 'deep_dive') {
        strategy = 'TRANSFER';
        format = 'mcq';
        cognitiveDemand = 'System Analysis & Transfer';
        reasonForSelection = 'Deep-dive transfer MCQ item selected to test conceptual depth.';
      } else {
        // Default Understand
        strategy = 'CONCEPT_CHECK';
        format = 'mcq';
        cognitiveDemand = 'Conceptual Verification';
        reasonForSelection = 'Core concept check selected to measure understanding of governing invariants.';
      }
    }

    // 3. Determine Objective & Required Evidence
    let targetObjective = `Verify independent understanding of ${context.concept_title}`;
    let objectiveId = `obj_${context.active_concept}_${Date.now()}`;
    let objectiveType = 'conceptual';

    if (roadmap_part?.objective) {
      targetObjective = roadmap_part.objective;
      objectiveType = 'procedural';
    } else if (tutor_handoff?.learning_objectives && tutor_handoff.learning_objectives.length > 0) {
      const obj = tutor_handoff.learning_objectives[0];
      targetObjective = obj.objective || targetObjective;
      objectiveType = obj.objective_type || objectiveType;
      objectiveId = obj.objective_id || objectiveId;
    } else if (strategy === 'PREREQUISITE_RECHECK') {
      targetObjective = `Verify foundational invariant of prerequisite ${context.concept_title}`;
      objectiveType = 'procedural';
    } else if (strategy === 'MISCONCEPTION_DISCRIMINATION') {
      targetObjective = `Discriminate correct conceptual model from diagnosed misconception on ${context.concept_title}`;
      objectiveType = 'reasoning';
    }

    const requiredEvidenceCriteria = [
      `Demonstrate valid reasoning regarding ${context.concept_title}`,
      `Identify or apply the governing invariants correctly`
    ];
    if (targetMisconception) {
      requiredEvidenceCriteria.push(`Avoid the known misconception: ${targetMisconception}`);
    }

    const blueprintId = `bp_${context.active_concept}_${Date.now()}`;

    return {
      blueprint_id: blueprintId,
      strategy,
      format,
      difficulty_band: difficultyBand,
      target_objective: targetObjective,
      objective_id: objectiveId,
      objective_type: objectiveType,
      cognitive_demand: cognitiveDemand,
      target_misconception: targetMisconception,
      isomorphic_to_previous: isomorphic,
      source_exercise_id: previous_exercise_ids.length > 0 ? previous_exercise_ids[previous_exercise_ids.length - 1] : undefined,
      independence_level: independenceLevel,
      reason_for_selection: reasonForSelection,
      required_evidence_criteria: requiredEvidenceCriteria,
      freshness_requirement: isomorphic ? 'isomorphic_numbers' : 'unique_context'
    };
  }
}
