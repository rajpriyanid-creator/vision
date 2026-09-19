"""
VISION Evaluation Harness — Benchmark runner for Diagnostic and Evaluation Agents.
Loads 15-20 formal diagnostic cases and measures:
  - Evaluation Classification Accuracy (demonstrated, unresolved, uncertain)
  - Prerequisite Gap Identification Accuracy
  - Graph Edge Safety Enforcement Rate
Outputs exact, non-fabricated metrics.
"""

from __future__ import annotations
import json
import os
import sys
from pathlib import Path

# Add project root to sys.path
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from slice.state_manager import Attempt, CourseContext
from slice.validator import Validator
from agents.diagnostic import DiagnosticAgent
from agents.evaluation import EvaluationAgent


def run_benchmark():
    cases_path = Path(__file__).parent / "diagnostic_cases.json"
    if not cases_path.exists():
        print(f"Error: {cases_path} not found.")
        sys.exit(1)

    cases = json.loads(cases_path.read_text(encoding="utf-8"))
    diagnostic_agent = DiagnosticAgent()
    evaluation_agent = EvaluationAgent()
    validator = Validator()

    # Load CourseContext DAGs
    domain_graph_path = ROOT / "domain" / "prerequisite_graph.json"
    graph_data = json.loads(domain_graph_path.read_text(encoding="utf-8"))
    nodes = graph_data.get("nodes", [])
    dag = {n["id"]: n.get("prerequisites", []) for n in nodes}

    course_context = CourseContext(
        course_id="data_structures",
        course_name="Data Structures & Algorithms",
        concepts=list(dag.keys()),
        dependency_graph=dag,
        source_ids=["data_structures_notes.md"]
    )

    total = len(cases)
    correct_eval = 0
    correct_gap = 0
    edge_safe = 0

    print("=" * 70)
    print(f"  VISION DIAGNOSTIC BENCHMARK HARNESS — {total} VALIDATION CASES")
    print("=" * 70)

    for case in cases:
        c_id = case["case_id"]
        concept = case["concept"]
        answer = case["student_answer"]
        exp_status = case["expected_status"]
        exp_gap = case["expected_gap"]
        cat = case["category"]

        attempt = Attempt(
            run_id=f"run_eval_{c_id}",
            concept=concept,
            question=f"Explain {concept.replace('_', ' ')}.",
            student_answer=answer
        )

        # 1. Evaluate Attempt
        eval_res = evaluation_agent.evaluate_attempt(attempt)
        status_match = eval_res.status == exp_status
        if status_match:
            correct_eval += 1

        # 2. Diagnose Gap if unresolved or uncertain
        gap = diagnostic_agent.diagnose_gap(attempt, course_context)
        gap_match = gap.candidate_prerequisite == exp_gap or (exp_status == "demonstrated" and gap.candidate_prerequisite == concept)
        if gap_match:
            correct_gap += 1

        # 3. Check Prerequisite Graph Edge Safety
        if gap.candidate_prerequisite != concept:
            is_valid_edge = validator.validate_prerequisite_edge(dag, concept, gap.candidate_prerequisite)
            if is_valid_edge:
                edge_safe += 1
        else:
            edge_safe += 1

        print(f"[{c_id}] Category: {cat:<24} Eval: {eval_res.status:<12} (Exp: {exp_status:<12}) Gap: {gap.candidate_prerequisite}")

    eval_acc = (correct_eval / total) * 100
    gap_acc = (correct_gap / total) * 100
    safety_rate = (edge_safe / total) * 100

    print("=" * 70)
    print("  BENCHMARK SUMMARY RESULTS")
    print("=" * 70)
    print(f"  Total Validation Cases:           {total}")
    print(f"  Evaluation Status Accuracy:       {correct_eval}/{total} ({eval_acc:.1f}%)")
    print(f"  Prerequisite Gap Accuracy:        {correct_gap}/{total} ({gap_acc:.1f}%)")
    print(f"  Graph Edge Safety Rate:           {edge_safe}/{total} ({safety_rate:.1f}%)")
    print("=" * 70)

    return {
        "total_cases": total,
        "correct_eval": correct_eval,
        "correct_gap": correct_gap,
        "edge_safe": edge_safe,
        "eval_acc": eval_acc,
        "gap_acc": gap_acc,
        "safety_rate": safety_rate
    }


if __name__ == "__main__":
    run_benchmark()
