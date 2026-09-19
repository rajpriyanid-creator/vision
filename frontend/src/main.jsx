import { StrictMode, useEffect, useMemo, useState, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const API = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.detail || 'Something went wrong')
  return body
}

/* ─── Icons ─────────────────────────────────────────────────── */
function Icon({ name, size = 18 }) {
  const paths = {
    logo: <><path d="M4 15.5V8.4L12 4l8 4.4v7.1L12 20z"/><path d="M8 13.5 12 16l4-2.5V9.7l-4-2.2-4 2.2z"/></>,
    spark: <><path d="m12 3-1.2 5.8L5 10l5.8 1.2L12 17l1.2-5.8L19 10l-5.8-1.2z"/><path d="m19 16-.5 2.5L16 19l2.5.5L19 22l.5-2.5L22 19l-2.5-.5z"/></>,
    arrow: <><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    send: <><path d="m21 3-7.5 18-3.5-7-7-3.5z"/><path d="M21 3 10 14"/></>,
    refresh: <><path d="M20 11a8.1 8.1 0 0 0-14.8-3L3 11"/><path d="M3 4v7h7"/><path d="M4 13a8.1 8.1 0 0 0 14.8 3L21 13"/><path d="M21 20v-7h-7"/></>,
    brain: <><path d="M12 2a5 5 0 0 0-4.7 3.2A4 4 0 0 0 4 9a4 4 0 0 0 1.3 6.2A5 5 0 0 0 12 22a5 5 0 0 0 6.7-6.8A4 4 0 0 0 20 9a4 4 0 0 0-3.3-3.8A5 5 0 0 0 12 2z"/><path d="M12 2v20"/></>,
    target: <><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></>,
    alert: <><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></>,
    layers: <><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>
}

/* ─── Status Messages (state → human-readable) ──────────────── */
const STATE_MESSAGES = {
  START_STUDY: 'Starting your study session…',
  READ_LEARNER_STATE: 'Reading your learning history…',
  LOAD_COURSE_CONTEXT: 'VISION is building your prerequisite map…',
  PLAN_NEXT_ACTION: 'VISION is deciding your first step…',
  PRACTICE: 'Waiting for your answer…',
  EVALUATE: 'Evaluating your response…',
  TIE_BREAKER: 'Your answer was ambiguous — asking a clarifying question…',
  DIAGNOSE_GAP: 'Diagnostic Agent is analyzing the root cause…',
  VALIDATE_HYPOTHESIS: 'Validating prerequisite relationship…',
  SELECT_RESOURCE: 'Resource Agent is finding relevant material…',
  RESOURCE_CROSS_CHECK: 'Checking resource relevance…',
  RETEACH_PREREQ: 'Tutor Agent is preparing a targeted lesson…',
  GENERATE_EXERCISE: 'Exercise Agent is creating a focused question…',
  RECHECK_ORIGINAL: 'Re-testing the original concept…',
  TARGET_MASTERED: 'Concept mastered!',
  SESSION_COMPLETE: 'Session complete.',
  WAITING_FOR_HUMAN: 'VISION needs your input before continuing…',
  RESUME: 'Resuming session…',
}

/* ═══════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════ */
function App() {
  const [session, setSession] = useState(null)
  const [student, setStudent] = useState(localStorage.getItem('vision_student') || '')
  const [subject, setSubject] = useState('')
  const [target, setTarget] = useState('')
  const [goal, setGoal] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMsg, setLoadingMsg] = useState('')
  const [error, setError] = useState('')
  const [whyText, setWhyText] = useState('')
  const [whyLoading, setWhyLoading] = useState(false)
  const [expandedPanels, setExpandedPanels] = useState({ trace: false, memory: false, evidence: false })
  const [health, setHealth] = useState(null)
  const [courses, setCourses] = useState([])
  const [contextStatus, setContextStatus] = useState(null)

  // ─── Restore session on load ─────────────────────────────────
  useEffect(() => {
    const run = localStorage.getItem('vision_run_id')
    if (run) {
      request(`/api/session/${run}`).then(data => {
        setSession(data)
        setSubject(data.subject || '')
        setTarget(data.target_concept || '')
      }).catch(() => { localStorage.removeItem('vision_run_id') })
    }
    request('/api/health').then(setHealth).catch(() => {})
    request('/api/courses').then(setCourses).catch(() => {})
  }, [])

  // ─── Derived state ──────────────────────────────────────────
  const currentState = session?.current_state || 'READY'
  const isComplete = currentState === 'SESSION_COMPLETE'
  const isWaiting = currentState === 'WAITING_FOR_HUMAN'
  const sessionObj = session?.session || {}
  const dag = session?.dag || {}
  const conceptTitles = session?.concept_titles || {}
  const handoffs = session?.handoffs || []
  const history = session?.history || []
  const taughtConcepts = session?.taught_concepts || []
  const prereqChain = session?.prereq_chain || []

  // Real progress: mastered concepts / total concepts in DAG
  const totalConcepts = Object.keys(dag).length || 1
  const masteredCount = taughtConcepts.length + (isComplete && session?.status === 'completed' ? 1 : 0)
  const progress = isComplete && session?.status === 'completed' ? 100
    : totalConcepts > 0 ? Math.min(95, Math.round((masteredCount / totalConcepts) * 100))
    : 0

  // ─── Actions ────────────────────────────────────────────────
  const checkContext = useCallback(async () => {
    if (!subject.trim() || !target.trim()) return
    setContextStatus({ status: 'CHECKING' })
    try {
      const result = await request('/api/context/check', {
        method: 'POST',
        body: JSON.stringify({ subject: subject.trim(), target_concept: target.trim() }),
      })
      setContextStatus(result)
    } catch { setContextStatus({ status: 'CONTEXT_READY', reason: 'Check unavailable.' }) }
  }, [subject, target])

  async function start() {
    if (!student.trim() || !subject.trim() || !target.trim()) return
    setLoading(true); setError('')
    setLoadingMsg('VISION is building your prerequisite map…')
    try {
      localStorage.setItem('vision_student', student)
      const data = await request('/api/session/start', {
        method: 'POST',
        body: JSON.stringify({
          student_id: student.trim(),
          subject: subject.trim(),
          target_concept: target.trim(),
        }),
      })
      localStorage.setItem('vision_run_id', data.run_id)
      setSession(data)
      setLoadingMsg('')
    } catch (err) { setError(err.message); setLoadingMsg('') } finally { setLoading(false) }
  }

  async function submit(event) {
    event?.preventDefault()
    if (!answer.trim() || !session) return
    setLoading(true); setError(''); setWhyText('')
    setLoadingMsg('Evaluating your response…')
    try {
      const data = await request('/api/session/step', {
        method: 'POST',
        body: JSON.stringify({ run_id: session.run_id, student_answer: answer }),
      })
      setSession(data); setAnswer('')
      setLoadingMsg('')
    } catch (err) { setError(err.message); setLoadingMsg('') } finally { setLoading(false) }
  }

  async function resume(decision) {
    setLoading(true); setError('')
    setLoadingMsg('Resuming session…')
    try {
      const data = await request('/api/session/human-resume', {
        method: 'POST',
        body: JSON.stringify({ run_id: session.run_id, decision }),
      })
      setSession(data); setLoadingMsg('')
    } catch (err) { setError(err.message); setLoadingMsg('') } finally { setLoading(false) }
  }

  async function fetchWhy() {
    if (!session?.run_id) return
    setWhyLoading(true)
    try {
      const data = await request(`/api/session/${session.run_id}/why`)
      setWhyText(data.why || 'No explanation available.')
    } catch { setWhyText('Could not generate explanation.') }
    finally { setWhyLoading(false) }
  }

  function reset() {
    localStorage.removeItem('vision_run_id')
    setSession(null); setAnswer(''); setError(''); setWhyText('')
    setContextStatus(null); setLoadingMsg('')
  }

  function togglePanel(name) {
    setExpandedPanels(p => ({ ...p, [name]: !p[name] }))
  }

  function conceptTitle(id) {
    return conceptTitles[id] || id?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || id
  }

  function cleanText(txt, fallback = '') {
    if (!txt || typeof txt !== 'string') return fallback
    if (txt.startsWith('[Error') || txt.includes('RESOURCE_EXHAUSTED') || txt.includes('429')) {
      return fallback || 'VISION has initialized the key principles for this topic.'
    }
    return txt
  }

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  return <div className="app-shell">
    {/* ─── Sidebar ────────────────────────────────────────── */}
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Icon name="logo" size={23}/></span><span>VISION</span></div>
      <div className="brand-sub">ADAPTIVE STUDY ENGINE</div>
      <div className="sidebar-bottom">
        {student && <div className="student-mini">
          <div className="avatar">{student.slice(-2).toUpperCase()}</div>
          <div><strong>{student}</strong><small>Learner</small></div>
        </div>}
        <div className="powered">
          <span className={`status-dot ${health?.llm_live ? 'live' : 'mock'}`}/>
          <span>{health?.llm_live ? `Live — ${health.llm_model}` : health ? 'Mock mode' : 'Connecting…'}</span>
        </div>
      </div>
    </aside>

    {/* ─── Main ───────────────────────────────────────────── */}
    <main className="main-content">
      <header className="topbar">
        <div>
          <p className="eyebrow">{session ? 'ACTIVE STUDY SESSION' : 'WELCOME'}</p>
          <h1>{session
            ? <>{subject} <span className="header-dot">·</span> <em>{target}</em></>
            : 'What do you want to understand?'
          }</h1>
        </div>
        <div className="top-actions">
          {session && <span className="state-pill">{STATE_MESSAGES[currentState] || currentState}</span>}
          {session && <button className="icon-btn" onClick={reset} title="New session"><Icon name="refresh" size={15}/></button>}
        </div>
      </header>

      {/* ═══════════ NO SESSION: HOME ═════════════════════════ */}
      {!session ? <section className="welcome-grid">
        <div className="hero-card">
          <div className="hero-orb"><Icon name="brain" size={31}/></div>
          <div className="hero-kicker">A DEBUGGER FOR LEARNING</div>
          <h2>Tell VISION what <br/>you want to learn.</h2>
          <p>VISION figures out <em>how</em> you should learn it — by tracing wrong answers back to root prerequisite gaps, then repairing them one by one.</p>
          <div className="agent-row">
            <span>6 specialist agents</span><i/><span>Evidence grounded</span><i/><span>Human guided</span>
          </div>
        </div>

        <div className="start-card">
          <div className="card-heading">
            <div><span className="section-label">NEW SESSION</span><h3>Set your learning target</h3></div>
          </div>
          <label>YOUR NAME OR ID
            <input value={student} onChange={e => setStudent(e.target.value)} placeholder="e.g. student_001"/>
          </label>
          <label>SUBJECT / DOMAIN
            <input value={subject} onChange={e => { setSubject(e.target.value); setContextStatus(null) }} placeholder="e.g. Data Structures, Physics, Economics…" list="course-suggestions"/>
            <datalist id="course-suggestions">
              {courses.filter(c => c.source === 'fixture').map(c => <option key={c.course_id} value={c.name}/>)}
            </datalist>
          </label>
          <label>CONCEPT TO MASTER
            <input value={target} onChange={e => { setTarget(e.target.value); setContextStatus(null) }} placeholder="e.g. Recursion, Newton's Second Law…"/>
          </label>
          <label>LEARNING GOAL <span className="optional">(optional)</span>
            <input value={goal} onChange={e => setGoal(e.target.value)} placeholder="e.g. Understand deeply, Exam prep, Interview…"/>
          </label>

          {/* Context readiness */}
          {subject && target && !contextStatus && <button className="context-check-btn" onClick={checkContext}>Check if VISION can teach this →</button>}
          {contextStatus?.status === 'CHECKING' && <p className="context-msg checking">Checking learning context…</p>}
          {contextStatus?.status === 'CONTEXT_READY' && <p className="context-msg ready">✓ Context ready — {contextStatus.reason}</p>}
          {contextStatus?.status === 'CONTEXT_INSUFFICIENT' && <p className="context-msg insufficient">⚠ {contextStatus.reason}</p>}

          <button className="primary-button" onClick={start} disabled={loading || !student.trim() || !subject.trim() || !target.trim()}>
            {loading ? loadingMsg || 'Starting…' : <>Start adaptive session <Icon name="arrow" size={16}/></>}
          </button>
          {error && <p className="error-text">{error}</p>}
        </div>
      </section>

      /* ═══════════ ACTIVE SESSION ════════════════════════════ */
      : <section className="study-layout">
        <div className="study-column">
          {/* Loading state */}
          {loading && <div className="thinking-bar"><div className="thinking-pulse"/><span>{loadingMsg || 'VISION is thinking…'}</span></div>}

          {/* ── SESSION COMPLETE ───────────────────────────── */}
          {isComplete ? <div className="complete-card">
            <div className="complete-icon">{session.status === 'completed' ? <Icon name="check" size={28}/> : <Icon name="layers" size={28}/>}</div>
            <span className="section-label">SESSION COMPLETE</span>
            <h2>{session.status === 'completed' ? 'Concept mastered.' : 'Good work today.'}</h2>
            <p>{session.message || 'Your learning state has been saved.'}</p>
            {/* Summary */}
            <div className="complete-summary">
              {taughtConcepts.length > 0 && <div className="summary-item"><strong>Repaired:</strong> {taughtConcepts.map(conceptTitle).join(', ')}</div>}
              <div className="summary-item"><strong>Calls used:</strong> {sessionObj.call_count}/20</div>
              <div className="summary-item"><strong>Revisions:</strong> {sessionObj.revision_count}/3</div>
            </div>
            <button className="primary-button compact" onClick={reset}>Start another session <Icon name="arrow" size={15}/></button>
          </div>

          /* ── WAITING FOR HUMAN ──────────────────────────── */
          : isWaiting ? <div className="human-card">
            <div className="warning-icon"><Icon name="alert" size={24}/></div>
            <span className="section-label">VISION NEEDS YOUR INPUT</span>
            <h2>Let's pause and choose the next move.</h2>
            <p>{session.human_question?.question}</p>
            {session.teaching_action && <details className="lesson-details"><summary>View last lesson delivered</summary><div className="lesson-body">{session.teaching_action.explanation_text}</div></details>}
            <div className="decision-row">
              {(session.human_question?.options || ['Continue']).map(opt =>
                <button key={opt} onClick={() => resume(opt)} disabled={loading}>{opt}</button>
              )}
            </div>
          </div>

          /* ── PRACTICE (main learning state) ─────────────── */
          : <>
            {/* Message from last transition */}
            {session.message && <div className={`transition-msg ${session.message.includes('✅') ? 'success' : session.message.includes('🔍') ? 'info' : session.message.includes('🤔') ? 'warn' : 'info'}`}>
              {session.message}
            </div>}

            {/* Evaluation reasoning (collapsible) */}
            {session.evaluation && <div className="eval-card">
              <div className="eval-status" data-status={session.evaluation.status}>
                {session.evaluation.status === 'demonstrated' ? '✓' : session.evaluation.status === 'uncertain' ? '?' : '✗'}
              </div>
              <div>
                <strong>Evaluation: {session.evaluation.status.toUpperCase()}</strong>
                <p>{session.evaluation.reasoning}</p>
              </div>
            </div>}

            {/* Gap hypothesis */}
            {session.gap_hypothesis && <div className="gap-card">
              <span className="section-label">DIAGNOSTIC RESULT</span>
              <p><strong>Gap found:</strong> {conceptTitle(session.gap_hypothesis.candidate_prerequisite)}</p>
              <p><strong>Confidence:</strong> {Math.round(session.gap_hypothesis.confidence * 100)}%</p>
              {session.gap_hypothesis.evidence_refs?.[0] && <p className="gap-evidence">{session.gap_hypothesis.evidence_refs[0]}</p>}
            </div>}

            {/* Teaching action */}
            {session.teaching_action && <div className="lesson-card">
              <div className="lesson-head">
                <span className="lesson-icon"><Icon name="spark" size={18}/></span>
                <div>
                  <span className="section-label">TARGETED LESSON</span>
                  <h3>{history.length === 0 ? 'Learning:' : 'Repairing:'} {conceptTitle(session.teaching_action.concept)}</h3>
                </div>
                <span className="mode-chip">{session.teaching_action.teaching_mode?.replace(/_/g, ' ')}</span>
              </div>
              <div className="lesson-body">{cleanText(session.teaching_action.explanation_text, `Understanding ${conceptTitle(session.teaching_action.concept)}: Master the core rules and principles governing this concept to build a solid foundation.`)}</div>
              <div className="evidence-ref"><span className="status-dot live"/> Grounded in <strong>{session.teaching_action.evidence_ref}</strong></div>
            </div>}

            {/* Exercise question */}
            {session.exercise && <form className="question-card" onSubmit={submit}>
              <div className="question-top">
                <div>
                  <span className="section-label">{session.exercise.exercise_type?.replace(/_/g, ' ').toUpperCase() || 'ASSESSMENT'}</span>
                  <h2>{cleanText(session.exercise.question_text, `Please explain ${conceptTitle(target)} in your own words with an example.`)}</h2>
                </div>
                <span className="question-count">{sessionObj.call_count || 0}<small>/ 20</small></span>
              </div>
              <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Write your reasoning here…" rows="5" disabled={loading}/>
              <div className="answer-footer">
                <span>VISION evaluates your reasoning, not just keywords.</span>
                <button className="send-button" disabled={loading || !answer.trim()}>
                  {loading ? 'Checking…' : <>Submit answer <Icon name="send" size={15}/></>}
                </button>
              </div>
              {error && <p className="error-text">{error}</p>}
            </form>}
          </>}

          {/* Why this step? */}
          {session && !isComplete && <div className="why-panel">
            <button className="why-btn" onClick={fetchWhy} disabled={whyLoading}>
              {whyLoading ? 'Thinking…' : '💡 Why this step?'}
            </button>
            {whyText && <p className="why-text">{whyText}</p>}
          </div>}
        </div>

        {/* ─── Inspector Sidebar ──────────────────────────── */}
        <aside className="inspector">
          {/* Session stats */}
          <div className="inspector-card">
            <div className="inspector-title"><span className="section-label">SESSION</span></div>
            <div className="stat-grid">
              <div><strong>{sessionObj.call_count || 0}</strong><span>/ 20 calls</span></div>
              <div><strong>{sessionObj.revision_count || 0}</strong><span>/ 3 revisions</span></div>
              <div><strong>{taughtConcepts.length}</strong><span>gaps repaired</span></div>
              <div><strong>{history.length}</strong><span>attempts</span></div>
            </div>
          </div>

          {/* DAG visualization (real) */}
          {Object.keys(dag).length > 0 && <div className="inspector-card">
            <div className="inspector-title"><span className="section-label">PREREQUISITE MAP</span></div>
            <div className="dag-view">
              {Object.entries(dag).map(([nodeId, prereqs]) => {
                const isTarget = nodeId === session?.target_id
                const isCurrent = prereqChain[prereqChain.length - 1] === nodeId
                const isTaught = taughtConcepts.includes(nodeId)
                return <div key={nodeId} className={`dag-node ${isTarget ? 'target' : ''} ${isCurrent ? 'current' : ''} ${isTaught ? 'taught' : ''}`}>
                  <span className="dag-dot"/>
                  <span>{conceptTitle(nodeId)}</span>
                  {prereqs.length > 0 && <small className="dag-prereqs">← {prereqs.map(p => conceptTitle(p)).join(', ')}</small>}
                </div>
              })}
            </div>
          </div>}

          {/* Agent trace (real handoffs) */}
          <div className="inspector-card">
            <button className="panel-toggle" onClick={() => togglePanel('trace')}>
              <span className="section-label">AGENT TRACE</span>
              <span className="trace-count">{handoffs.length} handoffs {expandedPanels.trace ? '▲' : '▼'}</span>
            </button>
            {expandedPanels.trace && <div className="trace-list">
              {handoffs.slice().reverse().slice(0, 12).map((h, i) =>
                <div className="trace-item" key={`${h.timestamp}-${i}`}>
                  <span className={`trace-dot ${i === 0 ? 'current' : ''}`}/>
                  <div>
                    <strong>{h.from_agent} <span>→</span> {h.to_agent}</strong>
                    <small>{h.action?.replace(/_/g, ' ')}</small>
                    {h.reason && <small className="trace-reason">{h.reason.slice(0, 100)}</small>}
                  </div>
                </div>
              )}
              {!handoffs.length && <p className="muted">Agents will appear here as the session progresses.</p>}
            </div>}
          </div>

          {/* Learner memory */}
          <div className="inspector-card">
            <button className="panel-toggle" onClick={() => togglePanel('memory')}>
              <span className="section-label">LEARNER MEMORY</span>
              <span className="trace-count">{expandedPanels.memory ? '▲' : '▼'}</span>
            </button>
            {expandedPanels.memory && <div className="memory-view">
              {taughtConcepts.length > 0 && <div className="memory-row"><strong>Repaired:</strong> {taughtConcepts.map(c => <span key={c} className="mem-chip repaired">{conceptTitle(c)}</span>)}</div>}
              {prereqChain.length > 1 && <div className="memory-row"><strong>Prereq chain:</strong> {prereqChain.map(conceptTitle).join(' → ')}</div>}
              <div className="memory-row"><strong>Session status:</strong> {sessionObj.status || 'active'}</div>
            </div>}
          </div>
        </aside>
      </section>}

      <footer className="footer">
        <span>© 2026 VISION</span>
        <span>{health?.storage || ''}</span>
        <span>{health?.llm_live ? `${health.llm_provider} / ${health.llm_model}` : 'Mock mode'}</span>
      </footer>
    </main>
  </div>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
