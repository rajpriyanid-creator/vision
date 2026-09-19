import React, { useEffect, useState } from 'react';
import { useVision } from '../context/VisionContext';
import { StudentProfile } from '../types/vision';
import { api } from '../api/client';

export const StudentProfileView: React.FC<{ onBackToStudy: () => void }> = ({ onBackToStudy }) => {
  const { studentId } = useVision();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getStudentProfile(studentId);
        if (isMounted) {
          setProfile(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Unable to retrieve learner profile');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [studentId]);

  return (
    <div className="w-full max-w-4xl mx-auto py-4 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-primary text-base">neurology</span>
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00D2FF]">
              Persistent Learner Memory
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Learner Profile · {studentId}
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
          Fetching persistent student synaptic memory...
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-xs font-mono text-rose-300">
          {error}
        </div>
      ) : !profile ? (
        <div className="p-8 rounded-2xl bg-[#0E1526] border border-[#1F2F4A] text-center font-mono text-xs text-[#8EA4B8]">
          No learner memory record found for <strong className="text-white">{studentId}</strong> yet. Complete sessions to build personalized memory.
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Top summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-[#0E1526] border border-emerald-500/30 flex flex-col gap-1">
              <span className="text-xs font-mono text-[#8EA4B8] uppercase">Mastered Concepts</span>
              <span className="text-2xl font-bold text-[#10B981] font-mono">
                {profile.mastered_concepts?.length || 0}
              </span>
            </div>
            <div className="p-5 rounded-xl bg-[#0E1526] border border-rose-500/30 flex flex-col gap-1">
              <span className="text-xs font-mono text-[#8EA4B8] uppercase">Active Weak Areas</span>
              <span className="text-2xl font-bold text-[#FF6B6B] font-mono">
                {profile.weak_concepts?.length || 0}
              </span>
            </div>
            <div className="p-5 rounded-xl bg-[#0E1526] border border-sky-500/30 flex flex-col gap-1">
              <span className="text-xs font-mono text-[#8EA4B8] uppercase">Recorded Misconceptions</span>
              <span className="text-2xl font-bold text-sky-300 font-mono">
                {profile.misconceptions?.length || 0}
              </span>
            </div>
          </div>

          {/* Mastered & Weak lists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-[#0E1526] border border-[#1F2F4A] flex flex-col gap-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#10B981] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">check_circle</span>
                Demonstrated Concepts
              </span>
              {profile.mastered_concepts && profile.mastered_concepts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.mastered_concepts.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#8EA4B8] font-mono">None logged yet.</div>
              )}
            </div>

            <div className="p-5 rounded-xl bg-[#0E1526] border border-[#1F2F4A] flex flex-col gap-3">
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[#FF6B6B] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">warning</span>
                Targeted Foundations to Fortify
              </span>
              {profile.weak_concepts && profile.weak_concepts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.weak_concepts.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs font-mono"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#8EA4B8] font-mono">No active weak spots.</div>
              )}
            </div>
          </div>

          {/* Teaching Modes Calibration */}
          <div className="p-5 rounded-xl bg-[#0E1526] border border-[#1F2F4A] flex flex-col gap-3">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">psychology</span>
              Calibrated Pedagogical Preferences
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <span className="text-[#8EA4B8] text-[11px] block mb-1">Effective Teaching Modes:</span>
                {profile.successful_teaching_modes && profile.successful_teaching_modes.length > 0 ? (
                  <ul className="flex flex-col gap-1 text-slate-300">
                    {profile.successful_teaching_modes.map((m, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-[#10B981]">•</span> {m}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[#8EA4B8]">Accumulating telemetry...</span>
                )}
              </div>

              <div>
                <span className="text-[#8EA4B8] text-[11px] block mb-1">Less Effective Modes (Deprioritized):</span>
                {profile.failed_teaching_modes && profile.failed_teaching_modes.length > 0 ? (
                  <ul className="flex flex-col gap-1 text-slate-300">
                    {profile.failed_teaching_modes.map((m, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-rose-400">•</span> {m}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[#8EA4B8]">No negative patterns detected.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
