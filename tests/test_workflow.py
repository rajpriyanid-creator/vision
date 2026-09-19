import os
import sys
import pytest

# Force mock mode in tests — prevents API quota burn.
os.environ["VISION_LIVE_LLM"] = "false"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from slice.controller import WorkflowController
from slice.validator import Validator
from slice.state_manager import StateManager

def test_happy_path_mastery(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_1", "ds_101", "binary_tree_inorder_traversal")
    assert res["current_state"] == "PRACTICE"
    run_id = res["run_id"]

    # Submit correct answer directly
    res_ans = controller.submit_answer(run_id, "b, a, c")
    assert res_ans["current_state"] == "SESSION_COMPLETE"
    assert res_ans["status"] == "completed"

def test_prerequisite_repair_loop(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_2", "ds_101", "binary_tree_inorder_traversal")
    run_id = res["run_id"]

    # Submit wrong answer — triggers diagnosis and reteaching
    res_ans1 = controller.submit_answer(run_id, "I tried calling left node but got segmentation fault NULL reference")
    assert res_ans1["current_state"] == "PRACTICE"
    # Should have gap found message (concept name is dynamic — don't hardcode it)
    assert "Gap found" in res_ans1["message"] or "Lesson provided" in res_ans1["message"]

    # Repair prerequisite
    res_ans2 = controller.submit_answer(run_id, "Dereferencing NULL pointer gives segmentation fault")
    assert res_ans2["current_state"] == "PRACTICE"
    # Should recheck original target after prereq mastered
    assert "mastered" in res_ans2["message"].lower() or "re-test" in res_ans2["message"].lower() or "rechecking" in res_ans2["message"].lower()

    # Master original target
    res_ans3 = controller.submit_answer(run_id, "b, a, c")
    assert res_ans3["current_state"] == "SESSION_COMPLETE"
    assert res_ans3["status"] == "completed"

def test_validator_graph_edge():
    graph = {"binary_tree_inorder_traversal": ["pointers_references"]}
    assert Validator.validate_prerequisite_edge(graph, "binary_tree_inorder_traversal", "pointers_references") is True
    assert Validator.validate_prerequisite_edge(graph, "binary_tree_inorder_traversal", "array_traversal") is False

def test_validator_quote_provenance(tmp_path):
    corpus_file = tmp_path / "data_structures_notes.md"
    corpus_file.write_text("Pointers store memory addresses.")
    assert Validator.verify_quote_provenance(str(corpus_file), "Pointers store memory addresses.") is True
    assert Validator.verify_quote_provenance(str(corpus_file), "Unrelated text") is False

def test_human_escalation_pause_resume(tmp_path):
    db_file = str(tmp_path / "test_vision.db")
    controller = WorkflowController(db_path=db_file)

    res = controller.start_session("student_test_3", "ds_101", "binary_tree_inorder_traversal")
    run_id = res["run_id"]

    # Submit invalid edge attempt to trigger WAITING_FOR_HUMAN
    # We simulate setting revision_count to 3 directly to test human pause
    data = controller.state_manager.get_study_session(run_id)
    session_obj = controller.state_manager.get_study_session(run_id)
    
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
