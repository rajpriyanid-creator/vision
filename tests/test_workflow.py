import os
import sys
import pytest

# Force mock mode in tests — prevents API quota burn.
os.environ["VISION_LIVE_LLM"] = "false"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from slice.controller import WorkflowController
from slice.validator import Validator
from slice.state_manager import StateManager


def test_teach_first_flow(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    # start_session checks prerequisites -> if prereqs exist, PREREQ_SURVEY
    res = controller.start_session(
        student_id="student_tf",
        subject="Data Structures",
        target_concept="binary_tree_inorder_traversal",
        learner_level="intermediate",
        learning_goal="mastery",
        defer_practice=True
    )
    run_id = res["run_id"]
    if res["current_state"] == "PREREQ_SURVEY":
        survey_resp = {p["id"]: "yes" for p in res["prereq_survey_data"]["direct_prerequisites"]}
        res = controller.submit_prereq_survey(run_id, survey_resp)

    assert res["current_state"] == "INITIAL_TEACHING"
    assert "teaching_action" in res

    # Explicit begin_practice transitions to PRACTICE and generates exercise
    res_practice = controller.begin_practice(run_id)
    assert res_practice["current_state"] == "PRACTICE"
    assert "exercise" in res_practice
    assert res_practice["exercise"]["question_text"] is not None


def test_happy_path_mastery(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_1", "ds_101", "binary_tree_inorder_traversal")
    run_id = res["run_id"]

    if res["current_state"] == "PREREQ_SURVEY":
        survey_resp = {p["id"]: "yes" for p in res["prereq_survey_data"]["direct_prerequisites"]}
        res = controller.submit_prereq_survey(run_id, survey_resp)

    if res["current_state"] == "INITIAL_TEACHING":
        res = controller.begin_practice(run_id)

    assert res["current_state"] == "PRACTICE"

    # Submit correct answer directly
    res_ans = controller.submit_answer(run_id, "left subtree, root node, right subtree")
    assert res_ans["current_state"] == "SESSION_COMPLETE"
    assert res_ans["status"] == "completed"


def test_prerequisite_repair_loop(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_2", "ds_101", "binary_tree_inorder_traversal")
    run_id = res["run_id"]

    if res["current_state"] == "PREREQ_SURVEY":
        survey_resp = {p["id"]: "yes" for p in res["prereq_survey_data"]["direct_prerequisites"]}
        res = controller.submit_prereq_survey(run_id, survey_resp)

    if res["current_state"] == "INITIAL_TEACHING":
        res = controller.begin_practice(run_id)

    # Submit wrong answer — triggers diagnosis and reteaching
    res_ans1 = controller.submit_answer(run_id, "I tried calling left node but got segmentation fault NULL reference")
    assert res_ans1["current_state"] in ("PRACTICE", "RETEACH_PREREQ")
    assert "Gap found" in res_ans1["message"] or "Grounded" in res_ans1["message"]

    # Repair prerequisite
    res_ans2 = controller.submit_answer(run_id, "The base case terminates execution and returns control to caller")
    assert res_ans2["current_state"] in ("PRACTICE", "RECHECK_ORIGINAL")

    # Master original target
    res_ans3 = controller.submit_answer(run_id, "left subtree, root node, right subtree")
    assert res_ans3["current_state"] == "SESSION_COMPLETE"
    assert res_ans3["status"] == "completed"


def test_second_encounter_memory_isolation(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    sm = StateManager(db_path=db_file)

    # Session 1: Data Structures
    state_ds = sm.get_or_create_student_state("student_m1", "data_structures")
    state_ds.successful_modes.append("visual_diagram")
    state_ds.mastered.append("binary_tree_inorder_traversal")
    sm.save_student_state(state_ds)

    # Session 2: Operating Systems
    state_os = sm.get_or_create_student_state("student_m1", "operating_systems")
    
    # Preferred teaching mode transferred
    assert "visual_diagram" in state_os.successful_modes
    # Course-scoped mastery NOT transferred
    assert "binary_tree_inorder_traversal" not in state_os.mastered


def test_validator_graph_edge():
    graph = {"binary_tree_inorder_traversal": ["recursion"]}
    assert Validator.validate_prerequisite_edge(graph, "binary_tree_inorder_traversal", "recursion") is True
    assert Validator.validate_prerequisite_edge(graph, "binary_tree_inorder_traversal", "cpu_scheduling") is False


def test_validator_quote_provenance(tmp_path):
    corpus_file = tmp_path / "data_structures_notes.md"
    corpus_file.write_text("Recursion is a process in which a function calls itself directly or indirectly.")
    assert Validator.verify_quote_provenance(str(corpus_file), "Recursion is a process in which a function calls itself directly or indirectly.") is True
    assert Validator.verify_quote_provenance(str(corpus_file), "Unrelated text") is False


def test_human_escalation_pause_resume(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_3", "ds_101", "binary_tree_inorder_traversal")
    run_id = res["run_id"]

    if res["current_state"] == "PREREQ_SURVEY":
        survey_resp = {p["id"]: "yes" for p in res["prereq_survey_data"]["direct_prerequisites"]}
        res = controller.submit_prereq_survey(run_id, survey_resp)

    if res["current_state"] == "INITIAL_TEACHING":
        res = controller.begin_practice(run_id)

    # 3 consecutive wrong answers on deep prerequisites
    controller.submit_answer(run_id, "wrong answer 1 struct node definition")
    controller.submit_answer(run_id, "wrong answer 2 recursion stack")
    res_pause = controller.submit_answer(run_id, "wrong answer 3 pointers references")

    if res_pause["current_state"] == "WAITING_FOR_HUMAN":
        assert res_pause["current_state"] == "WAITING_FOR_HUMAN"
        res_resume = controller.resume_human_decision(run_id, "Provide human hint")
        assert res_resume["current_state"] == "PRACTICE"


if __name__ == "__main__":
    pytest.main(["-v", __file__])
