import json
import sqlite3
from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# ==========================================
# 1. Pydantic Schemas & Data Contracts
# ==========================================

class StudentState(BaseModel):
    student_id: str
    course_id: str
    mastered: List[str] = Field(default_factory=list)
    weak: List[str] = Field(default_factory=list)
    misconceptions: List[str] = Field(default_factory=list)
    prerequisite_history: List[List[str]] = Field(default_factory=list)
    successful_modes: List[str] = Field(default_factory=list)
    failed_modes: List[str] = Field(default_factory=list)
    preferred_level: Optional[str] = None
    preferred_goal: Optional[str] = None


class CourseContext(BaseModel):
    course_id: str
    course_name: str
    concepts: List[str]
    dependency_graph: Dict[str, List[str]]
    source_ids: List[str]
    readiness_status: Literal["CONTEXT_READY", "CONTEXT_INSUFFICIENT", "CONTEXT_CONFLICT", "CONTEXT_UNAVAILABLE"] = "CONTEXT_READY"


class StudySession(BaseModel):
    run_id: str
    student_id: str
    course_id: str
    target_concept: str
    status: Literal["active", "completed", "waiting_human", "given_up"] = "active"
    revision_count: int = 0
    call_count: int = 0
    current_state: str = "START_STUDY"
    agent_activities: Dict[str, str] = Field(default_factory=dict)
    learner_level: str = "intermediate"
    learning_goal: str = "understand"
    learning_phase_completed: bool = False
    lesson_skipped: bool = False
    attempt_count: int = 0


class Attempt(BaseModel):
    run_id: str
    concept: str
    question: str
    student_answer: str
    selected_option: Optional[str] = None
    code_submission: Optional[str] = None
    test_results: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class GapHypothesis(BaseModel):
    run_id: str
    target_concept: str
    candidate_prerequisite: str
    confidence: float = Field(default=0.8, ge=0.0, le=1.0)
    evidence_refs: List[str] = Field(default_factory=list)
    diagnostic_status: str = "HYPOTHESIS_PROPOSED"


class ResourceSelection(BaseModel):
    run_id: str
    concept: str
    source_id: str
    excerpt_quote: str
    verification_status: Literal[
        "VERIFIED_COURSE_SOURCE",
        "LEARNER_PROVIDED",
        "AI_GENERATED_SUPPORT",
        "UNVERIFIED",
        "COULD_NOT_ESTABLISH",
        "verified",
        "could_not_establish",
        "off_target"
    ] = "VERIFIED_COURSE_SOURCE"
    web_resources: List[Dict[str, str]] = Field(default_factory=list)
    user_custom_notes: Optional[str] = None


class TeachingAction(BaseModel):
    run_id: str
    concept: str
    teaching_mode: str
    explanation_text: str
    evidence_ref: str


class Exercise(BaseModel):
    run_id: str
    concept: str
    exercise_type: Literal["prereq_recheck", "target_retest", "tie_breaker", "initial_target"]
    question_text: str
    rubric_ref: str
    question_format: Literal["free_text", "mcq", "fill_in_blank", "coding_problem"] = "free_text"
    mcq_options: List[str] = Field(default_factory=list)
    blank_template: Optional[str] = None
    code_starter: Optional[str] = None
    language: Optional[str] = "python"
    test_cases: List[Dict[str, Any]] = Field(default_factory=list)


class Evaluation(BaseModel):
    run_id: str
    concept: str
    status: Literal["demonstrated", "unresolved", "uncertain"]
    reasoning: str
    next_recommendation: str


class LearningUpdate(BaseModel):
    student_id: str
    course_id: str
    concept: str
    new_status: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class AgentHandoff(BaseModel):
    run_id: str
    from_agent: str
    to_agent: str
    action: str
    input_record_refs: List[str] = Field(default_factory=list)
    output_record_refs: List[str] = Field(default_factory=list)
    reason: str
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class HumanQuestion(BaseModel):
    run_id: str
    question: str
    options: List[str] = Field(default_factory=list)
    status: Literal["pending", "answered"] = "pending"


