import React from 'react';
import { useVision } from '../context/VisionContext';

interface MasteryViewProps {
  onNewSession: () => void;
  onViewHistory: () => void;
}

export const MasteryView: React.FC<MasteryViewProps> = ({ onNewSession, onViewHistory }) => {
  const { session, evaluation } = useVision();

  if (!session) return null;

  const targetConcept = session.target_concept || 'Target Concept';
  const taughtConcepts = session.taught_concepts || [];
  const score = evaluation?.score;
  const feedback = evaluation?.feedback || 'You have demonstrated complete mastery of this concept and its prerequisite invariants.';
  const nextRec = evaluation?.next_recommendation || 'Ready to advance to subsequent concepts in the syllabus.';

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto py-4">
      {/* Mastery Hero Card */}
      <div className="rounded-2xl bg-gradient-to-b from-[#0E1526] to-[#060910] border border-[#10B981]/50 p-8 sm:p-10 shadow-[0_0_40px_rgba(16,185,129,0.25)] flex flex-col items-center text-center gap-6 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-16 h-16 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/60 flex items-center justify-center text-[#10B981] shadow-[0_0_24px_rgba(16,185,129,0.4)]">
          <span className="material-symbols-outlined text-4xl">workspace_premium</span>
        </div>

        <div className="flex flex-col gap-2 max-w-xl">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#10B981]">
            Concept Mastered · Verification Complete
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {targetConcept}
          </h1>
          <p className="text-sm text-[#DFE8F2] leading-relaxed mt-2">
            {feedback}
          </p>
        </div>

        {score !== undefined && (
          <div className="px-5 py-2.5 rounded-xl bg-[#06080F] border border-[#10B981]/40 flex items-center gap-3 font-mono text-sm">
            <span className="text-[#8EA4B8]">Final Evaluation Score:</span>
            <span className="text-[#10B981] font-bold text-lg">
              {typeof score === 'number' ? `${Math.round(score * 100)}%` : score}
            </span>
          </div>
        )}

        {/* Repaired / Mastered Concepts */}
        {taughtConcepts.length > 0 && (
          <div className="w-full max-w-md p-4 rounded-xl bg-[#0A101D] border border-[#1F2F4A] flex flex-col gap-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8EA4B8] text-left">
              Synthesized Concepts:
            </span>
            <div className="flex flex-wrap gap-2">
              {taughtConcepts.map((concept, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono text-xs flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-xs">check</span>
                  {concept}
                </span>
              ))}
            </div>
          </div>
        )}

        {nextRec && (
          <div className="text-xs font-mono text-sky-300 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>Next Suggested Action: {nextRec}</span>
          </div>
        )}

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4 border-t border-[#1F2F4A] w-full max-w-md">
          <button
            onClick={onNewSession}
            className="px-6 py-3 rounded-xl bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_18px_rgba(0,210,255,0.35)] flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Start Next Topic</span>
          </button>

          <button
            onClick={onViewHistory}
            className="px-5 py-3 rounded-xl bg-[#141F36] hover:bg-[#1C2740] border border-[#1F2F4A] text-slate-200 font-mono text-xs tracking-wider transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-base">history</span>
            <span>Session History</span>
          </button>
        </div>
      </div>
    </div>
  );
};
