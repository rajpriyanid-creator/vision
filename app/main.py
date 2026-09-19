import sys
import os
import argparse

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from slice.controller import WorkflowController
from slice.state_manager import StateManager

def run_cli():
    print("=" * 75)
    print(" 🎓 VISION — Multi-Agent Adaptive Study & Prerequisite Debugger ")
    print("=" * 75)

    controller = WorkflowController()
    student_id = input("Enter Student ID [default: student_123]: ").strip() or "student_123"
    course_id = "ds_101"
    target_concept = "binary_tree_inorder_traversal"

    print(f"\nStarting study session for target concept: {target_concept}")
    res = controller.start_session(student_id, course_id, target_concept)
    run_id = res["run_id"]

    print(f"Session started! Run ID: {run_id}")
    print(f"\nQuestion: {res['exercise']['question_text']}")

    while True:
        answer = input("\nYour Answer (or 'exit' to quit): ").strip()
        if answer.lower() == "exit":
            print("Exiting session.")
            break

        res = controller.submit_answer(run_id, answer)
        state = res["current_state"]

        print(f"\nState Transition -> {state}")
        if "message" in res:
            print(f"Info: {res['message']}")

        if state == "PRACTICE":
            if "teaching_action" in res:
                print("\n--- GROUNDED RETEACHING LESSON ---")
                print(res["teaching_action"]["explanation_text"])
                print("-----------------------------------")
            print(f"\nNext Question: {res['exercise']['question_text']}")

        elif state == "WAITING_FOR_HUMAN":
            print("\n--- HUMAN INSTRUCTOR ESCALATION ---")
            print(res["human_question"]["question"])
            print("Options:")
            for i, opt in enumerate(res["human_question"]["options"], 1):
                print(f"  {i}. {opt}")
            choice = input("Enter decision choice [1-3]: ").strip()
            decision = res["human_question"]["options"][0] if choice != "2" else res["human_question"]["options"][1]
            res = controller.resume_human_decision(run_id, decision)
            print(f"\nResumed state: {res['current_state']}")
            if "exercise" in res:
                print(f"Question: {res['exercise']['question_text']}")

        elif state == "SESSION_COMPLETE":
            print("\n" + "=" * 75)
            print(f"SESSION COMPLETE! Status: {res.get('status', 'finished')}")
            print("=" * 75)
            break

