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

export interface ExerciseTestCase {
  name?: string;
  input?: string;
  expected?: string;
}

export interface Exercise {
  exercise_id?: string;
  format?: 'mcq' | 'fill_in_blank' | 'free_text' | 'coding_problem' | string;
  question_format?: string;
  prompt?: string;
  question_text?: string;
  difficulty?: number | string;
  concept_id?: string;
  concept_title?: string;
  options?: string[];
  mcq_options?: string[];
  starter_code?: string;
  code_starter?: string;
  test_cases?: ExerciseTestCase[];
  metadata?: Record<string, any>;
}

export interface TeachingAction {
  explanation?: string;
  explanation_text?: string;
  key_takeaways?: string[];
  code_example?: string;
  teaching_mode?: string;
  pedagogy_rationale?: string;
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
