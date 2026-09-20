import { TeachingOutcome } from './models/contracts';

export interface StoredSession {
  run_id: string;
  student_id: string;
  subject: string;
  target_concept: string;
  target_id: string;
  course_id: string;
  current_state: string;
  status: string;
  learner_level: string;
  learning_goal: string;
  user_notes?: string;
  call_count: number;
  revision_count: number;
  backtrack_count: number;
  dag: Record<string, string[]>;
  concept_titles: Record<string, string>;
  active_concept?: string;
  candidate_prerequisite?: string;
  prereq_chain: string[];
  taught_concepts: string[];
  prereq_survey_data?: any;
  active_prereq_quiz?: any;
  last_quiz_eval?: any;
  survey_responses?: Record<string, string>;
  active_exercise?: any;
  active_answer_key?: any;
  exercise_history?: any[];
  teaching_action?: any;
  resource_selection?: any;
  human_question?: any;
  evaluation?: any;
  history: any[];
  agent_activities?: Record<string, string>;
  last_submission_id?: string;
  created_at: string;
  // N-Part Vision Roadmap
  vision_statement?: string;
  n_parts?: number;
  current_part_index?: number;
  learning_parts?: any[];
  part_transition_data?: any;
  tutor_qna_history?: Array<{
    question: string;
    answer: string;
    key_takeaway?: string;
    timestamp: string;
  }>;
}

export interface StudentProfileData {
  student_id: string;
  course_id: string;
  mastered_concepts: string[];
  weak_concepts: string[];
  misconceptions: string[];
  successful_teaching_modes: string[];
  failed_teaching_modes: string[];
  teaching_outcomes: TeachingOutcome[];
  prerequisite_history: any[];
  learning_preferences: Record<string, any>;
  total_sessions: number;
}

export interface AgentEventData {
  timestamp: string;
  source_agent: string;
  target_agent: string;
  action: string;
  reason: string;
  state: string;
  input_record_refs?: any;
  output_record_refs?: any;
}

export interface HandoffEventData {
  from: string;
  to: string;
  timestamp: string;
  action?: string;
  reason?: string;
}

class InMemoryDatabase {
  private sessions = new Map<string, StoredSession>();
  private studentProfiles = new Map<string, StudentProfileData>();
  private events = new Map<string, AgentEventData[]>();
  private handoffs = new Map<string, HandoffEventData[]>();

  getSession(runId: string): StoredSession | undefined {
    return this.sessions.get(runId);
  }

  saveSession(session: StoredSession): void {
    this.sessions.set(session.run_id, session);
  }

  getStudentProfile(studentId: string, courseId = 'dynamic'): StudentProfileData {
    const key = `${studentId}_${courseId}`;
    if (!this.studentProfiles.has(key)) {
      this.studentProfiles.set(key, {
        student_id: studentId,
        course_id: courseId,
        mastered_concepts: [],
        weak_concepts: [],
        misconceptions: [],
        successful_teaching_modes: [],
        failed_teaching_modes: [],
        teaching_outcomes: [],
        prerequisite_history: [],
        learning_preferences: { pace: 'adaptive', modality: 'interactive' },
        total_sessions: 0
      });
    }
    const prof = this.studentProfiles.get(key)!;
    if (!prof.teaching_outcomes) {
      prof.teaching_outcomes = [];
    }
    return prof;
  }

  saveStudentProfile(profile: StudentProfileData): void {
    const key = `${profile.student_id}_${profile.course_id}`;
    this.studentProfiles.set(key, profile);
  }

  getStudentSessions(studentId: string): StoredSession[] {
    const list: StoredSession[] = [];
    for (const sess of this.sessions.values()) {
      if (sess.student_id === studentId) {
        list.push(sess);
      }
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addEvent(runId: string, event: AgentEventData): void {
    if (!this.events.has(runId)) {
      this.events.set(runId, []);
    }
    this.events.get(runId)!.push(event);
  }

  getEvents(runId: string): AgentEventData[] {
    return this.events.get(runId) || [];
  }

  addHandoff(runId: string, handoff: HandoffEventData): void {
    if (!this.handoffs.has(runId)) {
      this.handoffs.set(runId, []);
    }
    this.handoffs.get(runId)!.push(handoff);
  }

  getHandoffs(runId: string): HandoffEventData[] {
    return this.handoffs.get(runId) || [];
  }
}

export const db = new InMemoryDatabase();
