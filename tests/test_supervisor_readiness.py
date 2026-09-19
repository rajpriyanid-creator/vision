import os
import sys
import pytest

# Force mock mode in tests
os.environ["VISION_LIVE_LLM"] = "false"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from slice.controller import WorkflowController
from agents.supervisor import SupervisorAgent

def test_supervisor_agent_quiz_and_eval():
    agent = SupervisorAgent()
    quiz = agent.generate_prereq_quiz("pointers_and_references", "C++", count=2)
    assert quiz["concept"] == "pointers_and_references"
    assert len(quiz["questions"]) == 2

    # Test scoring 100% (both correct)
    answers_perfect = {"1": 0, "2": 1}
    eval_perfect = agent.evaluate_prereq_quiz("pointers_and_references", quiz, answers_perfect)
    assert eval_perfect["score"] == 100.0
    assert eval_perfect["passed"] is True

    # Test scoring 50% (< 70% threshold, fails)
    answers_fail = {"1": 0, "2": 0}
    eval_fail = agent.evaluate_prereq_quiz("pointers_and_references", quiz, answers_fail)
    assert eval_fail["score"] == 50.0
    assert eval_fail["passed"] is False

def test_prereq_survey_branch_no(tmp_path):
    """If user selects 'No', system pivots to teach that prerequisite first."""
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_survey_no", "Data Structures", "binary_tree_inorder_traversal")
    assert res["current_state"] == "PREREQ_SURVEY"
    run_id = res["run_id"]

    survey_resp = {res["prereq_survey_data"]["direct_prerequisites"][0]["id"]: "no"}
    res_survey = controller.submit_prereq_survey(run_id, survey_resp)
    assert res_survey["current_state"] == "INITIAL_TEACHING"
    assert "Prerequisite gap acknowledged" in res_survey["message"]

def test_prereq_survey_branch_partially_and_quiz(tmp_path):
    """If user selects 'Partially', quiz is served. If passed (>=70%), unlocks target; if failed, reteaches."""
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_survey_part", "Data Structures", "binary_tree_inorder_traversal")
    run_id = res["run_id"]
    prereq_id = res["prereq_survey_data"]["direct_prerequisites"][0]["id"]

    # 1. Select 'Partially'
    res_survey = controller.submit_prereq_survey(run_id, {prereq_id: "partially"})
    assert res_survey["current_state"] == "PREREQ_QUIZ"
    assert "prereq_quiz" in res_survey

    # 2. Submit passing quiz answers (score 100% >= 70%)
    res_quiz_pass = controller.submit_prereq_quiz(run_id, {"1": 0, "2": 1})
    assert res_quiz_pass["current_state"] == "INITIAL_TEACHING"
    assert "Prerequisite verified" in res_quiz_pass["message"]

def test_prereq_survey_branch_all_yes(tmp_path):
    """If user selects 'Yes' for all prereqs, target concept is unlocked directly."""
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_survey_yes", "Data Structures", "binary_tree_inorder_traversal")
    run_id = res["run_id"]

    survey_resp = {p["id"]: "yes" for p in res["prereq_survey_data"]["direct_prerequisites"]}
    res_survey = controller.submit_prereq_survey(run_id, survey_resp)
    assert res_survey["current_state"] == "INITIAL_TEACHING"
    assert "Prerequisites verified" in res_survey["message"]
