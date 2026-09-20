import React, { useEffect } from 'react';
import { useVision } from '../context/VisionContext';

interface StudentProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StudentProfileDrawer: React.FC<StudentProfileDrawerProps> = ({ isOpen, onClose }) => {
  const {
    studentId,
    setStudentId,
    studentProfile,
    loadStudentProfile,
    studentSessions,
    loadStudentSessions,
    loadSession
  } = useVision();

  useEffect(() => {
    if (isOpen) {
      loadStudentProfile(studentId);
      loadStudentSessions(studentId);
    }
  }, [isOpen, studentId, loadStudentProfile, loadStudentSessions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-md bg-[#0E1526] border-l border-[#1F2F4A] h-full flex flex-col p-6 shadow-2xl overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#1F2F4A] pb-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00D2FF]">person</span>
            <h2 className="text-base font-semibold text-white font-mono">Learner Profile & Telemetry</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[#141F36] text-[#8EA4B8] hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="flex flex-col gap-6">
          {/* Switch Student ID */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[#8EA4B8]">
              Active Learner ID
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="student_001"
                className="flex-1 rounded-xl bg-[#090D16] border border-[#1F2F4A] px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#00D2FF]"
              />
              <button
                onClick={() => {
                  loadStudentProfile(studentId);
                  loadStudentSessions(studentId);
                }}
                className="px-3 py-2 rounded-xl bg-[#141F36] hover:bg-[#1F2F4A] text-xs font-semibold text-white border border-[#1F2F4A]"
              >
                Sync
              </button>
            </div>
          </div>

          {/* Mastered Concepts */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8EA4B8]">
              Demonstrated Masteries
            </h3>
            {studentProfile?.mastered_concepts && studentProfile.mastered_concepts.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {studentProfile.mastered_concepts.map((c, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">check</span>
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8EA4B8] italic">No masteries recorded yet for this ID.</p>
            )}
          </div>

          {/* Historical Sessions */}
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#8EA4B8]">
              Recent Study Sessions
            </h3>
            {studentSessions && studentSessions.length > 0 ? (
              <div className="flex flex-col gap-2">
                {studentSessions.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#090D16] border border-[#1F2F4A] flex items-center justify-between hover:border-[#00D2FF]/40 transition-all cursor-pointer"
                    onClick={() => {
                      loadSession(s.run_id);
                      onClose();
                    }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-semibold text-white">
                        {s.target_concept || s.course || 'Study Session'}
                      </span>
                      <span className="font-mono text-[10px] text-[#8EA4B8]">{s.run_id}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/20">
                      {s.status || s.current_state || 'active'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-[#8EA4B8] italic">No prior sessions found.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
