export type SessionState =
  | 'START_STUDY'
  | 'READ_LEARNER_STATE'
  | 'LOAD_COURSE_CONTEXT'
  | 'PLAN_NEXT_ACTION'
  | 'PREREQ_SURVEY'
  | 'PREREQ_QUIZ'
  | 'INITIAL_TEACHING'
  | 'PRACTICE'
  | 'EVALUATION'
  | 'TIE_BREAKER'
  | 'DIAGNOSE_GAP'
  | 'VALIDATE_HYPOTHESIS'
  | 'SELECT_RESOURCE'
  | 'RESOURCE_CROSS_CHECK'
  | 'RETEACH_PREREQ'
  | 'GENERATE_EXERCISE'
  | 'RECHECK_GAP'
  | 'GO_DEEPER'
  | 'RECHECK_ORIGINAL'
  | 'WAITING_FOR_HUMAN'
  | 'RESUME'
  | 'TARGET_MASTERED'
  | 'SESSION_COMPLETE'
  | string;

export interface LearningPart {
  part_number: number;
  id: string;
  title: string;
  subtitle: string;
  objective: string;
  key_focus_areas: string[];
  cognitive_demand: string;
  status: 'upcoming' | 'in_progress' | 'repairing' | 'mastered';
  evaluations_count: number;
  mastery_score?: number;
  demonstrated_at?: string;
}

export interface ExerciseTestCase {
  name?: string;
  input?: string;
  expected?: string;
}

export interface Exercise {
  exercise_id?: string;
  format?: 'mcq' | 'fill_in_blank' | 'free_text' | 'coding_problem' | 'coding' | 'code_trace' | 'debugging' | 'prediction' | 'short_answer' | 'writing' | 'sequence' | string;
  question_format?: string;
  prompt?: string;
  question_text?: string;
  difficulty?: number | string;
  cognitive_demand?: string;
  concept_id?: string;
  concept_title?: string;
  options?: string[];
  mcq_options?: string[];
  blank_template?: string | null;
  starter_code?: string;
  code_starter?: string;
  language?: string;
  public_examples?: Array<{
    input?: string;
    output?: string;
    explanation?: string;
  }>;
  phase_intent?: string;
  quality_status?: string;
  test_cases?: ExerciseTestCase[];
  metadata?: Record<string, any>;
}

export interface LearningObjectiveItem {
  objective: string;
  objective_type: string;
  bloom_level?: string;
  assessment_criteria?: string;
}

export interface HintItem {
  level: number;
  label: string;
  text: string;
}

export interface WorkedStep {
  step_number: number;
  action: string;
  reason: string;
}

export interface WorkedExampleItem {
  problem: string;
  steps: WorkedStep[];
  result: string;
  why_this_works: string;
}

export interface FadedExampleItem {
  problem: string;
  completed_steps: WorkedStep[];
  faded_step: {
    prompt: string;
    scaffold_hint: string;
  };
}

export interface MisconceptionContrastItem {
  mistaken_model: string;
  correct_model: string;
  key_distinction: string;
}

export interface ConceptExampleItem {
  title: string;
  scenario: string;
  steps: Array<{ step_number?: number; action: string; reason?: string; state_transition?: string }>;
  result?: string;
  visual_or_output?: string;
  explanation?: string;
}

export interface TeachingAction {
  explanation?: string;
  explanation_text?: string;
  definition?: string;
  examples?: ConceptExampleItem[];
  pseudocode_python?: string;
  pseudocode_language?: string;
  key_takeaways?: string[];
  code_example?: string;
  teaching_mode?: string;
  teaching_strategy?: string;
  pedagogy_rationale?: string;
  blocks?: Array<{ type: string; content: string }>;
  worked_example?: WorkedExampleItem;
  faded_example?: FadedExampleItem;
  misconception_contrast?: MisconceptionContrastItem;
  hint_ladder?: HintItem[];
  self_explanation_prompt?: string;
  learning_objectives?: LearningObjectiveItem[];
}

export interface ResourceLink {
  title?: string;
  url?: string;
}

