"""
VISION FastAPI Application — Full-stack REST API for Adaptive Study Engine.
Zero hardcoded courses. Dynamic prerequisite graphs, agent orchestration,
and persistent learner state management.
"""

from __future__ import annotations
import json
import os
from pathlib import Path
from typing import Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from slice.controller import WorkflowController
from slice.mongo_state_manager import MongoStateManager

ROOT = Path(__file__).resolve().parent.parent

# ─── Request Schemas ───────────────────────────────────────────────────────

class StartRequest(BaseModel):
    student_id: str = Field(default="demo_student", min_length=1, max_length=80)
    subject: str = Field(min_length=2, max_length=120)
    target_concept: str = Field(min_length=2, max_length=160)
    course_id: Optional[str] = Field(default=None, max_length=80)
    learner_level: str = Field(default="intermediate", max_length=40)
    learning_goal: Optional[str] = Field(default="understand", max_length=200)
    user_notes: Optional[str] = Field(default=None, max_length=2000)


class PracticeRequest(BaseModel):
    run_id: str = Field(min_length=4, max_length=80)
    skip_lesson: bool = False


class PrereqSurveyRequest(BaseModel):
    run_id: str = Field(min_length=4, max_length=80)
    survey_responses: dict[str, str] = Field(default_factory=dict)


class PrereqQuizRequest(BaseModel):
    run_id: str = Field(min_length=4, max_length=80)
    answers: dict[str, Any] = Field(default_factory=dict)


class StepRequest(BaseModel):
    run_id: str = Field(min_length=4, max_length=80)
    student_answer: Optional[str] = Field(default="", max_length=4000)
    selected_option: Optional[str] = Field(default=None, max_length=500)
    code_submission: Optional[str] = Field(default=None, max_length=10000)
    test_results: Optional[list] = Field(default_factory=list)
    user_notes: Optional[str] = Field(default=None, max_length=2000)


class ResumeRequest(BaseModel):
    run_id: str = Field(min_length=4, max_length=80)
    decision: str = Field(min_length=1, max_length=120)
    note: Optional[str] = Field(default=None, max_length=1000)


class ContextCheckRequest(BaseModel):
    subject: str = Field(min_length=2, max_length=120)
    target_concept: str = Field(min_length=2, max_length=160)


# ─── Storage + Controller ──────────────────────────────────────────────────

storage = MongoStateManager()
controller = WorkflowController(
    state_manager=storage,
    domain_dir=str(ROOT / "domain"),
)