def run_streamlit():
    import streamlit as st
    import graphviz

    st.set_page_config(
        page_title="VISION — Multi-Agent Adaptive Study Engine",
        page_icon="🎓",
        layout="wide",
        initial_sidebar_state="expanded"
    )

    # Custom styling
    st.markdown("""
        <style>
        .stApp {
            background-color: #0e1117;
            color: #ffffff;
        }
        .main-card {
            background-color: #1a1c24;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #2d313e;
            margin-bottom: 20px;
        }
        .agent-badge {
            background-color: #2e364f;
            color: #70a1ff;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.85em;
            font-weight: bold;
        }
        </style>
    """, unsafe_allow_html=True)

    st.title("🎓 VISION — Multi-Agent Adaptive Study & Prerequisite Debugger")
    st.markdown("##### *A Debugger for Learning — Identifying Root Causes Behind Student Misconceptions*")

    controller = WorkflowController()
    sm = StateManager()

    st.sidebar.header("⚙️ Engine & Model Configuration")

    api_provider = st.sidebar.selectbox("AI Model Provider", ["Google Gemini (Recommended)", "OpenRouter", "OpenAI", "Auto / Default"])
    
    gemini_key = st.sidebar.text_input("Gemini API Key (Optional)", type="password")
    if gemini_key:
        os.environ["GEMINI_API_KEY"] = gemini_key

    openrouter_key = st.sidebar.text_input("OpenRouter API Key (Optional)", type="password")
    if openrouter_key:
        os.environ["OPENROUTER_API_KEY"] = openrouter_key

    st.sidebar.divider()
    st.sidebar.header("👤 Learner Profile")
    student_id = st.sidebar.text_input("Student ID", value="student_123")
    target_concept = st.sidebar.selectbox("Target Concept", [
        "binary_tree_inorder_traversal",
        "pointers_references",
        "recursion_stack",
        "struct_node_definition"
    ])

    if "run_id" not in st.session_state:
        if st.sidebar.button("🚀 Start New Study Session", type="primary", use_container_width=True):
            res = controller.start_session(student_id, "ds_101", target_concept)
            st.session_state.run_id = res["run_id"]
            st.session_state.current_res = res
            st.rerun()

    if "run_id" in st.session_state:
        run_id = st.session_state.run_id
        res = st.session_state.current_res

        col1, col2 = st.columns([1.8, 1.2])

        with col1:
            st.markdown(f"### 📍 Current State: `{res['current_state']}`")

            if "message" in res:
                st.info(f"💡 **Controller Status:** {res['message']}")

            if res["current_state"] == "PRACTICE":
                if "teaching_action" in res:
                    st.markdown("<div class='main-card'>", unsafe_allow_html=True)
                    st.markdown("### 📚 Grounded Reteaching Lesson")
                    st.markdown(res["teaching_action"]["explanation_text"])
                    st.caption(f"📌 Grounded Evidence Citation: `{res['teaching_action']['evidence_ref']}`")
                    st.markdown("</div>", unsafe_allow_html=True)

                st.markdown("<div class='main-card'>", unsafe_allow_html=True)
                st.markdown("### ❓ Targeted Assessment Question")
                st.write(f"**{res['exercise']['question_text']}**")

                ans = st.text_area("Your Response / Answer:", height=100)
                if st.button("Submit Answer ➔", type="primary"):
                    if ans:
                        next_res = controller.submit_answer(run_id, ans)
                        st.session_state.current_res = next_res
                        st.rerun()
                st.markdown("</div>", unsafe_allow_html=True)

            elif res["current_state"] == "WAITING_FOR_HUMAN":
                st.error("⚠️ Escalated to WAITING_FOR_HUMAN (Human Instructor Loop Required)")
                st.write(res["human_question"]["question"])
                opt = st.radio("Human Decision Options:", res["human_question"]["options"])
                if st.button("Submit Human Decision & Resume"):
                    next_res = controller.resume_human_decision(run_id, opt)
                    st.session_state.current_res = next_res
                    st.rerun()

            elif res["current_state"] == "SESSION_COMPLETE":
                st.balloons()
                st.success(f"🎉 Session Complete! Status: {res.get('status', 'completed')}")

        with col2:
            st.markdown("### 📊 State Machine Topology")
            dot = graphviz.Digraph(comment='VISION Workflow')
            dot.attr(rankdir='TB', size='8,5')

            states = ["START_STUDY", "PRACTICE", "EVALUATE", "DIAGNOSE_GAP", "RETEACH_PREREQ", "TARGET_MASTERED"]
            for s in states:
                if s == res["current_state"]:
                    dot.node(s, s, style='filled', color='#00b894', fontcolor='white')
                else:
                    dot.node(s, s, style='filled', color='#2d3436', fontcolor='white')

            dot.edge("START_STUDY", "PRACTICE")
            dot.edge("PRACTICE", "EVALUATE")
            dot.edge("EVALUATE", "TARGET_MASTERED", label="pass")
            dot.edge("EVALUATE", "DIAGNOSE_GAP", label="fail")
            dot.edge("DIAGNOSE_GAP", "RETEACH_PREREQ")
            dot.edge("RETEACH_PREREQ", "PRACTICE")

            st.graphviz_chart(dot, use_container_width=True)

            st.divider()
            st.markdown("### 🕵️ Agent Trajectory Log")
            handoffs = sm.get_handoffs(run_id)
            for h in handoffs:
                with st.expander(f"🔹 {h['from_agent']} ➔ {h['to_agent']} ({h['action']})", expanded=False):
                    st.write(f"**Reasoning:** {h['reason']}")
                    st.caption(f"Inputs: `{h['input_record_refs']}` | Outputs: `{h['output_record_refs']}`")

            st.divider()
            st.markdown("### 🧠 Learner Profile State")
            p_state = sm.get_or_create_student_state(student_id, "ds_101")
            st.write(f"**Mastered Concepts:** `{p_state.mastered}`")
            st.write(f"**Weak Concepts:** `{p_state.weak}`")
            st.write(f"**Successful Modes:** `{p_state.successful_modes}`")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--cli", action="store_true", help="Run in CLI mode")
    args = parser.parse_args()

    if args.cli:
        run_cli()
    else:
        try:
            run_streamlit()
        except Exception:
            run_cli()
