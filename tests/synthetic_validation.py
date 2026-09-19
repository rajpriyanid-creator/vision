import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from slice.state_manager import DiagnosticValidationCase, Attempt, CourseContext
from agents.diagnostic import DiagnosticAgent
from slice.validator import Validator

def get_synthetic_test_cases():
    return [
        DiagnosticValidationCase(
            case_id="case_01",
            concept="binary_tree_inorder_traversal",
            student_answer="I tried calling left node but got segmentation fault NULL reference",
            expected_gap="pointers_references",
            expected_status="unresolved",
            category="prerequisite_gap"
        ),
        DiagnosticValidationCase(
            case_id="case_02",
            concept="binary_tree_inorder_traversal",
            student_answer="Function crashes with stack overflow on large tree",
            expected_gap="recursion_stack",
            expected_status="unresolved",
            category="prerequisite_gap"
        ),
        DiagnosticValidationCase(
            case_id="case_03",
            concept="binary_tree_inorder_traversal",
            student_answer="I don't know where left and right pointers are declared in struct",
            expected_gap="struct_node_definition",
            expected_status="unresolved",
            category="prerequisite_gap"
        ),
        DiagnosticValidationCase(
            case_id="case_04",
            concept="binary_tree_inorder_traversal",
            student_answer="b, a, c",
            expected_gap="binary_tree_inorder_traversal",
            expected_status="demonstrated",
            category="careless"
        ),
        DiagnosticValidationCase(
            case_id="case_05",
            concept="binary_tree_inorder_traversal",
            student_answer="maybe visit root first or something",
            expected_gap="binary_tree_inorder_traversal",
            expected_status="uncertain",
            category="ambiguous"
        ),
        DiagnosticValidationCase(
            case_id="case_06",
            concept="binary_tree_inorder_traversal",
            student_answer="Traverse array from index 0 to N-1",
            expected_gap="array_traversal",
            expected_status="unresolved",
            category="invalid_edge"
        ),
        DiagnosticValidationCase(
            case_id="case_07",
            concept="pointers_references",
            student_answer="Dereferencing NULL pointer gives data value 0",
            expected_gap="pointers_references",
            expected_status="unresolved",
            category="misconception"
        ),
        DiagnosticValidationCase(
            case_id="case_08",
            concept="recursion_stack",
            student_answer="Base case is optional in recursive function",
            expected_gap="recursion_stack",
            expected_status="unresolved",
            category="misconception"
        ),
        DiagnosticValidationCase(
            case_id="case_09",
            concept="struct_node_definition",
            student_answer="Node struct has 5 pointer variables for children",
            expected_gap="struct_node_definition",
            expected_status="unresolved",
            category="misconception"
        ),
        DiagnosticValidationCase(
            case_id="case_10",
            concept="binary_tree_inorder_traversal",
            student_answer="Left, root, right sequence",
            expected_gap="binary_tree_inorder_traversal",
            expected_status="demonstrated",
            category="careless"
        ),
        DiagnosticValidationCase(
            case_id="case_11",
            concept="pointers_references",
            student_answer="Pointers store memory address of variable",
            expected_gap="pointers_references",
            expected_status="demonstrated",
            category="careless"
        ),
        DiagnosticValidationCase(
            case_id="case_12",
            concept="recursion_stack",
            student_answer="Stack pushes frame on each call until base case",
            expected_gap="recursion_stack",
            expected_status="demonstrated",
            category="careless"
        ),
        DiagnosticValidationCase(
            case_id="case_13",
            concept="binary_tree_inorder_traversal",
            student_answer="unsure",
            expected_gap="binary_tree_inorder_traversal",
            expected_status="uncertain",
            category="ambiguous"
        ),
        DiagnosticValidationCase(
            case_id="case_14",
            concept="binary_tree_inorder_traversal",
            student_answer="null pointer exception when accessing left child struct field",
            expected_gap="pointers_references",
            expected_status="unresolved",
            category="prerequisite_gap"
        ),
        DiagnosticValidationCase(
            case_id="case_15",
            concept="binary_tree_inorder_traversal",
            student_answer="recursion base case missing in recursive helper",
            expected_gap="recursion_stack",
            expected_status="unresolved",
            category="prerequisite_gap"
        )
    ]

def run_diagnostic_validation():
    print("=" * 70)
    print(" RUNNING SYNTHETIC DIAGNOSTIC VALIDATION BENCHMARK (15 SCENARIOS) ")
    print("=" * 70)

    cases = get_synthetic_test_cases()
    diagnostic_agent = DiagnosticAgent()
    validator = Validator()

    course_context = CourseContext(
        course_id="ds_101",
        course_name="Data Structures 101",
        concepts=["binary_tree_inorder_traversal", "pointers_references", "recursion_stack", "struct_node_definition", "array_traversal"],
        dependency_graph={
            "binary_tree_inorder_traversal": ["pointers_references", "recursion_stack", "struct_node_definition"],
            "pointers_references": [],
            "recursion_stack": [],
            "struct_node_definition": ["pointers_references"],
            "array_traversal": []
        },
        source_ids=["data_structures_notes.md"]
    )

    passed_count = 0

    for case in cases:
        attempt = Attempt(
            run_id="synth_run",
            concept=case.concept,
            question="Synthetic Test Question",
            student_answer=case.student_answer
        )
        hypo = diagnostic_agent.diagnose_gap(attempt, course_context)

        is_valid_edge = validator.validate_prerequisite_edge(
            course_context.dependency_graph,
            case.concept,
            hypo.candidate_prerequisite
        )

        match = (hypo.candidate_prerequisite == case.expected_gap)
        if match or (case.category == "invalid_edge" and not is_valid_edge):
            status_str = "PASS"
            passed_count += 1
        else:
            status_str = "FAIL"

        print(f"[{case.case_id}] {case.category.upper():<16} | Exp: {case.expected_gap:<25} | Predicted: {hypo.candidate_prerequisite:<25} | Result: {status_str}")

    accuracy = (passed_count / len(cases)) * 100
    print("-" * 70)
    print(f"Diagnostic Accuracy Benchmark: {passed_count}/{len(cases)} ({accuracy:.1f}%)")
    print("=" * 70)
    return accuracy

if __name__ == "__main__":
    run_diagnostic_validation()
