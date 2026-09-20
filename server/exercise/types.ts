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

export type GenerationMode = 'LIVE' | 'REPLAY' | 'FAILURE';

export interface ExerciseInputContext {
  student_id?: string;
  course_id?: string;
  subject: string;
  target_concept: string;
  active_concept: string;
  concept_title: string;
  phase_intent: ExercisePhaseIntent | string;
  learner_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | string;
  learning_goal?: 'understand' | 'exam' | 'interview' | 'practice' | 'revision' | 'deep_dive' | string;

  // Active Roadmap Part Context
  roadmap_part?: {
    part_number: number;
    title: string;
    objective: string;
    cognitive_demand?: string;
    key_focus_areas?: string[];
  };

  // Tutor teaching context handoff
  tutor_handoff?: {
    taught_concepts?: string[];
    learning_objectives?: Array<{
      objective_id?: string;
      objective_type?: string;
      objective?: string;
      required_evidence?: string[];
    }>;
    examples_used?: string[];
    misconceptions_addressed?: string[];
    teaching_strategy?: string;
    teaching_mode?: string;
    support_level?: 'FULLY_WORKED' | 'GUIDED' | 'FADED' | 'INDEPENDENT' | string;
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
    confidence?: number;
  };

  // Evaluation & Session History
  latest_evaluation?: {
    status?: 'demonstrated' | 'unresolved' | 'uncertain' | string;
    missing_evidence?: string[];
    misconceptions?: string[];
    score?: number;
    reasoning_summary?: string;
  };

  previous_exercise_ids?: string[];
  previous_question_signatures?: string[];
  recent_formats?: ExerciseFormat[];
  recent_strategies?: ExerciseGenerationStrategy[];
  recent_difficulties?: string[];
  recent_success_rate?: number;
  attempt_count?: number;
  revision_depth?: number;
  evidence_ref?: string;
  provenance_type?: ProvenanceType;

  // Explicit configuration flags
  force_replay_mode?: boolean;
}

export interface ExerciseBlueprint {
  blueprint_id: string;
  strategy: ExerciseGenerationStrategy;
  format: ExerciseFormat;
  difficulty_band: ExerciseDifficultyBand;
  target_objective: string;
  objective_id: string;
  objective_type: string;
  cognitive_demand: string;
  target_misconception?: string;
  isomorphic_to_previous: boolean;
  source_exercise_id?: string;
  independence_level: 'guided' | 'faded' | 'independent';
  reason_for_selection: string;
  required_evidence_criteria: string[];
  freshness_requirement: 'unique_context' | 'isomorphic_numbers' | 'new_scenario';
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
  generation_mode: GenerationMode;
  execution_time_ms: number;
  telemetry?: {
    model_provider?: string;
    model_name?: string;
    prompt_tokens_est?: number;
    latency_ms?: number;
    revision_count?: number;
  };
}

export interface AssessmentHistoryRecord {
  exercise_id: string;
  concept_id: string;
  objective_id?: string;
  phase_intent: string;
  strategy: ExerciseGenerationStrategy;
  format: ExerciseFormat;
  difficulty: ExerciseDifficultyBand;
  misconception_target?: string;
  timestamp: string;
  evaluation_status?: string;
  score?: number;
  generation_mode: GenerationMode;
  revision_number?: number;
}
