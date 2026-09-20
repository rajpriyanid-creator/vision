import React, { useState, useEffect } from 'react';
import { useVision } from '../context/VisionContext';
import { Course, ContextCheckResult } from '../types/vision';
import { api } from '../api/client';

export const NewSessionForm: React.FC = () => {
  const {
    studentId,
    setStudentId,
    startNewSession,
    loading,
    error,
    clearError,
    backendConnected
  } = useVision();

  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState<boolean>(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('custom');
  const [subject, setSubject] = useState<string>('Data Structures');
  const [targetConcept, setTargetConcept] = useState<string>('Binary Tree Inorder Traversal');
  const [learnerLevel, setLearnerLevel] = useState<string>('Intermediate');
  const [learningGoal, setLearningGoal] = useState<string>('Understand');
  const [nParts, setNParts] = useState<number>(4);
  const [userNotes, setUserNotes] = useState<string>('');

  // Context readiness check
  const [checkingContext, setCheckingContext] = useState<boolean>(false);
  const [contextResult, setContextResult] = useState<ContextCheckResult | null>(null);

  // Fetch dynamic courses on mount
  useEffect(() => {
    let isMounted = true;
    const loadCourses = async () => {
      setLoadingCourses(true);
      try {
        const fetched = await api.getCourses();
        if (isMounted && Array.isArray(fetched) && fetched.length > 0) {
          setCourses(fetched);
          // Default to first course if available
          const first = fetched[0];
          setSelectedCourseId(first.course_id);
          setSubject(first.subject || 'Data Structures');
          if (first.concepts && first.concepts.length > 0) {
            setTargetConcept(first.concepts[0]);
          }
        }
      } catch {
        // Backend might be offline or no courses endpoint yet
      } finally {
        if (isMounted) setLoadingCourses(false);
      }
    };
    loadCourses();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourseId(courseId);
    setContextResult(null);
    if (courseId === 'custom') {
      return;
    }
    const found = courses.find((c) => c.course_id === courseId);
    if (found) {
      setSubject(found.subject || '');
      if (found.concepts && found.concepts.length > 0) {
        setTargetConcept(found.concepts[0]);
      }
    }
  };

  const handleCheckContext = async () => {
    if (!subject.trim() || !targetConcept.trim()) return;
    setCheckingContext(true);
    setContextResult(null);
    try {
      const res = await api.checkContext(subject.trim(), targetConcept.trim());
      setContextResult(res);
    } catch (err: any) {
      setContextResult({
        status: 'error',
        message: err.message || 'Context check failed'
      });
    } finally {
      setCheckingContext(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!subject.trim() || !targetConcept.trim()) return;

    await startNewSession({
      student_id: studentId,
      subject: subject.trim(),
      target_concept: targetConcept.trim(),
      course_id: selectedCourseId !== 'custom' ? selectedCourseId : undefined,
      learner_level: learnerLevel,
      learning_goal: learningGoal,
      n_parts: nParts,
      user_notes: userNotes.trim() || undefined
    });
  };

  const learnerLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Assess me'];
  const learningGoals = ['Understand', 'Exam', 'Interview', 'Practice', 'Revision', 'Deep dive'];

  return (
    <div className="w-full max-w-3xl mx-auto py-6">
      <div className="rounded-2xl bg-[#0E1526]/90 border border-[#1F2F4A] p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#00D2FF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col gap-2 mb-6">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-ping" />
            <span className="font-mono text-xs font-semibold uppercase tracking-widest text-[#00D2FF]">
              Session Configuration
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Start New Adaptive Study Session
          </h1>
          <p className="text-sm text-[#8EA4B8]">
            Configure your target concept and learner profile. VISION's multi-agent orchestrator will personalize initial teaching, diagnostics, and prerequisite repairs.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-rose-400 mt-0.5">error</span>
              <div className="flex flex-col gap-1">
                <span>{error}</span>
                {error.includes('localhost:8000') && (
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('vision_api_base_url');
                      }
                      clearError();
                      window.location.reload();
                    }}
                    className="text-left text-sky-300 hover:text-white underline mt-1 font-semibold"
                  >
                    Reset API Base to Integrated Server (/api) and Refresh
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={clearError}
              className="text-[#8EA4B8] hover:text-white shrink-0"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Student ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-[#8EA4B8]">
                Student Identifier:
              </label>
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="student_001"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-[#06080F] border border-[#1F2F4A] text-sm font-mono text-white focus:outline-none focus:border-[#00D2FF] transition-colors"
              />
            </div>

            {/* Course Selector */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono text-[#8EA4B8]">
                  Select Course:
                </label>
                {loadingCourses && (
                  <span className="text-[10px] font-mono text-sky-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                    Loading courses...
                  </span>
                )}
              </div>
              <select
                value={selectedCourseId}
                onChange={(e) => handleCourseChange(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg bg-[#06080F] border border-[#1F2F4A] text-sm font-mono text-white focus:outline-none focus:border-[#00D2FF] transition-colors"
              >
                <option value="custom">Custom Subject / Topic</option>
                {courses.map((c) => (
                  <option key={c.course_id} value={c.course_id}>
                    {c.title} ({c.subject}) {c.source === 'dynamic' ? '⚡ Dynamic' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject & Target Concept */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-[#8EA4B8]">
                Subject / Domain:
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => {
                  setSubject(e.target.value);
                  setContextResult(null);
                }}
                placeholder="e.g. Data Structures, Operating Systems"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-[#06080F] border border-[#1F2F4A] text-sm text-white focus:outline-none focus:border-[#00D2FF] transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono text-[#8EA4B8]">
                Target Concept to Master:
              </label>
              <input
                type="text"
                value={targetConcept}
                onChange={(e) => {
                  setTargetConcept(e.target.value);
                  setContextResult(null);
                }}
                placeholder="e.g. Binary Tree Inorder Traversal, Page Fault Handling"
                required
                className="w-full px-3 py-2.5 rounded-lg bg-[#06080F] border border-[#1F2F4A] text-sm text-white focus:outline-none focus:border-[#00D2FF] transition-colors"
              />
            </div>
          </div>

          {/* Context Readiness Check */}
          <div className="p-3.5 rounded-xl bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00D2FF] text-sm">troubleshoot</span>
                <span className="text-xs font-mono text-slate-300">Context Readiness Check</span>
              </div>
              <button
                type="button"
                onClick={handleCheckContext}
                disabled={checkingContext || !subject.trim() || !targetConcept.trim()}
                className="px-2.5 py-1 rounded-md bg-[#141F36] hover:bg-[#1C2740] border border-[#1F2F4A] text-xs font-mono text-[#00D2FF] transition-colors disabled:opacity-50"
              >
                {checkingContext ? 'Checking...' : 'Verify Context'}
              </button>
            </div>

            {contextResult && (
              <div
                className={`p-2.5 rounded-lg text-xs font-mono ${
                  contextResult.status === 'ready'
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : contextResult.status === 'insufficient'
                    ? 'bg-amber-950/60 border border-amber-500/40 text-amber-300'
                    : 'bg-slate-900 border border-slate-700 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  <span className="material-symbols-outlined text-sm">
                    {contextResult.status === 'ready' ? 'check_circle' : 'info'}
                  </span>
                  <span>Status: {contextResult.status}</span>
                </div>
                {contextResult.message && <div className="mt-1">{contextResult.message}</div>}
                {contextResult.details && (
                  <div className="mt-1 text-[11px] text-[#8EA4B8]">{contextResult.details}</div>
                )}
              </div>
            )}
          </div>

          {/* Learner Level Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-[#8EA4B8]">
              Learner Level:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {learnerLevels.map((lvl) => {
                const isSelected = learnerLevel === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLearnerLevel(lvl)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-mono text-center border transition-all ${
                      isSelected
                        ? 'bg-cyan-500/20 border-[#00D2FF] text-[#00D2FF] shadow-[0_0_12px_rgba(0,210,255,0.25)] font-semibold'
                        : 'bg-[#06080F] border-[#1F2F4A] text-slate-300 hover:border-[#62778A]'
                    }`}
                  >
                    {lvl}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Learning Goal Selection */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-[#8EA4B8]">
              Learning Goal:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              {learningGoals.map((goal) => {
                const isSelected = learningGoal === goal;
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => setLearningGoal(goal)}
                    className={`py-2 px-2.5 rounded-lg text-xs font-mono text-center border transition-all ${
                      isSelected
                        ? 'bg-emerald-500/20 border-[#10B981] text-[#10B981] shadow-[0_0_12px_rgba(16,185,129,0.25)] font-semibold'
                        : 'bg-[#06080F] border-[#1F2F4A] text-slate-300 hover:border-[#62778A]'
                    }`}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vision Progression: Split into N Parts */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-[#8EA4B8] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#00D2FF]">timeline</span>
                <span>Vision Curriculum: Split into N Parts:</span>
              </label>
              <span className="text-[11px] font-mono text-sky-400">
                Continuous Multi-Turn Pedagogical Loop
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setNParts(3)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  nParts === 3
                    ? 'bg-[#00D2FF]/15 border-[#00D2FF] text-white shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                    : 'bg-[#06080F] border-[#1F2F4A] text-slate-400 hover:border-[#62778A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-[#00D2FF]">3 Parts</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800">
                    Fast Track
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium">Foundations → Operations → Synthesis</div>
                <div className="text-[10px] text-slate-500 mt-1">~15 mins • Core coverage</div>
              </button>

              <button
                type="button"
                onClick={() => setNParts(4)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  nParts === 4
                    ? 'bg-[#00D2FF]/15 border-[#00D2FF] text-white shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                    : 'bg-[#06080F] border-[#1F2F4A] text-slate-400 hover:border-[#62778A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-[#00D2FF]">4 Parts</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    Recommended Standard
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium">Foundations → Operations → Edge Cases → Retest</div>
                <div className="text-[10px] text-slate-500 mt-1">~20 mins • Complete mastery</div>
              </button>

              <button
                type="button"
                onClick={() => setNParts(5)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                  nParts === 5
                    ? 'bg-[#00D2FF]/15 border-[#00D2FF] text-white shadow-[0_0_15px_rgba(0,210,255,0.2)]'
                    : 'bg-[#06080F] border-[#1F2F4A] text-slate-400 hover:border-[#62778A]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-[#00D2FF]">5 Parts</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Deep Masterclass
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 font-medium">Mental Model → Mechanics → Trace → Boundaries → Opt</div>
                <div className="text-[10px] text-slate-500 mt-1">~25 mins • Exhaustive drill</div>
              </button>
            </div>
          </div>

          {/* Optional User Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-mono text-[#8EA4B8]">
              Optional Background Notes / Focus Areas:
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="e.g. Struggled with stack recursion unwinding during previous midterm..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg bg-[#06080F] border border-[#1F2F4A] text-xs text-white focus:outline-none focus:border-[#00D2FF] transition-colors resize-none"
            />
          </div>

          {/* Submit CTA */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 px-6 rounded-xl bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm tracking-wide transition-all shadow-[0_0_24px_rgba(0,210,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                <span>Initializing Multi-Agent Pipeline...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">play_arrow</span>
                <span>Start Adaptive Learning Session</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
