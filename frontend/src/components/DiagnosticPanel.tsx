import React from 'react';
import { useVision } from '../context/VisionContext';

interface DiagnosticPanelProps {
  onProceedToRepair?: () => void;
}

export const DiagnosticPanel: React.FC<DiagnosticPanelProps> = ({ onProceedToRepair }) => {
  const { session, evaluation } = useVision();

  if (!session) return null;

  const targetConcept = session.target_concept || 'Target Concept';
  const candidatePrereq = session.candidate_prerequisite || evaluation?.prerequisite_gap || 'Prerequisite Deficit';
  const reasoning = evaluation?.reasoning || 'Diagnostic Agent analyzed student error trace against course dependency DAG.';
  const confidence = evaluation?.score !== undefined ? (typeof evaluation.score === 'number' ? `${Math.round(evaluation.score * 100)}%` : evaluation.score) : 'High Confidence';

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto">
      {/* Diagnostic Header */}
      <div className="rounded-xl bg-rose-950/40 border border-rose-500/40 p-5 sm:p-6 shadow-xl flex flex-col gap-3 relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <span className="material-symbols-outlined text-base">troubleshoot</span>
            <span>Diagnostic Agent · Root Cause Hypothesis</span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Validated DAG Edge
          </span>
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">
          Prerequisite Gap Detected: <span className="text-rose-400 underline decoration-rose-500/40 underline-offset-4">{candidatePrereq}</span>
        </h2>

        <p className="text-sm text-[#8EA4B8] leading-relaxed">
          VISION detected that your misunderstanding of <strong className="text-white">{targetConcept}</strong> stems from a foundational gap in <strong className="text-rose-300">{candidatePrereq}</strong>. The system will remediate this prerequisite before returning to the target concept.
        </p>
      </div>

      {/* Hypothesis & Evidence Card */}
      <div className="rounded-2xl bg-[#0E1526] border border-[#1F2F4A] p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
        <div className="text-xs font-mono uppercase tracking-wider text-[#8EA4B8] pb-2 border-b border-[#1F2F4A]">
          Hypothesis Validation Telemetry
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-1">
            <span className="text-[11px] font-mono text-[#8EA4B8]">Original Target</span>
            <span className="text-sm font-semibold text-white truncate">{targetConcept}</span>
          </div>

          <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 flex flex-col gap-1">
            <span className="text-[11px] font-mono text-rose-300">Candidate Prerequisite</span>
            <span className="text-sm font-semibold text-rose-200 truncate">{candidatePrereq}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-1">
            <span className="text-[11px] font-mono text-[#8EA4B8]">Diagnostic Confidence</span>
            <span className="text-sm font-semibold text-[#00D2FF]">{confidence}</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-sky-400">
            Diagnostic Reasoning
          </span>
          <div className="text-xs text-slate-300 leading-relaxed font-mono">
            {reasoning}
          </div>
        </div>

        {/* Visual Edge Trace */}
        <div className="p-4 rounded-xl bg-[#0B111E] border border-[#1F2F4A] flex items-center justify-center gap-4 flex-wrap text-xs font-mono">
          <div className="px-3 py-2 rounded-lg bg-[#141F36] border border-slate-600 text-slate-300">
            {targetConcept}
          </div>
          <div className="flex items-center text-rose-400">
            <span className="material-symbols-outlined text-sm">arrow_backward</span>
            <span className="text-[10px] mx-1 uppercase">Depends on</span>
          </div>
          <div className="px-3 py-2 rounded-lg bg-rose-950/60 border border-rose-500/60 text-rose-200 font-bold shadow-[0_0_12px_rgba(255,107,107,0.3)]">
            {candidatePrereq} (Deficit)
          </div>
        </div>

        {onProceedToRepair && (
          <div className="flex justify-end pt-2">
            <button
              onClick={onProceedToRepair}
              className="px-6 py-3 rounded-xl bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_16px_rgba(0,210,255,0.3)] flex items-center gap-2"
            >
              <span>Proceed to Prerequisite Remediation</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
