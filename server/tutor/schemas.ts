import {
  TeachingStrategy,
  LessonBlockType,
  LessonBlock,
  LearningObjective,
  WorkedExample,
  FadedExample,
  MisconceptionContrast,
  HintLadderStep,
  ReviewRecommendation,
  ExerciseHandoffContext,
  TeachingOutcome,
  TeachingAction,
  GroundedEvidence,
  LearnerMemory
} from '../models/contracts';

export interface StrategySelectionResult {
  primary_strategy: TeachingStrategy;
  secondary_strategy?: string;
  support_level: 'minimal' | 'low' | 'moderate' | 'high';
  reason: string;
  avoid_strategies: string[];
}

export interface ResourceCrossCheckResult {
  relevant: boolean;
  concept_match: boolean;
  course_match: boolean;
  evidence_sufficient: boolean;
  unsupported_claim_risk: boolean;
  reason: string;
  provenance: string;
}

export interface QualityGateResult {
  status: 'PASS' | 'REVISE' | 'FAIL';
  reasons: string[];
  leakage_detected: boolean;
  grounding_score: number; // 0.0 - 1.0
  overload_score: number; // 0.0 - 1.0
  objective_alignment_score: number; // 0.0 - 1.0
  actionable_revision_guidance?: string;
}

export interface TutorContext {
  student_id: string;
  course_id: string;
  subject: string;
  target_concept: string;
  active_concept: string;
  concept_title: string;
  teaching_context: 'INITIAL_TEACHING' | 'PREREQUISITE_REPAIR';
  learner_level: string; // 'beginner' | 'intermediate' | 'advanced' | 'expert'
  learning_goal: string; // 'understand' | 'exam' | 'interview' | 'practice' | 'revision' | 'deep_dive'
  evidence?: GroundedEvidence | null;
  misconception?: string;
  learner_memory?: LearnerMemory;
  attempt_count?: number;
  revision_depth?: number;
  recent_exercise_prompt?: string;
  hidden_expected_answer?: string;
}
