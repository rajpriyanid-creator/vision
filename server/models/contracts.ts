/**
 * VISION Authoritative Structured Domain Contracts & Schemas
 * Pure structured records for inter-agent communication, workflow state, and telemetry.
 */

export type WorkflowState =
  | 'START_STUDY'
  | 'PREREQ_SURVEY'
  | 'PREREQ_QUIZ'
  | 'INITIAL_TEACHING'
  | 'PRACTICE'
  | 'EVALUATION'
  | 'TIE_BREAKER'
  | 'DIAGNOSE_GAP'
  | 'VALIDATE_HYPOTHESIS'
  | 'SELECT_RESOURCE'
  | 'RETEACH_PREREQ'
  | 'RECHECK_GAP'
  | 'GO_DEEPER'
  | 'RECHECK_ORIGINAL'
  | 'WAITING_FOR_HUMAN'
  | 'TARGET_MASTERED'
  | 'SESSION_COMPLETE';

export type DiagnosticCategory =
  | 'prerequisite_gap'
  | 'misconception'
  | 'careless_error'
  | 'incomplete_reasoning'
  | 'ambiguous'
  | 'unsupported_diagnosis'
  | 'insufficient_context';

export type EvaluationStatus = 'demonstrated' | 'unresolved' | 'uncertain';

export type ProvenanceType =
  | 'course_approved'
  | 'learner_provided'
  | 'ai_generated'
  | 'external_recommendation'
  | 'unverified'
  | 'rejected';

export interface ConceptNode {
  id: string;
  title: string;
  description: string;
  prerequisites: string[];
  rubric_id?: string;
  source_id?: string;
}

export interface CourseContext {
  course_id: string;
  course_name: string;
  subject: string;
  target_concept: string;
  target_id: string;
  dag: Record<string, string[]>;
  concept_titles: Record<string, string>;
  nodes: Record<string, ConceptNode>;
  source_provenance?: string;
  is_valid_dag: boolean;
}

export interface SupervisorDecision {
  next_state: WorkflowState;
  target_concept_id: string;
  active_concept_id: string;
  reason: string;
  action: string;
  hand_off_to: string;
  teaching_mode?: string;
  budget_consumed?: number;
  requires_human?: boolean;
  human_prompt?: string;
}

export interface GapHypothesis {
  run_id: string;
  attempt_id: string;
  target_concept: string;
  active_concept: string;
  student_answer: string;
  category: DiagnosticCategory;
  suspected_prerequisite: string | null;
  confidence: number; // 0.0 to 1.0
  reasoning_summary: string;
  evidence_references: string[];
  alternative_hypotheses: Array<{
    category: DiagnosticCategory;
    prerequisite: string | null;
    confidence: number;
    reasoning: string;
  }>;
}

export interface ValidatedHypothesis {
  hypothesis: GapHypothesis;
  is_supported_in_dag: boolean;
  is_direct_or_ancestor_prereq: boolean;
  validated_prerequisite_id: string | null;
  validation_status: 'accepted' | 'rejected_unconnected' | 'rejected_low_confidence' | 'escalate_human';
  rationale: string;
}

export interface GroundedEvidence {
  source_id: string;
  title: string;
  provenance: ProvenanceType;
  excerpt: string;
  relevance_score: number; // 0.0 to 1.0
  verified_quote: boolean;
  verified_at?: string;
  uri?: string;
}

export interface ResourceSelection {
  query: string;
  target_concept: string;
  primary_evidence: GroundedEvidence | null;
  supplementary_evidence: GroundedEvidence[];
  verification_status: 'verified' | 'unverified' | 'off_target' | 'insufficient_evidence';
  rationale: string;
}

export type TeachingStrategy =
  | 'DIRECT_EXPLANATION'
  | 'WORKED_EXAMPLE'
  | 'FADED_WORKED_EXAMPLE'
  | 'GUIDED_DISCOVERY'
  | 'SOCRATIC'
  | 'CONTRASTIVE_EXPLANATION'
  | 'MISCONCEPTION_REPAIR'
  | 'ANALOGICAL_BRIDGE'
  | 'STEPWISE_REASONING'
  | 'VISUAL_MENTAL_MODEL'
  | 'CODE_TRACE'
  | 'RETRIEVAL_ELICITATION';

