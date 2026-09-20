import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const RepairLesson: React.FC = () => {
  const {
    session,
    teachingAction,
    resourceSelection,
    beginPractice,
    loading
  } = useVision();

  const [hintLevel, setHintLevel] = useState<number>(0);

  if (!session) return null;

  const candidatePrereq = session.candidate_prerequisite || 'Foundational Prerequisite';
  const targetConcept = session.target_concept || 'Target Concept';

  const explanation = teachingAction?.explanation || teachingAction?.explanation_text || 'Remediation lesson synthesized by the Tutor Agent to repair prerequisite foundation.';
  const keyTakeaways = teachingAction?.key_takeaways || [];
  const codeExample = teachingAction?.code_example;
  const teachingMode = teachingAction?.teaching_mode || teachingAction?.teaching_strategy || 'Prerequisite Repair Synthesis';

  const workedExample = teachingAction?.worked_example;
  const fadedExample = teachingAction?.faded_example;
  const misconceptionContrast = teachingAction?.misconception_contrast;
  const hintLadder = teachingAction?.hint_ladder || [];

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
          <span className="font-mono text-xs text-slate-300">Strategy: {teachingMode}</span>
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

        {/* Misconception Contrast Warning */}
        {misconceptionContrast && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-rose-950/20 border border-rose-500/30">
            <div className="flex items-center gap-2 text-rose-300 font-mono text-xs uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-sm">healing</span>
              Remediating Misconception
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#06080F] border border-emerald-500/30 flex flex-col gap-1">
                <span className="text-emerald-400 font-mono font-semibold">✓ Correct Mental Model</span>
                <p className="text-[#DFE8F2]">{misconceptionContrast.correct_model}</p>
              </div>
              <div className="p-3 rounded-lg bg-[#06080F] border border-rose-500/30 flex flex-col gap-1">
                <span className="text-rose-400 font-mono font-semibold">✕ What Was Confused</span>
                <p className="text-[#DFE8F2]">{misconceptionContrast.mistaken_model}</p>
              </div>
            </div>
            <p className="text-xs text-rose-200/90 font-mono">
              <strong>Crucial Distinction:</strong> {misconceptionContrast.key_distinction}
            </p>
          </div>
        )}

        {/* Step-by-Step Worked Example */}
        {workedExample && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#06080F] border border-rose-500/30">
            <div className="flex items-center justify-between text-xs font-mono border-b border-[#1F2F4A] pb-2">
              <span className="text-rose-300 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">model_training</span>
                Walkthrough Example for {candidatePrereq}
              </span>
              <span className="text-slate-400">Step-by-step Execution</span>
            </div>
            <div className="text-xs text-rose-200">
              <strong>Scenario:</strong> {workedExample.problem}
            </div>
            <div className="flex flex-col gap-2">
              {workedExample.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-2 rounded bg-[#0E1526] border border-[#1F2F4A] text-xs">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[11px]">
                    Step {step.step_number}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-white font-medium">{step.action}</span>
                    <span className="text-slate-400 text-[11px] italic">Reason: {step.reason}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-xs text-emerald-300 font-mono pt-1">
              <strong>Outcome:</strong> {workedExample.result} — {workedExample.why_this_works}
            </div>
          </div>
        )}

        {/* Faded Example */}
        {fadedExample && (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#0A101D] border border-indigo-500/30">
            <div className="flex items-center gap-2 text-indigo-300 font-mono text-xs uppercase font-bold tracking-wider">
              <span className="material-symbols-outlined text-sm">incomplete_circle</span>
              Prerequisite Scaffolded Practice
            </div>
            <p className="text-xs text-[#DFE8F2]">{fadedExample.problem}</p>
            <div className="p-3 rounded-lg bg-[#06080F] border border-indigo-500/20 text-xs text-indigo-200 flex flex-col gap-1.5">
              <span className="font-semibold text-white">Your Step:</span>
              <p>{fadedExample.faded_step.prompt}</p>
              <span className="text-[11px] text-indigo-400 italic">Hint: {fadedExample.faded_step.scaffold_hint}</span>
            </div>
          </div>
        )}

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

        {/* 5-Level Hint Ladder Preview */}
        {hintLadder.length > 0 && (
          <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase text-rose-300 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">lightbulb</span>
                Remediation Hints Available ({hintLadder.length} Levels)
              </span>
              <button
                onClick={() => setHintLevel(prev => (prev < hintLadder.length ? prev + 1 : 0))}
                className="text-[11px] font-mono text-rose-300 hover:text-white px-2 py-1 rounded bg-[#141F36] border border-[#1F2F4A]"
              >
                {hintLevel === 0 ? 'Preview Hint 1' : hintLevel < hintLadder.length ? `Reveal Hint ${hintLevel + 1}` : 'Collapse Hints'}
              </button>
            </div>
            {hintLevel > 0 && (
              <div className="flex flex-col gap-2 mt-2">
                {hintLadder.slice(0, hintLevel).map((h, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-[#0E1526] border border-[#1F2F4A] text-xs flex items-start gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px]">
                      {h.label}
                    </span>
                    <span className="text-[#DFE8F2]">{h.text}</span>
                  </div>
                ))}
              </div>
            )}
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