class HumanDecision(BaseModel):
    run_id: str
    decision: str
    note: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())


class DiagnosticValidationCase(BaseModel):
    case_id: str
    concept: str
    student_answer: str
    expected_gap: str
    expected_status: Literal["demonstrated", "unresolved", "uncertain"]
    category: str  # e.g., careless, prerequisite_gap, misconception, ambiguous, invalid_edge


# ==========================================
# 2. Persistent Storage Engine (SQLite)
# ==========================================

class StateManager:
    """Manages persistent storage for Student Profiles, Study Sessions, and Agent Handoffs in SQLite."""

    def __init__(self, db_path: str = "vision.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        return sqlite3.connect(self.db_path)

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS student_states (
                    student_id TEXT PRIMARY KEY,
                    course_id TEXT NOT NULL,
                    mastered TEXT NOT NULL,
                    weak TEXT NOT NULL,
                    misconceptions TEXT NOT NULL,
                    prerequisite_history TEXT,
                    successful_modes TEXT,
                    failed_modes TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS study_sessions (
                    run_id TEXT PRIMARY KEY,
                    student_id TEXT NOT NULL,
                    course_id TEXT NOT NULL,
                    target_concept TEXT NOT NULL,
                    status TEXT NOT NULL,
                    revision_count INTEGER DEFAULT 0,
                    call_count INTEGER DEFAULT 0,
                    current_state TEXT NOT NULL,
                    session_data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(student_id) REFERENCES student_states(student_id)
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS agent_handoffs (
                    handoff_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    from_agent TEXT NOT NULL,
                    to_agent TEXT NOT NULL,
                    action TEXT NOT NULL,
                    input_record_refs TEXT NOT NULL,
                    output_record_refs TEXT NOT NULL,
                    reason TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS learner_course_states (
                    student_id TEXT NOT NULL,
                    course_id TEXT NOT NULL,
                    mastered TEXT NOT NULL,
                    weak TEXT NOT NULL,
                    misconceptions TEXT NOT NULL,
                    prerequisite_history TEXT,
                    successful_modes TEXT,
                    failed_modes TEXT,
                    preferred_level TEXT,
                    preferred_goal TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (student_id, course_id)
                );
            """)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS session_events (
                    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    run_id TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    phase TEXT NOT NULL,
                    current_state TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    action TEXT NOT NULL,
                    result TEXT NOT NULL,
                    reason TEXT NOT NULL
                );
            """)
            conn.commit()

    def get_or_create_student_state(self, student_id: str, course_id: str) -> StudentState:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT mastered, weak, misconceptions, prerequisite_history, successful_modes, failed_modes, preferred_level, preferred_goal FROM learner_course_states WHERE student_id = ? AND course_id = ?", (student_id, course_id))
            row = cursor.fetchone()
            if row:
                return StudentState(
                    student_id=student_id,
                    course_id=course_id,
                    mastered=json.loads(row[0]),
                    weak=json.loads(row[1]),
                    misconceptions=json.loads(row[2]),
                    prerequisite_history=json.loads(row[3] or "[]"),
                    successful_modes=json.loads(row[4] or "[]"),
                    failed_modes=json.loads(row[5] or "[]"),
                    preferred_level=row[6],
                    preferred_goal=row[7]
                )
            else:
                cursor.execute("SELECT successful_modes, failed_modes, preferred_level, preferred_goal FROM learner_course_states WHERE student_id = ? ORDER BY updated_at DESC LIMIT 1", (student_id,))
                prior = cursor.fetchone()
                state = StudentState(student_id=student_id, course_id=course_id)
                if prior:
                    state.successful_modes = json.loads(prior[0] or "[]")
                    state.failed_modes = json.loads(prior[1] or "[]")
                    state.preferred_level = prior[2]
                    state.preferred_goal = prior[3]
                self.save_student_state(state)
                return state

    def save_student_state(self, state: StudentState):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO learner_course_states
                (student_id, course_id, mastered, weak, misconceptions, prerequisite_history, successful_modes, failed_modes, preferred_level, preferred_goal, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                state.student_id,
                state.course_id,
                json.dumps(state.mastered),
                json.dumps(state.weak),
                json.dumps(state.misconceptions),
                json.dumps(state.prerequisite_history),
                json.dumps(state.successful_modes),
                json.dumps(state.failed_modes),
                state.preferred_level,
                state.preferred_goal
            ))
            conn.commit()

    def record_event(self, event: Dict[str, Any]):
        with self._get_connection() as conn:
            conn.execute(
                "INSERT INTO session_events (run_id, timestamp, phase, current_state, actor, action, result, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (event["run_id"], event.get("timestamp"), event["phase"], event["current_state"], event["actor"], event["action"], event["result"], event["reason"]),
            )
            conn.commit()

    def get_events(self, run_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            rows = conn.execute("SELECT event_id, run_id, timestamp, phase, current_state, actor, action, result, reason FROM session_events WHERE run_id = ? ORDER BY event_id", (run_id,)).fetchall()
            return [
                {
                    "event_id": r[0],
                    "run_id": r[1],
                    "timestamp": r[2],
                    "phase": r[3],
                    "current_state": r[4],
                    "actor": r[5],
                    "action": r[6],
                    "result": r[7],
                    "reason": r[8],
                }
                for r in rows
            ]

    def save_study_session(self, session: StudySession, session_data: Dict[str, Any]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO study_sessions 
                (run_id, student_id, course_id, target_concept, status, revision_count, call_count, current_state, session_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                session.run_id,
                session.student_id,
                session.course_id,
                session.target_concept,
                session.status,
                session.revision_count,
                session.call_count,
                session.current_state,
                json.dumps(session_data)
            ))
            conn.commit()

    def get_study_session(self, run_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT run_id, student_id, course_id, target_concept, status, revision_count, call_count, current_state, session_data FROM study_sessions WHERE run_id = ?", (run_id,))
            row = cursor.fetchone()
            if not row:
                return None
            data = json.loads(row[8])
            data["session"] = {
                "run_id": row[0],
                "student_id": row[1],
                "course_id": row[2],
                "target_concept": row[3],
                "status": row[4],
                "revision_count": row[5],
                "call_count": row[6],
                "current_state": row[7],
                "agent_activities": data.get("agent_activities", {}),
                "learner_level": data.get("learner_level", "intermediate"),
                "learning_goal": data.get("learning_goal", "understand"),
                "learning_phase_completed": data.get("learning_phase_completed", False),
                "lesson_skipped": data.get("lesson_skipped", False),
                "attempt_count": data.get("attempt_count", 0)
            }
            return data

    def record_handoff(self, handoff: AgentHandoff):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_handoffs
                (run_id, from_agent, to_agent, action, input_record_refs, output_record_refs, reason, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                handoff.run_id,
                handoff.from_agent,
                handoff.to_agent,
                handoff.action,
                json.dumps(handoff.input_record_refs),
                json.dumps(handoff.output_record_refs),
                handoff.reason,
                handoff.timestamp
            ))
            conn.commit()

    def get_handoffs(self, run_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT from_agent, to_agent, action, input_record_refs, output_record_refs, reason, timestamp
                FROM agent_handoffs WHERE run_id = ? ORDER BY handoff_id ASC
            """, (run_id,))
            rows = cursor.fetchall()
            return [
                {
                    "from_agent": r[0],
                    "to_agent": r[1],
                    "action": r[2],
                    "input_record_refs": json.loads(r[3]),
                    "output_record_refs": json.loads(r[4]),
                    "reason": r[5],
                    "timestamp": r[6]
                }
                for r in rows
            ]

    def get_student_sessions(self, student_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT run_id, course_id, target_concept, status, current_state, created_at FROM study_sessions WHERE student_id = ? ORDER BY created_at DESC", (student_id,))
            rows = cursor.fetchall()
            return [
                {
                    "run_id": r[0],
                    "course_id": r[1],
                    "target_concept": r[2],
                    "status": r[3],
                    "current_state": r[4],
                    "created_at": r[5]
                }
                for r in rows
            ]