export type LessonBlockType =
  | 'CONTEXT_BRIDGE'
  | 'OBJECTIVE'
  | 'CORE_IDEA'
  | 'INTUITION'
  | 'DEFINITION'
  | 'MECHANISM'
  | 'WORKED_EXAMPLE'
  | 'PARTIALLY_WORKED_EXAMPLE'
  | 'CONTRASTIVE_EXAMPLE'
  | 'MISCONCEPTION_WARNING'
  | 'VISUAL_MODEL'
  | 'CODE_TRACE'
  | 'SELF_EXPLANATION'
  | 'RECAP'
  | 'TRANSFER'
  | 'REFLECTION';

export interface LessonBlock {
  type: LessonBlockType;
  title: string;
  content: string;
  code_snippet?: string;
  concept_ids?: string[];
  evidence_refs?: string[];
}

export interface LearningObjective {
  objective_id: string;
  objective_type: 'conceptual' | 'procedural' | 'application' | 'reasoning' | 'transfer';
  objective: string;
  priority: 'core' | 'supporting';
  evidence_required?: string[];
}

export interface WorkedExampleStep {
  step_number: number;
  action: string;
  reason: string;
}

export interface WorkedExample {
  problem: string;
  goal: string;
  steps: WorkedExampleStep[];
  result: string;
  why_this_works: string;
}

export interface FadedExample {
  problem: string;
  completed_steps: WorkedExampleStep[];
  faded_step: {
    step_number: number;
    prompt: string;
    scaffold_hint: string;
  };
  target_outcome: string;
}

export interface MisconceptionContrast {
  correct_model: string;
  mistaken_model: string;
  why_mistake_looks_tempting: string;
  key_distinction: string;
}

export interface HintLadderStep {
  level: 1 | 2 | 3 | 4 | 5;
  label: 'HINT_1' | 'HINT_2' | 'HINT_3' | 'HINT_4' | 'HINT_5';
  hint_type:
    | 'broad_conceptual_cue'
    | 'relevant_principle'
    | 'specific_subproblem'
    | 'next_procedural_step'
    | 'analogous_worked_example';
  text: string;
}

export interface ReviewRecommendation {
  needed: boolean;
  reason: string;
  suggested_interval?: string;
}

export interface ExerciseHandoffContext {
  taught_concepts: string[];
  learning_objectives: string[];
  examples_used: string[];
  misconceptions_addressed: string[];
  difficulty: string;
  scaffold_level: string;
  teaching_strategy: string;
}

export interface TeachingOutcome {
  strategy: string;
  mode: string;
  concept_id: string;
  attempt_id?: string;
  evaluation_status: 'demonstrated' | 'unresolved' | 'uncertain';
  learning_result: string;
  timestamp: string;
}

export interface TeachingAction {
  run_id?: string;
  concept_id: string;
  concept_title: string;
  teaching_context: 'INITIAL_TEACHING' | 'PREREQUISITE_REPAIR';
  teaching_strategy?: TeachingStrategy;
  secondary_strategy?: string;
  teaching_mode: string;
  support_level?: 'minimal' | 'low' | 'moderate' | 'high';
  objective_summary?: string;
  learning_objectives?: LearningObjective[];
  lesson_blocks?: LessonBlock[];
  worked_example?: WorkedExample;
  faded_example?: FadedExample;
  misconception_contrast?: MisconceptionContrast;
  self_explanation_prompt?: string;
  retrieval_prompt?: string;
  transfer_prompt?: string;
  hint_ladder?: HintLadderStep[];
  review_recommendation?: ReviewRecommendation;
  teaching_context_for_exercise?: ExerciseHandoffContext;
  quality_status?: 'verified' | 'revised' | 'safe_fallback' | 'rejected';

  // Backward compatibility fields
  explanation: string;
  explanation_text?: string;
  key_takeaways: string[];
  code_example?: string;
  pedagogy_rationale: string;
  evidence_ref?: string;
  is_course_grounded: boolean;
  provenance_type?: ProvenanceType;
}

export type ExerciseFormat =
  | 'mcq'
  | 'fill_in_blank'
  | 'short_answer'
  | 'free_text'
  | 'writing'
  | 'coding'
  | 'coding_problem'
  | 'code_trace'
  | 'debugging'
  | 'prediction'
  | 'sequence'
  | 'ordering';

export type ExercisePhaseIntent =
  | 'INITIAL_TARGET'
  | 'PREREQ_RECHECK'
  | 'TARGET_RETEST'
  | 'TIE_BREAKER'
  | 'TRANSFER'
  | 'RETRIEVAL';

export type ExerciseDifficultyBand =
  | 'Foundational'
  | 'Intermediate'
  | 'Advanced'
  | 'FOUNDATIONAL'
  | 'TARGET'
  | 'CHALLENGE';

