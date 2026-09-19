"""
VISION — World-class Streamlit Dashboard for Multi-Agent Adaptive Learning.
Features:
- Zero hardcoding: any subject, any concept at runtime
- Live Gemini-powered multi-agent reasoning
- Beautiful dark UI with state machine visualization
- Real-time agent handoff trace
- Full learner profile tracking
"""

import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import streamlit as st
import graphviz
from slice.controller import WorkflowController
from slice.state_manager import StateManager
from slice.llm_client import LLMClient

# ─── Page Config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="VISION — AI Adaptive Study Engine",
    page_icon="🎓",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ─── Styling ───────────────────────────────────────────────────────────────────
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

.stApp { background: #0a0c14; }

/* Sidebar */
section[data-testid="stSidebar"] {
    background: linear-gradient(180deg, #0d1117 0%, #0f1321 100%);
    border-right: 1px solid #1e2736;
}

/* Main card */
.vision-card {
    background: linear-gradient(135deg, #0f1422 0%, #131928 100%);
    border: 1px solid #1e2d45;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 16px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.4);
}

.vision-card-accent {
    background: linear-gradient(135deg, #0a1628 0%, #0e1f35 100%);
    border: 1px solid #1a3a5c;
    border-radius: 16px;
    padding: 24px;
    margin-bottom: 16px;
}

/* State badge */
.state-badge {
    display: inline-block;
    background: linear-gradient(90deg, #1a73e8, #0d47a1);
    color: white;
    padding: 6px 16px;
    border-radius: 20px;
    font-size: 0.85rem;
    font-weight: 600;
    letter-spacing: 0.05em;
}

/* Agent chip */
.agent-chip {
    display: inline-block;
    background: rgba(26, 115, 232, 0.15);
    border: 1px solid rgba(26, 115, 232, 0.4);
    color: #70b0ff;
    padding: 3px 10px;
    border-radius: 12px;
    font-size: 0.78rem;
    font-weight: 500;
    margin: 2px;
}

/* Lesson box */
.lesson-box {
    background: linear-gradient(135deg, #0a1f0a 0%, #0d2a0d 100%);
    border: 1px solid #1a5c1a;
    border-left: 4px solid #2ecc71;
    border-radius: 12px;
    padding: 20px;
    margin: 12px 0;
}

/* Question box */
.question-box {
    background: linear-gradient(135deg, #0f1a2e 0%, #0a1528 100%);
    border: 1px solid #1a3a6e;
    border-left: 4px solid #1a73e8;
    border-radius: 12px;
    padding: 20px;
    margin: 12px 0;
}

/* Warning box */
.warning-box {
    background: linear-gradient(135deg, #1a1000 0%, #2a1800 100%);
    border: 1px solid #5c3a00;
    border-left: 4px solid #f39c12;
    border-radius: 12px;
    padding: 20px;
    margin: 12px 0;
}

/* Success box */
.success-box {
    background: linear-gradient(135deg, #001a0d 0%, #002a14 100%);
    border: 1px solid #00521e;
    border-left: 4px solid #00e676;
    border-radius: 12px;
    padding: 24px;
    margin: 12px 0;
    text-align: center;
}

/* Metric pill */
.metric-pill {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    padding: 8px 14px;
    margin: 4px;
    display: inline-block;
    font-size: 0.82rem;
}

/* Handoff entry */
.handoff-entry {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    padding: 10px 14px;
    margin: 4px 0;
    font-size: 0.82rem;
}

/* Hide Streamlit branding */
#MainMenu, footer { visibility: hidden; }

/* Input */
.stTextArea textarea {
    background: #0f1422 !important;
    border: 1px solid #1e2d45 !important;
    border-radius: 10px !important;
    color: #e0e6f0 !important;
    font-family: 'Inter', sans-serif !important;
}

/* Buttons */
.stButton > button {
    background: linear-gradient(90deg, #1a73e8, #1557b0) !important;
    color: white !important;
    border: none !important;
    border-radius: 10px !important;
    font-weight: 600 !important;
    letter-spacing: 0.04em !important;
    transition: all 0.2s ease !important;
}
.stButton > button:hover {
    background: linear-gradient(90deg, #2185f4, #1a6ad4) !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 4px 16px rgba(26,115,232,0.4) !important;
}
</style>
""", unsafe_allow_html=True)


# ─── Header ───────────────────────────────────────────────────────────────────
col_logo, col_title = st.columns([1, 8])
with col_logo:
    st.markdown("<h1 style='font-size:2.5rem;margin:0;padding-top:8px'>🎓</h1>", unsafe_allow_html=True)
with col_title:
    st.markdown("""
    <h1 style='margin:0;font-size:1.8rem;font-weight:700;
        background:linear-gradient(90deg,#70b0ff,#1a73e8);
        -webkit-background-clip:text;-webkit-text-fill-color:transparent;'>
        VISION — Multi-Agent Adaptive Study Engine
    </h1>
    <p style='margin:2px 0 0;color:#5a7a9a;font-size:0.9rem;'>
        A debugger for learning • Powered by Gemini AI • Any subject, any concept
    </p>
    """, unsafe_allow_html=True)

st.divider()


# ─── Sidebar ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.markdown("### ⚙️ Configuration")

    gemini_key_input = st.text_input(
        "Gemini API Key",
        value=os.getenv("GEMINI_API_KEY", ""),
        type="password",
        help="Your Google Gemini API key"
    )
    if gemini_key_input:
        os.environ["GEMINI_API_KEY"] = gemini_key_input
        LLMClient._instance = None

    # ── Live Model Picker ─────────────────────────────────────────────────────
    st.divider()
    st.markdown("### 🤖 AI Model")

    # Fetch available models (cached in session so it only calls API once)
    if "available_models" not in st.session_state:
        _tmp_client = LLMClient()
        _raw_models = _tmp_client.list_models()
        if _raw_models:
            st.session_state.available_models = _raw_models
        else:
            # Curated fallback list of known top models
            st.session_state.available_models = [
                {"id": "gemini-3.8-flash",        "display": "Gemini 3.8 Flash 🔥 (fastest)"},
                {"id": "gemini-3.7-flash",        "display": "Gemini 3.7 Flash"},
                {"id": "gemini-3.6-flash",        "display": "Gemini 3.6 Flash"},
                {"id": "gemini-3.5-flash",        "display": "Gemini 3.5 Flash"},
                {"id": "gemini-3.1-pro-preview",  "display": "Gemini 3.1 Pro Preview 🧠 (smartest)"},
                {"id": "gemini-3-flash-preview",  "display": "Gemini 3 Flash Preview"},
                {"id": "gemini-2.5-pro",          "display": "Gemini 2.5 Pro"},
                {"id": "gemini-2.5-flash",        "display": "Gemini 2.5 Flash"},
                {"id": "gemini-flash-latest",     "display": "Gemini Flash Latest"},
            ]

    all_models = st.session_state.available_models

    # Tier labels
    TIER_LABELS = {
        "3.8": "⚡ Latest",
        "3.7": "⚡ Latest",
        "3.6": "⚡ Latest",
        "3.5": "🔥 Fast",
        "3.1-pro": "🧠 Pro",
        "3.1-flash": "🔥 Fast",
        "3-flash": "🔥 Fast",
        "3-pro": "🧠 Pro",
        "2.5-pro": "🧠 Smart",
        "2.5-flash": "⚡ Balanced",
        "omni": "🌐 Omni",
    }
    def _tier_label(mid: str) -> str:
        for key, label in TIER_LABELS.items():
            if key in mid:
                return label
        return "✨"

    display_options = [
        f"{_tier_label(m['id'])}  {m['display']}" for m in all_models
    ]
    model_ids = [m["id"] for m in all_models]

    # Default to gemini-3.8-flash if available
    default_idx = 0
    current_env_model = os.getenv("SLICE_MODEL", "gemini-3.8-flash")
    if current_env_model in model_ids:
        default_idx = model_ids.index(current_env_model)
    elif any("3.8" in mid for mid in model_ids):
        default_idx = next(i for i, mid in enumerate(model_ids) if "3.8" in mid)

    selected_idx = st.selectbox(
        "Primary Model (all agents)",
        options=range(len(display_options)),
        format_func=lambda i: display_options[i],
        index=default_idx,
        key="selected_model_idx",
        help="All 6 VISION agents will use this model"
    )
    selected_model_id = model_ids[selected_idx]

    # Escalation model for deep reasoning (Diagnostic + Supervisor DAG)
    pro_models = [m for m in all_models if "pro" in m["id"]] or all_models
    escalation_options = [f"🧠  {m['display']}" for m in pro_models]
    escalation_ids = [m["id"] for m in pro_models]
    esc_default = 0
    current_esc = os.getenv("SLICE_ESCALATION_MODEL", "gemini-2.5-pro")
    if current_esc in escalation_ids:
        esc_default = escalation_ids.index(current_esc)

    esc_idx = st.selectbox(
        "Escalation Model (Diagnostic + DAG)",
        options=range(len(escalation_options)),
        format_func=lambda i: escalation_options[i],
        index=esc_default,
        key="selected_escalation_idx",
        help="Used for deeper reasoning: prerequisite graph generation & gap diagnosis"
    )
    escalation_model_id = escalation_ids[esc_idx]

    # Apply model selection
    if selected_model_id != os.getenv("SLICE_MODEL"):
        os.environ["SLICE_MODEL"] = selected_model_id
        LLMClient._instance = None
    if escalation_model_id != os.getenv("SLICE_ESCALATION_MODEL"):
        os.environ["SLICE_ESCALATION_MODEL"] = escalation_model_id

    st.caption(f"**Primary:** `{selected_model_id}`")
    st.caption(f"**Escalation:** `{escalation_model_id}`")

    st.divider()
    st.markdown("### 👤 Learner")
    student_id = st.text_input("Student ID", value="student_001")

    st.divider()
    st.markdown("### 🎯 What to Learn")

    subject = st.text_input(
        "Subject / Domain",
        value="",
        placeholder="e.g. Physics, Python, Economics, Medicine...",
        help="Enter any subject or field of study"
    )

    target_concept = st.text_input(
        "Target Concept",
        value="",
        placeholder="e.g. Newton's Second Law, recursion, supply and demand...",
        help="The specific concept the student wants to master"
    )

    st.divider()

    if "run_id" not in st.session_state:
        can_start = bool(student_id and subject and target_concept)
        start_btn = st.button(
            "🚀 Start Adaptive Study Session",
            type="primary",
            disabled=not can_start,
            use_container_width=True
        )
        if not can_start:
            st.caption("Fill in Subject and Target Concept above to start.")

        if start_btn and can_start:
            with st.spinner(f"🤖 Gemini is building your personalized DAG for **{target_concept}**..."):
                ctrl = WorkflowController()
                res = ctrl.start_session(student_id, subject, target_concept)
                st.session_state.run_id = res["run_id"]
                st.session_state.res = res
                st.session_state.ctrl = ctrl
                st.session_state.sm = StateManager()
            st.rerun()
    else:
        if st.button("🔄 New Session", use_container_width=True):
            for k in ["run_id", "res", "ctrl", "sm"]:
                st.session_state.pop(k, None)
            st.rerun()

        st.divider()
        st.markdown("### 📊 Session Info")
        if "res" in st.session_state:
            s = st.session_state.res.get("session", {})
            st.markdown(f"""
            <div class='metric-pill'>📞 Calls: {s.get('call_count', 0)}/20</div>
            <div class='metric-pill'>🔄 Revisions: {s.get('revision_count', 0)}/3</div>
            <div class='metric-pill'>📍 {s.get('current_state', '—')}</div>
            """, unsafe_allow_html=True)


# ─── No Session Yet ────────────────────────────────────────────────────────────
if "run_id" not in st.session_state:
    st.markdown("""
    <div class='vision-card' style='text-align:center;padding:60px 40px;'>
        <div style='font-size:4rem;margin-bottom:16px;'>🧠</div>
        <h2 style='color:#70b0ff;font-size:1.6rem;margin-bottom:12px;'>
            Start Learning Anything, Deeply.
        </h2>
        <p style='color:#5a7a9a;font-size:1rem;max-width:520px;margin:0 auto 24px;line-height:1.7;'>
            VISION identifies <em>why</em> you're struggling — not just what you got wrong.
            It traces misconceptions back to root-cause prerequisite gaps and teaches those first.
        </p>
        <div style='display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-top:24px;'>
            <span class='agent-chip'>🔍 Diagnostic Agent</span>
            <span class='agent-chip'>📚 Resource Agent</span>
            <span class='agent-chip'>🎓 Tutor Agent</span>
            <span class='agent-chip'>✏️ Exercise Agent</span>
            <span class='agent-chip'>📊 Evaluation Agent</span>
            <span class='agent-chip'>🧭 Supervisor Agent</span>
        </div>
        <p style='color:#3a5a7a;font-size:0.85rem;margin-top:28px;'>
            Enter your subject and concept in the sidebar to begin →
        </p>
    </div>
    """, unsafe_allow_html=True)
    st.stop()


# ─── Active Session ────────────────────────────────────────────────────────────
ctrl: WorkflowController = st.session_state.ctrl
sm: StateManager = st.session_state.sm
run_id: str = st.session_state.run_id
res: dict = st.session_state.res

col_main, col_sidebar = st.columns([1.8, 1.2])

# ═════════════════════════════ LEFT: Main Panel ═══════════════════════════════
with col_main:
    session_data = res.get("session", {})
    state = res["current_state"]

    # ── State header
    subject_display = res.get("subject", "")
    concept_display = res.get("target_concept", "")
    st.markdown(f"""
    <div style='margin-bottom:16px;'>
        <span class='state-badge'>📍 {state}</span>
        <span style='color:#5a7a9a;font-size:0.85rem;margin-left:12px;'>
            {subject_display} → <strong style='color:#70b0ff;'>{concept_display}</strong>
        </span>
    </div>
    """, unsafe_allow_html=True)

    # ── SESSION COMPLETE
    if state == "SESSION_COMPLETE":
        is_mastered = res.get("status") == "completed"
        if is_mastered:
            st.markdown(f"""
            <div class='success-box'>
                <div style='font-size:3rem;margin-bottom:12px;'>🏆</div>
                <h2 style='color:#00e676;font-size:1.6rem;margin-bottom:8px;'>Concept Mastered!</h2>
                <p style='color:#80cfa9;font-size:1rem;'>{res.get('message', '')}</p>
                <p style='color:#5a8a6a;font-size:0.85rem;margin-top:16px;'>
                    Calls used: {session_data.get('call_count', 0)}/20 •
                    Prerequisite levels: {session_data.get('revision_count', 0)}
                </p>
            </div>
            """, unsafe_allow_html=True)
            st.balloons()
        else:
            st.markdown(f"""
            <div class='warning-box'>
                <h3 style='color:#f39c12;'>Session Ended</h3>
                <p style='color:#c9a050;'>{res.get('message', 'Session complete.')}</p>
            </div>
            """, unsafe_allow_html=True)
        st.stop()

    # ── WAITING FOR HUMAN
    elif state == "WAITING_FOR_HUMAN":
        hq = res.get("human_question", {})
        st.markdown(f"""
        <div class='warning-box'>
            <h3 style='color:#f39c12;margin-top:0;'>⚠️ Human Instructor Loop Activated</h3>
            <p style='color:#d4a050;'>{hq.get('question', '')}</p>
        </div>
        """, unsafe_allow_html=True)

        if "teaching_action" in res:
            with st.expander("📚 Last Lesson Delivered", expanded=False):
                st.markdown(res["teaching_action"]["explanation_text"])

        choice = st.radio("Instructor Decision:", hq.get("options", ["Continue"]))
        if st.button("✅ Submit Decision & Resume Session", type="primary"):
            with st.spinner("Resuming..."):
                new_res = ctrl.resume_human_decision(run_id, choice)
                st.session_state.res = new_res
            st.rerun()

    # ── PRACTICE (main state)
    elif state == "PRACTICE":
        # Show message
        if "message" in res:
            msg = res["message"]
            if "✅" in msg:
                st.success(msg)
            elif "🔍" in msg:
                st.info(msg)
            elif "🤔" in msg:
                st.warning(msg)

        # Show evaluation reasoning if available
        if "evaluation" in res:
            ev = res["evaluation"]
            with st.expander(f"📋 Last Evaluation: `{ev['status'].upper()}`", expanded=False):
                st.markdown(f"**Reasoning:** {ev['reasoning']}")
                st.caption(f"Recommendation: {ev['next_recommendation']}")

        # Show gap diagnosis if available
        if "gap_hypothesis" in res:
            gh = res["gap_hypothesis"]
            with st.expander(f"🔍 Diagnostic Result — Gap: `{gh['candidate_prerequisite']}`", expanded=False):
                st.markdown(f"**Confidence:** {gh['confidence']*100:.0f}%")
                st.markdown(f"**Evidence:** {gh['evidence_refs'][0] if gh['evidence_refs'] else '—'}")

        # Reteaching lesson
        if "teaching_action" in res:
            ta = res["teaching_action"]
            st.markdown(f"""
            <div class='lesson-box'>
                <div style='color:#2ecc71;font-weight:600;margin-bottom:12px;font-size:0.9rem;'>
                    📚 GROUNDED LESSON — Mode: <code>{ta['teaching_mode']}</code>
                </div>
            """, unsafe_allow_html=True)
            st.markdown(ta["explanation_text"])
            st.markdown(f"""
                <div style='color:#1a5c2a;font-size:0.78rem;margin-top:12px;border-top:1px solid #1a5c2a;padding-top:8px;'>
                    📌 Source: <code>{ta['evidence_ref']}</code>
                </div>
            </div>
            """, unsafe_allow_html=True)

        # Assessment question
        ex = res.get("exercise", {})
        if ex:
            st.markdown(f"""
            <div class='question-box'>
                <div style='color:#1a73e8;font-weight:600;margin-bottom:12px;font-size:0.9rem;'>
                    ❓ ASSESSMENT QUESTION
                </div>
                <p style='color:#e0e6f0;font-size:1.05rem;line-height:1.6;margin:0;'>
                    {ex.get('question_text', '')}
                </p>
                <div style='color:#1a3a6e;font-size:0.76rem;margin-top:10px;'>
                    Concept: <code>{ex.get('concept', '')}</code> •
                    Type: <code>{ex.get('exercise_type', '')}</code>
                </div>
            </div>
            """, unsafe_allow_html=True)

        st.markdown("### ✍️ Your Answer")
        answer = st.text_area(
            "Type your response:",
            height=120,
            placeholder="Type your answer here...",
            label_visibility="collapsed"
        )

        col_submit, col_hint = st.columns([3, 1])
        with col_submit:
            submit = st.button("Submit Answer →", type="primary", use_container_width=True)
        with col_hint:
            if st.button("💡 I'm stuck", use_container_width=True):
                with st.spinner("Generating hint..."):
                    new_res = ctrl.submit_answer(run_id, "I'm not sure, can you give me a hint?")
                    st.session_state.res = new_res
                st.rerun()

        if submit and answer.strip():
            with st.spinner("🤖 Gemini is evaluating your answer..."):
                new_res = ctrl.submit_answer(run_id, answer)
                st.session_state.res = new_res
            st.rerun()
        elif submit:
            st.warning("Please write an answer before submitting.")


# ═════════════════════════════ RIGHT: Sidebar Panel ══════════════════════════
with col_sidebar:

    # ── State Machine Visualization
    st.markdown("### 🗺️ State Machine")
    current_state = res.get("session", {}).get("current_state", "PRACTICE")
    dot = graphviz.Digraph(comment="VISION", engine="dot")
    dot.attr(
        bgcolor="#0a0c14", rankdir="TB", size="5,8",
        fontcolor="white", fontname="Inter"
    )
    dot.attr("node", shape="box", style="rounded,filled", fontname="Inter",
             fontsize="9", penwidth="1.5")
    dot.attr("edge", color="#2d4a6e", fontcolor="#5a7a9a", fontsize="8", fontname="Inter")

    STATES_COMPACT = [
        ("START_STUDY", "START"),
        ("PRACTICE", "PRACTICE"),
        ("EVALUATE", "EVALUATE"),
        ("TIE_BREAKER", "TIE BREAKER"),
        ("DIAGNOSE_GAP", "DIAGNOSE"),
        ("VALIDATE_HYPOTHESIS", "VALIDATE"),
        ("SELECT_RESOURCE", "GET RESOURCE"),
        ("RETEACH_PREREQ", "RETEACH"),
        ("GENERATE_EXERCISE", "GEN EXERCISE"),
        ("RECHECK_ORIGINAL", "RECHECK"),
        ("WAITING_FOR_HUMAN", "HUMAN LOOP"),
        ("SESSION_COMPLETE", "COMPLETE"),
    ]

    for sid, slabel in STATES_COMPACT:
        if sid == current_state:
            dot.node(sid, slabel, fillcolor="#1a73e8", fontcolor="white", color="#5b9ff0")
        elif sid in ("SESSION_COMPLETE", "TARGET_MASTERED"):
            dot.node(sid, slabel, fillcolor="#1a3a1a", fontcolor="#2ecc71", color="#1a5c1a")
        elif sid == "WAITING_FOR_HUMAN":
            dot.node(sid, slabel, fillcolor="#2a1800", fontcolor="#f39c12", color="#5c3800")
        else:
            dot.node(sid, slabel, fillcolor="#0f1422", fontcolor="#5a7a9a", color="#1e2d45")

    dot.edge("START_STUDY", "PRACTICE")
    dot.edge("PRACTICE", "EVALUATE")
    dot.edge("EVALUATE", "SESSION_COMPLETE", label="pass")
    dot.edge("EVALUATE", "TIE_BREAKER", label="?")
    dot.edge("EVALUATE", "DIAGNOSE_GAP", label="fail")
    dot.edge("TIE_BREAKER", "PRACTICE")
    dot.edge("DIAGNOSE_GAP", "VALIDATE_HYPOTHESIS")
    dot.edge("VALIDATE_HYPOTHESIS", "SELECT_RESOURCE")
    dot.edge("VALIDATE_HYPOTHESIS", "WAITING_FOR_HUMAN", label="invalid")
    dot.edge("SELECT_RESOURCE", "RETEACH_PREREQ")
    dot.edge("RETEACH_PREREQ", "GENERATE_EXERCISE")
    dot.edge("GENERATE_EXERCISE", "PRACTICE")
    dot.edge("PRACTICE", "RECHECK_ORIGINAL", label="prereq pass")
    dot.edge("RECHECK_ORIGINAL", "SESSION_COMPLETE", label="pass")
    dot.edge("WAITING_FOR_HUMAN", "PRACTICE", label="resume")

    st.graphviz_chart(dot, use_container_width=True)

    # ── DAG Visualization
    dag = res.get("dag", {})
    concept_titles = res.get("concept_titles", {})
    if dag:
        st.markdown("### 🔗 Prerequisite Graph")
        dag_dot = graphviz.Digraph(engine="dot")
        dag_dot.attr(bgcolor="#0a0c14", rankdir="BT", fontcolor="white", fontname="Inter")
        dag_dot.attr("node", shape="box", style="rounded,filled", fontname="Inter",
                     fontsize="9", penwidth="1")
        dag_dot.attr("edge", color="#1a3a6e", arrowsize="0.7")

        prereq_chain = st.session_state.res.get("session", {})
        target_id = res.get("target_id", "")

        for node_id, prereqs in dag.items():
            title = concept_titles.get(node_id, node_id.replace("_", " ").title())
            title_short = title[:20] + ("…" if len(title) > 20 else "")
            if node_id == target_id:
                dag_dot.node(node_id, title_short, fillcolor="#1a73e8", fontcolor="white", color="#5b9ff0")
            else:
                dag_dot.node(node_id, title_short, fillcolor="#0f1422", fontcolor="#8aa0c0", color="#1e2d45")
            for p in prereqs:
                dag_dot.edge(p, node_id)

        st.graphviz_chart(dag_dot, use_container_width=True)

    # ── Agent Handoff Trace
    st.markdown("### 🔄 Agent Trajectory")
    handoffs = sm.get_handoffs(run_id)
    if handoffs:
        for h in reversed(handoffs[-8:]):
            st.markdown(f"""
            <div class='handoff-entry'>
                <span class='agent-chip'>{h['from_agent']}</span>
                → <span class='agent-chip'>{h['to_agent']}</span>
                <code style='font-size:0.75rem;color:#5a7a9a;'>{h['action']}</code>
                <div style='color:#3a5a7a;font-size:0.75rem;margin-top:4px;'>{h['reason'][:80]}</div>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.caption("Handoff trace will appear here as agents activate.")

    # ── Learner Profile
    st.markdown("### 🧠 Learner Profile")
    profile = sm.get_or_create_student_state(
        st.session_state.res.get("session", {}).get("student_id", student_id),
        st.session_state.res.get("session", {}).get("course_id", "dynamic")
    )
    mcols = st.columns(2)
    with mcols[0]:
        st.metric("Mastered", len(profile.mastered))
    with mcols[1]:
        st.metric("Weak", len(profile.weak))

    if profile.mastered:
        st.markdown("**✅ Mastered:** " + ", ".join(
            f"`{c}`" for c in profile.mastered
        ))
    if profile.weak:
        st.markdown("**⚠️ Weak:** " + ", ".join(
            f"`{c}`" for c in profile.weak
        ))
    if profile.successful_modes:
        st.markdown("**🎯 Best modes:** " + ", ".join(
            f"`{m}`" for m in profile.successful_modes
        ))
