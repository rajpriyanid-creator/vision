# VISION — Multi-Agent Adaptive Study & Prerequisite Debugger

**AGENT-A-THON 2026** | CEG, Anna University  
**Theme:** Building the Next Generation of Agentic EdTech  
**Primary Challenge Area:** Agentic Personalized Education  

## Core Learning Loop
**Learn → Practice → Diagnose → Reteach → Re-test → Improve → Remember**

This repository contains the authoritative specification, architecture, contracts, and documentation for **VISION**. The event build demonstrates a complete multi-agent prerequisite debugging loop: one student, one bounded course context, persistent learner state, diagnostic tie-breakers, grounded reteaching, targeted re-testing, backward prerequisite loop, human pause/resume, and cross-course preference persistence.

## Run locally on Windows (without Docker)

The application does not require Docker. Start a local MongoDB service if MongoDB is
installed on this machine, then run the API and frontend in separate terminals:

```powershell
# Check whether MongoDB is installed and running
Get-Service MongoDB

# If installed but stopped, start it from an elevated PowerShell terminal
Start-Service MongoDB

# Terminal 1 — backend
python -m pip install -r requirements.txt
python -m uvicorn app.api:app --reload --port 8000

# Terminal 2 — frontend
Set-Location frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The backend API and interactive Swagger docs are available
at `http://localhost:8000` and `http://localhost:8000/docs`.

If MongoDB is not installed or cannot be started, VISION automatically uses the local
SQLite fallback (`vision.db`) for development. To require MongoDB instead, set
`VISION_MONGO_REQUIRED=true` in `.env`.

---

## Final Architecture Overview
- **6 Specialized AI Agents:** Supervisor Agent, Diagnostic Agent, Resource Agent, Tutor Agent, Exercise Agent, Evaluation Agent.
- **1 Deterministic Workflow Controller:** Enforces state transitions, spend budgets (18–20 call design target), revision limits (max 3 backward steps), prerequisite validation, provenance checks, and human escalation.
- **Persistent Learner State:** Tracks transferable preferences (`successful_modes`) vs course-scoped mastery and prerequisite history across sessions (`Data Structures` → `Operating Systems`).

---

## Repository Map
- [AGENTSPEC.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/AGENTSPEC.md) — Official 16-section submission specification
- `docs/` — Architecture, design, builder, verifier, testing, and submission guides
  - [AGENTSPEC_SUBMISSION.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/AGENTSPEC_SUBMISSION.md) — Mirror of final AgentSpec
  - [ARCHITECTURE.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/ARCHITECTURE.md) — 20-state machine, topology & Pydantic schemas
  - [BUILDER.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/BUILDER.md) — Technical implementation blueprint & database schema
  - [DESIGNER.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/DESIGNER.md) — 6 agent rules, prompt contracts & tie-breaker strategies
  - [IMPLEMENTATION_PLAN.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/IMPLEMENTATION_PLAN.md) — 5-phase build roadmap
  - [PRINCIPLES-BRIEF.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/PRINCIPLES-BRIEF.md) — EdTech manifesto & agentic criteria
  - [STARTER_KIT_INTEGRATION.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/STARTER_KIT_INTEGRATION.md) — Starter kit mapping & smoke tests
  - [STRESS_TEST_PLAN.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/STRESS_TEST_PLAN.md) — 7 adversarial test suites & injection defense
  - [SUBMISSION_CHECKLIST.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/SUBMISSION_CHECKLIST.md) — Final submission audit checklist
  - [USER_TEST_PLAN.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/USER_TEST_PLAN.md) — 3 real-user walkthrough scripts
  - [VERIFIER.md](file:///d:/Downloads/VISION_AgentSpec_GitHub_Repo/vision-adaptive-study-agent/docs/VERIFIER.md) — QA verification protocol & iteration log
- `domain/` — Bounded course prerequisite graphs and evaluation rubrics
- `corpus/` — Approved course notes and evidence materials
- `evidence/` — User walkthrough logs and adversarial stress test logs
- `tests/` — Automated test fixtures and regression checks

---

## Event Scope
- **Included:** Personalized student state, diagnostic tie-breakers, prerequisite edge validation, evidence-grounded reteaching, targeted re-testing, backward agentic loop (`GO_DEEPER`), human escalation (`WAITING_FOR_HUMAN`), second encounter preference transfer.
- **Deliberately Excluded:** Capstone project stress testing, team matching, faculty dashboards, voice, multilingual translation, universal web search, formal academic grading.

---

## Team
- **Rajpriyan S** — Team Lead / Agent Handler (Designer)
- **Megala M** — UI/UX Designer (UX Support)
- **Jeevananthan K** — Backend Developer (Builder)
- **Anushya M** — Frontend / Database Developer (Builder)
- **Dhanush S** — QA and Tester (Verifier)