app = FastAPI(title="VISION Adaptive Study API", version="2.0.0")
allowed_origins = os.getenv(
    "FRONTEND_ORIGIN",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Helpers ────────────────────────────────────────────────────────────────

def _public_session(run_id: str) -> dict[str, Any]:
    raw = storage.get_study_session(run_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Study session not found")
    session = raw["session"]
    exercise = raw.get("active_exercise")
    if exercise and isinstance(exercise, dict):
        exercise = dict(exercise)
        exercise.pop("expected_answer_hint", None)
        exercise["prompt"] = exercise.get("prompt") or exercise.get("question_text", "")
        exercise["format"] = exercise.get("format") or exercise.get("question_format", "free_text")
        exercise["options"] = exercise.get("options") or exercise.get("mcq_options", [])
        exercise["starter_code"] = exercise.get("starter_code") or exercise.get("code_starter", "")

    teaching_action = raw.get("teaching_action")
    if teaching_action and isinstance(teaching_action, dict):
        teaching_action = dict(teaching_action)
        teaching_action["explanation"] = teaching_action.get("explanation") or teaching_action.get("explanation_text", "")

    response = {
        "run_id": run_id,
        "current_state": session["current_state"],
        "status": session["status"],
        "session": session,
        "subject": raw.get("subject", ""),
        "target_concept": raw.get("target_concept", session["target_concept"]),
        "target_id": raw.get("target_id", session["target_concept"]),
        "active_concept": raw.get("active_concept"),
        "dag": raw.get("dag", {}),
        "concept_titles": raw.get("concept_titles", {}),
        "prereq_survey_data": raw.get("prereq_survey_data"),
        "prereq_quiz": raw.get("active_prereq_quiz"),
        "quiz_eval": raw.get("last_quiz_eval"),
        "survey_responses": raw.get("survey_responses"),
        "exercise": exercise,
        "teaching_action": teaching_action,
        "resource_selection": raw.get("resource_selection"),
        "human_question": raw.get("human_question"),
        "history": raw.get("history", []),
        "taught_concepts": raw.get("taught_concepts", []),
        "prereq_chain": raw.get("prereq_chain", []),
        "handoffs": storage.get_handoffs(run_id),
        "events": storage.get_events(run_id) if hasattr(storage, "get_events") else [],
    }
    return {key: value for key, value in response.items() if value is not None}


# ─── Health ─────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health() -> dict[str, Any]:
    from slice.llm_client import LLMClient
    llm = LLMClient()
    return {
        "status": "ok",
        "service": "vision-api",
        "storage": storage.backend,
        "llm_provider": llm.provider,
        "llm_model": llm.model,
        "llm_live": llm.is_live,
    }


# ─── Courses (Dynamic Discovery) ───────────────────────────────────────────

@app.get("/api/courses")
def courses() -> list[dict[str, Any]]:
    """Discover available course fixtures from domain/ directory.
    Always includes a 'custom' entry for typing any subject."""
    result = []
    domain_dir = ROOT / "domain"
    for path in sorted(domain_dir.glob("*.json")):
        if path.name.startswith("_") or "rubric" in path.name:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            nodes = data.get("nodes", [])
            root = data.get("root_concept", "")
            root_title = next(
                (n["title"] for n in nodes if n["id"] == root),
                root.replace("_", " ").title()
            )
            result.append({
                "course_id": data.get("course_id", path.stem),
                "name": data.get("course_name", path.stem.replace("_", " ").title()),
                "description": f"Prerequisite graph with {len(nodes)} concepts",
                "target_concept": root,
                "target_title": root_title,
                "concept_count": len(nodes),
                "source": "fixture",
            })
        except Exception:
            continue

    result.append({
        "course_id": "custom",
        "name": "Custom — type your own",
        "description": "Enter any subject and concept. VISION builds the prerequisite graph dynamically.",
        "target_concept": "",
        "target_title": "",
        "concept_count": 0,
        "source": "dynamic",
    })

    return result


# ─── Context Readiness Check ───────────────────────────────────────────────

@app.post("/api/context/check")
def check_context(payload: ContextCheckRequest) -> dict[str, Any]:
    """Check if VISION can build sufficient learning context for this subject/concept."""
    return controller.check_context_readiness(
        payload.subject.strip(),
        payload.target_concept.strip()
    )


# ─── Session Lifecycle ─────────────────────────────────────────────────────

@app.post("/api/session/start")
def start_session(payload: StartRequest) -> dict[str, Any]:
    try:
        result = controller.start_session(
            student_id=payload.student_id.strip(),
            subject=payload.subject.strip(),
            target_concept=payload.target_concept.strip(),
            course_id=payload.course_id,
            learner_level=payload.learner_level.strip().lower(),
            learning_goal=(payload.learning_goal or "understand").strip(),
            user_notes=payload.user_notes,
            defer_practice=True,
        )
        return {
            **result,
            "handoffs": storage.get_handoffs(result["run_id"]),
            "storage": storage.backend,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/session/prereq-survey")
def prereq_survey(payload: PrereqSurveyRequest) -> dict[str, Any]:
    try:
        result = controller.submit_prereq_survey(payload.run_id, payload.survey_responses)
        return {
            **result,
            "handoffs": storage.get_handoffs(payload.run_id),
            "storage": storage.backend,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/session/prereq-quiz")
def prereq_quiz(payload: PrereqQuizRequest) -> dict[str, Any]:
    try:
        result = controller.submit_prereq_quiz(payload.run_id, payload.answers)
        return {
            **result,
            "handoffs": storage.get_handoffs(payload.run_id),
            "storage": storage.backend,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/session/begin-practice")
def begin_practice(payload: PracticeRequest) -> dict[str, Any]:
    try:
        result = controller.begin_practice(payload.run_id, payload.skip_lesson)
        return {**result, "handoffs": storage.get_handoffs(payload.run_id), "storage": storage.backend}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/session/{run_id}")
def get_session(run_id: str) -> dict[str, Any]:
    return _public_session(run_id)


@app.post("/api/session/step")
def step_session(payload: StepRequest) -> dict[str, Any]:
    try:
        result = controller.submit_answer(
            run_id=payload.run_id,
            student_answer=(payload.student_answer or "").strip(),
            selected_option=payload.selected_option,
            code_submission=payload.code_submission,
            test_results=payload.test_results,
            user_notes=payload.user_notes
        )
        return {
            **result,
            "handoffs": storage.get_handoffs(payload.run_id),
            "storage": storage.backend,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/session/{run_id}/step")
def step_session_alias(run_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return step_session(StepRequest(
        run_id=run_id,
        student_answer=str(payload.get("student_answer", "")),
        selected_option=payload.get("selected_option"),
        code_submission=payload.get("code_submission"),
        test_results=payload.get("test_results"),
        user_notes=payload.get("user_notes")
    ))


@app.post("/api/session/human-resume")
def resume_session(payload: ResumeRequest) -> dict[str, Any]:
    try:
        result = controller.resume_human_decision(payload.run_id, payload.decision)
        return {
            **result,
            "handoffs": storage.get_handoffs(payload.run_id),
            "storage": storage.backend,
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/api/session/{run_id}/human-resume")
def resume_session_alias(run_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return resume_session(ResumeRequest(
        run_id=run_id,
        decision=str(payload.get("decision", "continue")),
        note=payload.get("note"),
    ))


# ─── Why Explanation ────────────────────────────────────────────────────────

@app.get("/api/session/{run_id}/why")
def session_why(run_id: str) -> dict[str, Any]:
    """Natural-language explanation of why VISION chose the current action."""
    return controller.get_why_explanation(run_id)


# ─── Agent Events / Handoff Trace ──────────────────────────────────────────

@app.get("/api/session/{run_id}/events")
def session_events(run_id: str) -> list[dict[str, Any]]:
    """Return the full agent handoff trace for a session."""
    if hasattr(storage, "get_events"):
        return storage.get_events(run_id)
    return storage.get_handoffs(run_id)


# ─── Student Profile ───────────────────────────────────────────────────────

@app.get("/api/student/{student_id}/profile")
def student_profile(student_id: str, course_id: str = "dynamic") -> dict[str, Any]:
    profile = storage.get_or_create_student_state(student_id, course_id)
    return {
        "profile": profile.model_dump(),
        "sessions": storage.get_student_sessions(student_id),
    }


@app.get("/api/student/{student_id}/sessions")
def student_sessions(student_id: str) -> list[dict[str, Any]]:
    return storage.get_student_sessions(student_id)


# ─── Static UI & Root ───────────────────────────────────────────────────────

from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

dist_dir = ROOT / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/assets", StaticFiles(directory=str(dist_dir / "assets")), name="static_assets")

    @app.get("/")
    def serve_ui() -> FileResponse:
        return FileResponse(dist_dir / "index.html")
else:
    @app.get("/")
    def root() -> dict[str, str]:
        return {"name": "VISION Adaptive Study API", "docs": "/docs"}
