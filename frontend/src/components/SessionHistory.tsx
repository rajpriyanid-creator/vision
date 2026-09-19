import React, { useEffect, useState } from 'react';
import { useVision } from '../context/VisionContext';
import { StudentSessionSummary } from '../types/vision';
import { api } from '../api/client';

interface SessionHistoryProps {
  onSelectSession: (run_id: string) => void;
  onBackToStudy: () => void;
}

export const SessionHistory: React.FC<SessionHistoryProps> = ({ onSelectSession, onBackToStudy }) => {
  const { studentId } = useVision();
  const [sessions, setSessions] = useState<StudentSessionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await api.getStudentSessions(studentId);
        if (isMounted) {
          setSessions(list);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch session history');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchHistory();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  return (
    <div className="w-full max-w-4xl mx-auto py-4 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-base">history</span>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00D2FF]">
              Student Telemetry
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Study History for {studentId}
          </h1>
        </div>

        <button
          onClick={onBackToStudy}
          className="px-4 py-2 rounded-xl bg-[#141F36] hover:bg-[#1C2740] border border-[#1F2F4A] text-xs font-mono text-slate-200 transition-colors flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Study</span>
        </button>
      </div>

      {loading ? (
        <div className="p-8 rounded-2xl bg-[#0E1526] border border-[#1F2F4A] text-center font-mono text-xs text-[#8EA4B8] flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-sm animate-spin text-primary">sync</span>
          Querying past sessions from backend...
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs font-mono text-rose-300">
          {error}
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#0E1526] border border-[#1F2F4A] text-center font-mono text-xs text-[#8EA4B8]">
          No past sessions found for <strong className="text-white">{studentId}</strong>. Start a new session to record progress!
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((sess) => {
            const isCompleted = (sess.status || '').toLowerCase().includes('complete') || (sess.outcome || '').toLowerCase().includes('mastered');

            return (
              <div
                key={sess.run_id}
                onClick={() => onSelectSession(sess.run_id)}
                className="p-5 rounded-xl bg-[#0E1526] border border-[#1F2F4A] hover:border-[#00D2FF]/60 hover:bg-[#141F36]/60 transition-all cursor-pointer shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white group-hover:text-[#00D2FF] transition-colors">
                      {sess.target_concept || 'Adaptive Session'}
                    </span>
                    {sess.course && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#06080F] border border-[#1F2F4A] text-slate-300">
                        {sess.course}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono text-[#8EA4B8]">
                    <span>Run ID: <code className="text-sky-300">{sess.run_id.slice(0, 10)}...</code></span>
                    {sess.created_at && <span>· {new Date(sess.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded border uppercase font-bold ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-[#10B981] border-emerald-500/40'
                        : 'bg-cyan-500/20 text-[#00D2FF] border-cyan-500/40'
                    }`}
                  >
                    {sess.outcome || sess.status || sess.current_state || 'In Progress'}
                  </span>

                  <span className="material-symbols-outlined text-sm text-[#8EA4B8] group-hover:text-[#00D2FF] group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
