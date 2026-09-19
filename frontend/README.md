# VISION Adaptive Study Engine

An adaptive multi-agent learning application and prerequisite debugger built with React 18, TypeScript, Tailwind CSS, and Lucide icons.

## Features

- **Multi-Agent Orchestration**: Real-time integration and state tracking for Supervisor, Diagnostic, Resource, Tutor, Exercise, and Evaluation agents.
- **Adaptive Prerequisite DAG**: Visual directed acyclic graph mapping concepts, mastery levels, dependency bottlenecks, and targeted repair nodes.
- **Dynamic Exercises**: Support for multiple choice, fill-in-the-blank, open-ended explanations, and code problem execution.
- **Gap Diagnosis & Remediation**: Automatic prerequisite defect isolation, targeted mini-lessons, tie-breaker disambiguation, and human escalation workflows.
- **Learner Memory & History**: Long-term student profiles, mastery analytics, calibrated learning styles, and past session archives.

## Directory Structure

```text
├── docs/                   # Documentation & design specifications
│   └── design/             # Color tokens & typography guides
├── public/                 # Static assets (favicon, etc.)
├── src/
│   ├── api/                # Backend API client & communication endpoints
│   ├── components/         # Reusable UI modules & view controllers
│   │   ├── AdaptiveDecision.tsx
│   │   ├── AgentTimeline.tsx
│   │   ├── AppShell.tsx
│   │   ├── BackendConfigModal.tsx
│   │   ├── DeeperDiagnosis.tsx
│   │   ├── DiagnosticPanel.tsx
│   │   ├── EvaluationCard.tsx
│   │   ├── ExerciseRenderer.tsx
│   │   ├── HumanEscalation.tsx
│   │   ├── InitialTeaching.tsx
│   │   ├── MasteryView.tsx
│   │   ├── NewSessionForm.tsx
│   │   ├── PrerequisiteGraph.tsx
│   │   ├── RepairLesson.tsx
│   │   ├── ResourceSelectionView.tsx
│   │   ├── SessionHistory.tsx
│   │   ├── StudentProfileView.tsx
│   │   ├── TieBreaker.tsx
│   │   └── WhyPanel.tsx
│   ├── context/            # Global state (VisionContext)
│   ├── types/              # TypeScript interface definitions (vision.ts)
│   ├── App.tsx             # Primary application dashboard & routing
│   ├── index.css           # Tailwind CSS imports & base styles
│   ├── main.tsx            # React application root entrypoint
│   └── vite-env.d.ts       # Vite environment type declarations
├── .env.example            # Environment variable template
├── .gitignore              # Standard Git ignore rules
├── index.html              # HTML shell & font references
├── metadata.json           # Applet configuration & metadata
├── package.json            # Project manifest, scripts & dependencies
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite build & plugin configuration
```

## Getting Started

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The application runs on `http://localhost:3000`.

### Building for Production

```bash
npm run build
```

### Code Verification

```bash
npm run lint
```