export interface ExercisePublicExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface ExercisePrivateTestCase {
  name: string;
  input: string;
  expected: string;
  is_edge_case?: boolean;
  is_stress?: boolean;
  description?: string;
}

export interface ExerciseRubricCriterion {
  id: string;
  description: string;
  weight?: number;
  required?: boolean;
}

export interface ExerciseQuestionRubric {
  rubric_type: 'conceptual' | 'coding' | 'trace' | 'debugging' | 'analytical';
  criteria: ExerciseRubricCriterion[];
  required_evidence?: string[];
  acceptable_variants?: string[];
  common_misconceptions?: string[];
  partial_evidence?: string[];
  critical_error_conditions?: string[];
}

export interface Exercise {
  exercise_id: string;
  run_id?: string;
  concept_id: string;
  concept_title: string;
  format: ExerciseFormat | string;
  question_format?: string;
  prompt: string;
  question_text?: string;
  options?: string[];
  mcq_options?: string[];
  blank_template?: string;
  difficulty: ExerciseDifficultyBand | string;
  cognitive_demand?: string;
  starter_code?: string;
  code_starter?: string;
  language?: string;
  public_examples?: ExercisePublicExample[];
  phase_intent: ExercisePhaseIntent | string;
  objective_ids?: string[];
  rubric_ref?: string;
  provenance_refs?: string[];
  generation_mode?: 'LIVE' | 'REPLAY' | 'FAILURE';
  quality_status?: 'PASS' | 'REVISED' | 'SAFE_FALLBACK' | 'FAIL';
  metadata?: Record<string, any>;

  // Backward compatibility legacy fields (omitted in public sanitized responses)
  expected_answer?: string;
  test_cases?: Array<{ name: string; input: string; expected: string }>;
}

export interface ExerciseAnswerKey {
  exercise_id: string;
  concept_id: string;
  correct_option_id?: string | null;
  correct_option_index?: number;
  accepted_answers: string[];
  canonical_answer?: string;
  required_evidence: string[];
  rubric: ExerciseQuestionRubric;
  misconception_signals: string[];
  private_test_cases: ExercisePrivateTestCase[];
  reference_solution_metadata: {
    language?: string;
    approach?: string;
    time_complexity?: string;
    space_complexity?: string;
    reference_code?: string;
  };
  evaluation_notes: string[];
  normalization_rules?: {
    case_sensitive?: boolean;
    trim?: boolean;
    remove_whitespace?: boolean;
    regex_pattern?: string;
  };
  trace_execution_steps?: Array<{
    step: number;
    state_description: string;
    variable_values?: Record<string, any>;
  }>;
  debugging_root_cause?: {
    bug_type: string;
    buggy_line?: number;
    explanation: string;
    fix: string;
  };
}

export interface Evaluation {
  evaluation_id: string;
  exercise_id: string;
  concept_id: string;
  status: EvaluationStatus;
  score: number; // 0 - 100
  reasoning_summary: string;
  evidence_found: string[];
  missing_evidence: string[];
  misconceptions: string[];
  next_recommendation: string;
  rubric_ref?: string;
  code_execution_result?: {
    passed: boolean;
    stdout: string;
    stderr: string;
    exit_code: number;
    timeout: boolean;
  };
}

export interface AgentHandoff {
  run_id: string;
  from_agent: string;
  to_agent: string;
  action: string;
  reason: string;
  timestamp: string;
  input_record_refs?: Record<string, any>;
  output_record_refs?: Record<string, any>;
}

export interface SessionEvent {
  event_id: string;
  run_id: string;
  timestamp: string;
  state: WorkflowState;
  source_agent: string;
  target_agent: string;
  action: string;
  reason: string;
  provider?: string;
  model?: string;
  duration_ms?: number;
  input_record_refs?: any;
  output_record_refs?: any;
}

export interface LearnerMemory {
  student_id: string;
  course_id: string;
  mastered_concepts: string[];
  weak_concepts: string[];
  confirmed_misconceptions: string[];
  prerequisite_history: Array<{
    prereq_id: string;
    identified_at: string;
    repaired: boolean;
    attempts_to_repair: number;
  }>;
  successful_teaching_modes: string[];
  failed_teaching_modes: string[];
  teaching_outcomes?: TeachingOutcome[];
  total_attempts: number;
  total_sessions: number;
  last_updated: string;
}

export interface SessionBudget {
  max_llm_calls: number;
  llm_calls_made: number;
  max_revisions: number;
  revisions_made: number;
  max_backtracks: number;
  backtracks_made: number;
  tokens_consumed: number;
  is_exhausted: boolean;
}
