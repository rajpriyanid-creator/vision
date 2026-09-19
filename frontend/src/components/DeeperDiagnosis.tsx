import React from 'react';
import { useVision } from '../context/VisionContext';

export const DeeperDiagnosis: React.FC = () => {
  const { session, evaluation } = useVision();

  if (!session) return null;

  const target = session.target_concept || 'Target';
  const currentPrereq = session.candidate_prerequisite || 'Current Prerequisite';
  const chain = session.prereq_chain || [];
  const backtrackCount = session.backtrack_count || chain.length || 2;

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto">
      <div className="rounded-xl bg-purple-950/40 border border-purple-500/40 p-5 sm:p-6 shadow-xl flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2 text-purple-300 font-mono text-xs font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-base">alt_route</span>
          <span>Multi-Level Prerequisite Tracing · Depth {backtrackCount}</span>
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">
          Prerequisite Still Unresolved: Going Deeper Upstream
        </h2>

        <p className="text-xs sm:text-sm text-[#8EA4B8] leading-relaxed">
          The initial prerequisite remediation for <strong className="text-white">{currentPrereq}</strong> did not resolve the error. Diagnostic Agent is traversing the dependency DAG to find the upstream precursor.
        </p>
      </div>

      <div className="rounded-2xl bg-[#0E1526] border border-[#1F2F4A] p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        <span className="text-xs font-mono uppercase tracking-wider text-[#8EA4B8]">
          Backtracking Traversal Path:
        </span>

        {/* Visual Backtrack Flow */}
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="px-4 py-2 rounded-xl bg-[#141F36] border border-slate-600 text-slate-200 text-xs font-mono">
            {target} (Original Target)
          </div>

          <span className="material-symbols-outlined text-sm text-slate-500">arrow_downward</span>

          <div className="px-4 py-2 rounded-xl bg-rose-950/50 border border-rose-500/50 text-rose-300 text-xs font-mono">
            {currentPrereq} (Initial Prerequisite — Unresolved)
          </div>

          <span className="material-symbols-outlined text-sm text-purple-400 animate-bounce">arrow_downward</span>

          <div className="px-5 py-2.5 rounded-xl bg-purple-950/70 border border-purple-400 text-purple-200 text-xs font-mono font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]">
            Upstream Root Precursor (Diagnostic In-Progress)
          </div>
        </div>

        {evaluation && evaluation.reasoning && (
          <div className="p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] text-xs font-mono text-[#8EA4B8]">
            <div className="text-purple-300 font-semibold mb-1">Diagnostic Agent Analysis:</div>
            <div>{evaluation.reasoning}</div>
          </div>
        )}
      </div>
    </div>
  );
};