export interface ResourceSelection {
  query?: string;
  source?: string;
  provenance?: string;
  recommended_links?: Array<string | ResourceLink>;
  source_id?: string;
  excerpt?: string;
  verification_status?: 'verified' | 'external' | 'needs_verification' | 'off_target' | 'unverified' | string;
  rejection_reason?: string;
}

export interface EvaluationResult {
  status?: 'demonstrated' | 'unresolved' | 'uncertain' | string;
  score?: number | string;
  feedback?: string;
  reasoning?: string;
  next_recommendation?: string;
  prerequisite_gap?: string;
}

export interface HumanQuestion {
  question?: string;
  options?: string[];
  status?: string;
  context?: string;
}

export interface AgentEvent {
  timestamp?: string;
  source_agent?: string;
  target_agent?: string;
  action?: string;
  reason?: string;
  input_record_refs?: any;
  output_record_refs?: any;
  state?: string;
}

export interface HandoffEvent {
  from?: string;
  to?: string;
  timestamp?: string;
  reason?: string;
}

export interface DAGNode {
  id: string;
  title: string;
  status?: 'normal' | 'current' | 'candidate_prereq' | 'repaired' | 'mastered';
}

export interface DAGEdge {
  from: string;
  to: string;
}

export interface SessionData {
  run_id: string;
  current_state: SessionState;
  status?: string;
  subject?: string;
  target_concept?: string;
  target_id?: string;
  course_id?: string;
  learner_level?: string;
  learning_goal?: string;
  user_notes?: string;
  dag?: Record<string, string[]> | { nodes?: any[]; edges?: any[] } | any;
  concept_titles?: Record<string, string>;
  active_concept?: string;
  prereq_survey_data?: {
    direct_prerequisites?: Array<{ id: string; title: string } | string>;
    prerequisites?: string[];
    target_concept?: string;
    target_id?: string;
    message?: string;
    [key: string]: any;
  };
  prereq_quiz?: {
    concept?: string;
    prerequisite?: string;
    concept_title?: string;
    questions?: Array<{
      id?: string | number;
      question: string;
      options?: Record<string, string> | string[];
      correct_answer?: string;
      correct_index?: number;
      explanation?: string;
      [key: string]: any;
    }>;
    [key: string]: any;
  };
  quiz_eval?: {
    concept?: string;
    score?: number;
    passed?: boolean;
    correct_count?: number;
    total_count?: number;
    threshold?: number;
    details?: any[];
    [key: string]: any;
  };
  survey_responses?: Record<string, string>;
  exercise?: Exercise | null;
  teaching_action?: TeachingAction | null;
  resource_selection?: ResourceSelection | null;
  human_question?: HumanQuestion | null;
  history?: any[];
  taught_concepts?: string[];
  prereq_chain?: string[];
  candidate_prerequisite?: string;
  handoffs?: HandoffEvent[];
  events?: AgentEvent[];
  evaluation?: EvaluationResult | null;
  backtrack_count?: number;
  vision_statement?: string;
  n_parts?: number;
  current_part_index?: number;
  learning_parts?: LearningPart[];
  part_transition_data?: any;
  tutor_qna_history?: Array<{
    question: string;
    answer: string;
    key_takeaway?: string;
    timestamp: string;
  }>;
  [key: string]: any;
}

export interface Course {
  course_id: string;
  title: string;
  subject: string;
  source?: 'fixture' | 'dynamic' | string;
  concepts?: string[];
  description?: string;
}

export interface ContextCheckResult {
  status: 'ready' | 'insufficient' | 'needs_material' | string;
  message?: string;
  details?: string;
  readiness_score?: number;
}

export interface StudentProfile {
  student_id: string;
  mastered_concepts?: string[];
  weak_concepts?: string[];
  misconceptions?: string[];
  successful_teaching_modes?: string[];
  failed_teaching_modes?: string[];
  prerequisite_history?: any[];
  course_specific_state?: Record<string, any>;
  learning_preferences?: Record<string, any>;
  total_sessions?: number;
  [key: string]: any;
}

export interface StudentSessionSummary {
  run_id: string;
  student_id?: string;
  created_at?: string;
  course?: string;
  course_id?: string;
  subject?: string;
  target_concept?: string;
  status?: string;
  outcome?: string;
  current_state?: string;
}
