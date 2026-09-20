import {
  Exercise,
  ExerciseAnswerKey,
  ExerciseFormat,
  ExercisePhaseIntent,
  ExerciseDifficultyBand,
  ExerciseQuestionRubric,
  ExercisePrivateTestCase,
  ExercisePublicExample,
  ProvenanceType
} from '../models/contracts';

export type ExerciseGenerationStrategy =
  | 'DIRECT_RECALL'
  | 'CONCEPT_CHECK'
  | 'APPLICATION'
  | 'PREDICTION'
  | 'CONTRASTIVE'
  | 'MISCONCEPTION_DISCRIMINATION'
  | 'CODE_TRACE'
  | 'DEBUGGING'
  | 'IMPLEMENTATION'
  | 'TRANSFER'
  | 'TIE_BREAKER'
  | 'PREREQUISITE_RECHECK'
  | 'RETRIEVAL';

export interface ExerciseInputContext {
  student_id?: string;
  course_id?: string;
  subject: string;
  target_concept: string;
  active_concept: string;
  concept_title: string;
  phase_intent: ExercisePhaseIntent;
  learner_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | string;
  learning_goal?: 'understand' | 'exam' | 'interview' | 'practice' | 'revision' | 'deep_dive' | string;

  // Tutor teaching context handoff
  tutor_handoff?: {
    taught_concepts?: string[];
    learning_objectives?: Array<{
      objective_id?: string;
      objective_type?: string;
      objective?: string;
    }>;
    examples_used?: string[];
    misconceptions_addressed?: string[];
    teaching_strategy?: string;
    teaching_mode?: string;
    support_level?: string;
    scaffold_level?: string;
    lesson_summary?: string;
    concepts_explicitly_demonstrated?: string[];
    concepts_not_yet_taught?: string[];
  };

  // Diagnostic context
  latest_diagnosis?: {
    category?: string;
    suspected_prerequisite?: string | null;
    confirmed_misconception?: string | null;
    candidate_misconception?: string | null;
    reasoning_summary?: string;
  };

  // Evaluation & Session History
  latest_evaluation?: {
    status?: string;
    missing_evidence?: string[];
    misconceptions?: string[];
    score?: number;
  };

  previous_exercise_ids?: string[];
  previous_question_signatures?: string[];
  recent_difficulties?: string[];
  recent_success_rate?: number;
  attempt_count?: number;
  revision_depth?: number;
  evidence_ref?: string;
  provenance_type?: ProvenanceType;
}

export interface ExerciseBlueprint {
  strategy: ExerciseGenerationStrategy;
  format: ExerciseFormat;
  difficulty_band: ExerciseDifficultyBand;
  target_objective: string;
  objective_type: string;
  cognitive_demand: string;
  target_misconception?: string;
  isomorphic_to_previous: boolean;
  required_evidence_criteria: string[];
}

export interface QuestionQualityMetric {
  name: string;
  passed: boolean;
  score: number; // 0 to 1
  detail: string;
}

export interface QuestionQualityResult {
  status: 'PASS' | 'REVISE' | 'FAIL';
  metrics: QuestionQualityMetric[];
  leakage_detected: boolean;
  leakage_reasons: string[];
  inconsistencies: string[];
  revision_suggestions?: string[];
}

export interface ExerciseGenerationOutcome {
  exercise: Exercise;
  answer_key: ExerciseAnswerKey;
  blueprint: ExerciseBlueprint;
  quality_result: QuestionQualityResult;
  generation_mode: 'LIVE' | 'REPLAY' | 'SAFE_FALLBACK';
  execution_time_ms: number;
}
