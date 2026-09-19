import React from 'react';
import { useVision } from '../context/VisionContext';

export const RepairLesson: React.FC = () => {
  const {
    session,
    teachingAction,
    resourceSelection,
    beginPractice,
    loading
  } = useVision();

  if (!session) return null;

  const candidatePrereq = session.candidate_prerequisite || 'Foundational Prerequisite';
  const targetConcept = session.target_concept || 'Target Concept';

  const explanation = teachingAction?.explanation || teachingAction?.explanation_text || 'Remediation lesson synthesized by the Tutor Agent to repair prerequisite foundation.';
  const keyTakeaways = teachingAction?.key_takeaways || [];
  const codeExample = teachingAction?.code_example;
  const teachingMode = teachingAction?.teaching_mode || 'Prerequisite Repair Synthesis';

  const handleStartRecheck = async () => {
    await beginPractice(false);
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto">
      {/* Repair Banner */}
      <div className="rounded-xl bg-gradient-to-r from-rose-950/50 via-[#0E1526] to-[#0E1526] border border-rose-500/40 p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[#FF6B6B] animate-ping" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF6B6B]">
            Prerequisite Remediation Cycle
          </span>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-xs text-slate-300">Mode: {teachingMode}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          VISION found a prerequisite issue: <span className="text-[#FF6B6B]">{candidatePrereq}</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#8EA4B8] mt-1 max-w-2xl leading-relaxed">
          Before tackling <strong className="text-white">{targetConcept}</strong> again, let's repair this foundation so you understand the core mechanics with full clarity.
        </p>
      </div>

      {/* Repair Content Card */}
      <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-8 shadow-2xl flex flex-col gap-6 text-sm text-[#DFE8F2] leading-relaxed">
        <div className="prose prose-invert max-w-none whitespace-pre-line text-base text-[#DFE8F2]/90 leading-relaxed font-normal">
          {explanation}
        </div>

        {codeExample && (
          <div className="flex flex-col gap-2 rounded-lg bg-[#06080F] border border-rose-500/20 p-4 font-mono text-xs overflow-x-auto">
            <div className="flex items-center justify-between text-[#8EA4B8] text-[11px] pb-2 border-b border-[#1F2F4A]">
              <span className="uppercase tracking-wider text-rose-300 font-bold">
                Foundation Code Walkthrough: {candidatePrereq}
              </span>
              <span className="text-sky-400">Tutor Remediation</span>
            </div>
            <pre className="text-sky-200 mt-2 whitespace-pre leading-5">
              <code>{codeExample}</code>
            </pre>
          </div>
        )}

        {keyTakeaways.length > 0 && (
          <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#06080F] border border-rose-500/20">
            <span className="text-xs font-mono font-semibold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">build</span>
              Remediation Invariants to Master
            </span>
            <ul className="flex flex-col gap-1.5 text-xs text-[#DFE8F2]">
              {keyTakeaways.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-[#FF6B6B] font-mono mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {resourceSelection && resourceSelection.recommended_links && resourceSelection.recommended_links.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-[#1F2F4A]">
            <span className="text-xs font-mono text-[#8EA4B8] uppercase tracking-wider">
              Remediation References:
            </span>
            <div className="flex flex-wrap gap-2">
              {resourceSelection.recommended_links.map((link, idx) => {
                const title = typeof link === 'string' ? link : link.title || link.url || 'Reference';
                const url = typeof link === 'string' ? link : link.url || '#';
                return (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#06080F] border border-[#1F2F4A] hover:border-rose-400 text-xs font-mono text-rose-300 hover:text-white transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-xs">open_in_new</span>
                    <span>{title}</span>
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <div className="p-5 rounded-xl bg-[#0B111E] border border-rose-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">
            Foundation reviewed?
          </span>
          <span className="text-xs text-[#8EA4B8]">
            Test your understanding of <strong className="text-rose-300">{candidatePrereq}</strong> to verify the repair.
          </span>
        </div>

        <button
          onClick={handleStartRecheck}
          disabled={loading}
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#FF6B6B] hover:bg-rose-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(255,107,107,0.35)] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="material-symbols-outlined text-base animate-spin">sync</span>
              <span>Loading Prerequisite Check...</span>
            </>
          ) : (
            <>
              <span>I Understand — Check Prerequisite</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
