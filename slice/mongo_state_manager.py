"""MongoDB persistence adapter for the VISION workflow.

The controller talks to a very small repository-shaped interface. This keeps
the deterministic learning engine independent from the storage technology and
lets the API use MongoDB while the offline test suite can continue to use its
temporary SQLite database.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pymongo import MongoClient

from slice.state_manager import AgentHandoff, StateManager, StudentState, StudySession


class MongoStateManager:
    """Persist learner profiles, sessions, and typed handoffs in MongoDB.

    If MongoDB is not reachable, an explicit opt-in fallback keeps local demos
    usable. Production deployments should set ``VISION_MONGO_REQUIRED=true``.
    """

    def __init__(self, uri: Optional[str] = None, db_name: Optional[str] = None):
        self.uri = uri or os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
        self.db_name = db_name or os.getenv("MONGO_DB_NAME", "vision")
        self._fallback: Optional[StateManager] = None
        self.client = None
        self.db = None
        try:
            self.client = MongoClient(self.uri, serverSelectionTimeoutMS=1200)
            self.client.admin.command("ping")
            self.db = self.client[self.db_name]
            self.db.student_states.create_index("student_id", unique=True)
            self.db.study_sessions.create_index("run_id", unique=True)
            self.db.agent_handoffs.create_index([("run_id", 1), ("handoff_id", 1)])
            self.backend = "mongodb"
        except Exception as exc:
            if os.getenv("VISION_MONGO_REQUIRED", "false").lower() in {"1", "true", "yes"}:
                raise RuntimeError(f"MongoDB is required but unavailable: {exc}") from exc
            self._fallback = StateManager(os.getenv("VISION_SQLITE_FALLBACK", "vision.db"))
            self.backend = "sqlite-fallback"

    def get_or_create_student_state(self, student_id: str, course_id: str) -> StudentState:
        if self._fallback:
            return self._fallback.get_or_create_student_state(student_id, course_id)
        doc = self.db.student_states.find_one({"student_id": student_id})
        if doc:
            return StudentState(
                student_id=student_id,
                course_id=course_id,
                mastered=doc.get("mastered", []),
                weak=doc.get("weak", []),
                misconceptions=doc.get("misconceptions", []),
                prerequisite_history=doc.get("prerequisite_history", []),
                successful_modes=doc.get("successful_modes", []),
                failed_modes=doc.get("failed_modes", []),
            )
        state = StudentState(student_id=student_id, course_id=course_id)
        self.save_student_state(state)
        return state

    def save_student_state(self, state: StudentState):
        if self._fallback:
            return self._fallback.save_student_state(state)
        payload = state.model_dump()
        payload["updated_at"] = datetime.now(timezone.utc).isoformat()
        self.db.student_states.replace_one({"student_id": state.student_id}, payload, upsert=True)

    def save_study_session(self, session: StudySession, session_data: Dict[str, Any]):
        if self._fallback:
            return self._fallback.save_study_session(session, session_data)
        self.db.study_sessions.replace_one(
            {"run_id": session.run_id},
            {"run_id": session.run_id, "session": session.model_dump(), "session_data": session_data,
             "updated_at": datetime.now(timezone.utc).isoformat()},
            upsert=True,
        )

    def get_study_session(self, run_id: str) -> Optional[Dict[str, Any]]:
        if self._fallback:
            return self._fallback.get_study_session(run_id)
        doc = self.db.study_sessions.find_one({"run_id": run_id}, {"_id": 0})
        if not doc:
            return None
        data = dict(doc.get("session_data", {}))
        data["session"] = doc["session"]
        return data

    def record_handoff(self, handoff: AgentHandoff):
        if self._fallback:
            return self._fallback.record_handoff(handoff)
        next_id = self.db.agent_handoffs.count_documents({"run_id": handoff.run_id}) + 1
        payload = handoff.model_dump()
        payload["handoff_id"] = next_id
        self.db.agent_handoffs.insert_one(payload)

    def get_handoffs(self, run_id: str) -> List[Dict[str, Any]]:
        if self._fallback:
            return self._fallback.get_handoffs(run_id)
        return list(self.db.agent_handoffs.find({"run_id": run_id}, {"_id": 0}).sort("handoff_id", 1))

    def get_student_sessions(self, student_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        if self._fallback:
            # SQLite's existing manager intentionally has a small interface;
            # return the same public shape for the dashboard.
            with self._fallback._get_connection() as conn:
                rows = conn.execute(
                    "SELECT run_id, course_id, target_concept, status, current_state, created_at FROM study_sessions WHERE student_id = ? ORDER BY created_at DESC LIMIT ?",
                    (student_id, limit),
                ).fetchall()
            return [dict(zip(("run_id", "course_id", "target_concept", "status", "current_state", "created_at"), row)) for row in rows]
        docs = list(self.db.study_sessions.find(
            {"session.student_id": student_id},
            {"_id": 0, "session.run_id": 1, "session.course_id": 1, "session.target_concept": 1,
             "session.status": 1, "session.current_state": 1, "updated_at": 1},
        ).sort("updated_at", -1).limit(limit))
        return [
            {
                "run_id": doc.get("session", {}).get("run_id"),
                "course_id": doc.get("session", {}).get("course_id"),
                "target_concept": doc.get("session", {}).get("target_concept"),
                "status": doc.get("session", {}).get("status"),
                "current_state": doc.get("session", {}).get("current_state"),
                "updated_at": doc.get("updated_at"),
            }
            for doc in docs
        ]
