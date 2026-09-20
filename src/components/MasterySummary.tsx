import React from 'react';
import { useVision } from '../context/VisionContext';

export const MasterySummary: React.FC = () => {
  const { session, resetCurrentSession } = useVision();

  if (!session) return null;

  const targetConcept = session.target_concept || 'Target Concept';
  const taughtConcepts = session.taught_concepts || [];
  const candidatePrereq = session.candidate_prerequisite;

  return (
    <div className="flex flex-col w-full gap-6 max-w-3xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#0E1526] to-[#0E1526] border border-emerald-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="px-2.5 py-1 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            TARGET MASTERED
          </span>
          <span className="text-xs text-[#8EA4B8]">· Autonomous Adaptive Cycle Complete</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Mastery Demonstrated: {targetConcept}
        </h1>
        <p className="text-sm text-[#8EA4B8] mt-2 leading-relaxed">
          You have successfully verified target comprehension and repaired any prerequisite conceptual gaps detected during evaluation.
        </p>
      </div>

      <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-8 shadow-xl flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2F4A] flex flex-col gap-1">
            <span className="text-xs font-mono uppercase text-[#8EA4B8]">Subject</span>
            <span className="text-sm font-semibold text-white">{session.subject || 'Data Structures'}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2F4A] flex flex-col gap-1">
            <span className="text-xs font-mono uppercase text-[#8EA4B8]">Level Calibrated</span>
            <span className="text-sm font-semibold text-emerald-400">{session.learner_level || 'Adaptive'}</span>
          </div>
          <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2F4A] flex flex-col gap-1">
            <span className="text-xs font-mono uppercase text-[#8EA4B8]">Status</span>
            <span className="text-sm font-semibold text-[#00D2FF]">100% Verified</span>
          </div>
        </div>

        {candidatePrereq && (
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
            <span className="material-symbols-outlined text-emerald-400 text-xl mt-0.5">verified</span>
            <div>
              <h4 className="text-sm font-semibold text-white">Prerequisite Repaired & Retested</h4>
              <p className="text-xs text-[#8EA4B8] mt-0.5">
                Successfully diagnosed and repaired foundation in <strong className="text-emerald-400">{candidatePrereq}</strong> before passing target evaluation.
              </p>
            </div>
          </div>
        )}

        {taughtConcepts.length > 0 && (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8EA4B8]">Concepts Covered</h4>
            <div className="flex flex-wrap gap-2">
              {taughtConcepts.map((c: string, idx: number) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-[#090D16] border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-xs">check</span>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#1F2F4A] pt-4">
          <p className="text-xs text-[#8EA4B8]">
            Telemetry and mastery profiles updated in local database.
          </p>
          <button
            onClick={resetCurrentSession}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-[#0099FF] text-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all flex items-center gap-2 cursor-pointer"
          >
            Start New Adaptive Session
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
