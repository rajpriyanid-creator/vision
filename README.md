# VISION — Multi-Agent Adaptive Study & Prerequisite Debugger

**AGENT-A-THON 2026** | CEG, Anna University  
**Theme:** Building the Next Generation of Agentic EdTech  
**Primary Challenge Area:** Agentic Personalized Education  

## Core Learning Loop
**Vision Roadmap → Learn → Practice → Diagnose → Reteach → Re-test → Advance Part → Remember**

VISION is a full-stack multi-agent adaptive learning and prerequisite debugging system. It automatically decomposes complex topics into structured **N-Part Vision Roadmaps**, evaluates student submissions in a sandboxed runtime, identifies prerequisite gaps via causal DAG analysis, and conducts continuous grounded reteaching until full mastery is demonstrated.

---

## Quick Start (Running Locally)

### Prerequisites
- **Node.js**: Version 18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm** (included with Node.js)

> 💡 **Important Note for Previous Setup:**  
> The project runs from the **root directory**. Do **not** `cd frontend` or run `python -m uvicorn`. Both backend (Express + Multi-Agent Engine) and frontend (React + Vite) are unified into a single streamlined Node.js server.

### 1. Clone or Open the Project
Open PowerShell or your terminal in the project root directory:
```powershell
cd D:\Downloads\VISION_AgentSpec_GitHub_Repo\vision-adaptive-study-agent
```

### 2. Install Dependencies
```powershell
npm install
```

### 3. Run Development Server
```powershell
npm run dev
```

### 4. Open Application
Open your browser and navigate to:
```
http://localhost:3000
```
*(The dev server automatically boots both the multi-agent API engine and the interactive UI).*

---

## Available NPM Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the full-stack Express + Vite development server on port 3000 with live reload. |
| `npm test` | Runs the full automated verification test suite (Workflow, DAG Graph Validator, Code Sandbox, Part Planner). |
| `npm run test:workflow` | Runs the multi-agent supervisor and state machine workflow tests (18 automated checks). |
| `npm run test:benchmark` | Runs the synthetic diagnostic benchmark suite against 15+ misconception cases. |
| `npm run test:graph` | Runs DAG cycle detection, reachability, and topological dependency tests. |
| `npm run test:sandbox` | Runs isolated JavaScript code sandbox execution & timeout protection tests. |
| `npm run test:planner` | Runs curriculum multi-part vision roadmap planner tests. |
| `npm run build` | Compiles the React client bundle to `dist/` and bundles the backend server into `dist/server.cjs`. |
| `npm start` | Launches the production-compiled server from `dist/server.cjs`. |
| `npm run lint` | Typechecks TypeScript codebase (`tsc --noEmit`). |

---

## Environment Variables (Optional)

Create a `.env` file in the root directory if you wish to configure optional LLM or database overrides:

```env
# Optional: Google Gemini API Key for dynamic AI generation
GEMINI_API_KEY=your_api_key_here

# Optional: Development settings
VITE_DEV_MODE=true
```

*(If `GEMINI_API_KEY` is not provided, the engine runs on deterministic internal fixtures, heuristic evidence retrieval, and offline mock-safe agents).*

---

## System Architecture

VISION operates as a coordinated multi-agent cluster governed by a deterministic Supervisor State Machine:

```
                  ┌─────────────────────────────────────┐
                  │          Supervisor Agent           │
                  │  (State Machine & Vision Planner)   │
                  └──────────────────┬──────────────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         ▼                           ▼                           ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Tutor Agent    │       │  Exercise Agent  │       │ Evaluation Agent │
│  (Lesson Plans   │◄─────►│ (Dynamic Probes, │◄─────►│(Sandbox Testing, │
│ & Reteach Loops) │       │ Multi-Part Tests)│       │Rubrics & Scores) │
└──────────────────┘       └──────────────────┘       └─────────┬────────┘
         ▲                           ▲                          │
         │                           │                          ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  Resource Agent  │       │ Diagnostic Agent │       │ Workflow Engine  │
│ (Curated Corpus  │       │ (DAG Analysis &  │       │ (State DB, Event │
│   & Evidence)    │       │Prereq Hypotheses)│       │Logs & Handoffs)  │
└──────────────────┘       └──────────────────┘       └──────────────────┘
```

### Key Modules
1. **Vision Roadmap Engine (`server/curriculum/partPlanner.ts`)**:
   Decomposes any target concept into 3, 4, or 5 sequential milestone parts with overarching vision statements and cognitive demand tracking.
2. **Supervisor & Workflow Controller (`server/workflow/controller.ts`)**:
   Orchestrates continuous multi-turn progression, prerequisite backtracking, and automated milestone promotion.
3. **Execution Sandbox (`server/exercise/codeSandbox.ts`)**:
   Safely evaluates student submissions with private test cases and infinite-loop timeouts.
4. **Knowledge DAG Validator (`server/validation/graphValidator.ts`)**:
   Enforces cycle prevention, topological sorting, and causal dependency tracking across concepts.
5. **Interactive UI (`src/`)**:
   Built in React 19, Tailwind CSS, and Lucide icons, featuring live Vision Roadmaps, DAG graph visualizers, interactive code editors, and telemetry logs.

---

## Repository Structure

```
.
├── server.ts                       # Express + Vite unified server entry point
├── server/
│   ├── agents/                     # 6 Specialized Agent implementations
│   ├── curriculum/                 # N-Part Vision Roadmap Planner
│   ├── exercise/                   # Sandbox execution & probe generation
│   ├── retrieval/                  # Evidence retrieval & course corpus
│   ├── validation/                 # DAG validator & graph algorithms
│   └── workflow/                   # Supervisor state controller & DB
├── src/
│   ├── App.tsx                     # Main application layout & state routing
│   ├── components/                 # React UI components (VisionRoadmap, DAG, etc.)
│   ├── context/VisionContext.tsx   # Global reactive state management
│   └── types/vision.ts             # TypeScript domain schemas & contracts
├── tests/                          # Automated verification test suites
├── package.json                    # Dependencies, scripts, and build targets
└── tsconfig.json                   # TypeScript configuration
```

---

## Troubleshooting Local Issues

| Issue / Error | Cause | Resolution |
| :--- | :--- | :--- |
| `Cannot find module "app.api"` | Ran `python -m uvicorn app.api:app` | The backend is now in Node.js. Run `npm run dev` from the project root instead. |
| `ENOENT: no such file ... frontend\package.json` | Ran `npm` inside a `frontend/` subfolder | Run `npm install` and `npm run dev` in the **root project directory**. |
| Port 3000 already in use | Another process is using port 3000 | Kill the process on port 3000 or set `PORT=3001` before running `npm run dev`. |

---

## Team & Attribution
- **Rajpriyan S** — Team Lead / Agent Handler (Designer)
- **Megala M** — UI/UX Designer (UX Support)
- **Jeevananthan K** — Backend Developer (Builder)
- **Anushya M** — Frontend / Database Developer (Builder)
- **Dhanush S** — QA and Tester (Verifier)

