# VISION Full-stack Runbook

The project includes a React/Vite client in `frontend/` and a FastAPI backend in
`app/api.py`. MongoDB is the primary persistence layer for learner profiles, study
sessions, and typed agent handoffs. If MongoDB is unavailable, the adapter uses the
existing SQLite store so the learning loop remains demoable locally.

```bash
# terminal 1
docker compose up -d mongo
python -m uvicorn app.api:app --reload --port 8000

# terminal 2
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. The main API routes are `/api/session/start`,
`/api/session/step`, `/api/session/human-resume`, `/api/session/{run_id}`, and
`/api/student/{id}/profile`.

Offline-safe deterministic agents are enabled by default. Set `VISION_LIVE_LLM=true`
and configure an API key to enable the existing live provider path.
