import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';
import { AskTutorWidget } from './AskTutorWidget';

export const RepairLesson: React.FC = () => {
  const {
    session,
    teachingAction,
    resourceSelection,
    beginPractice,
    loading
  } = useVision();

  const [hintLevel, setHintLevel] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!session) return null;

  const candidatePrereq = session.candidate_prerequisite || 'Foundational Prerequisite';
  const targetConcept = session.target_concept || 'Target Concept';

  const definition = teachingAction?.definition || teachingAction?.explanation || 'Remediation lesson synthesized by the Tutor Agent to repair prerequisite foundation.';
  const examples = teachingAction?.examples || [];
  const pythonCode = teachingAction?.pseudocode_python || teachingAction?.code_example || '';
  const keyTakeaways = teachingAction?.key_takeaways || [];
  const teachingMode = teachingAction?.teaching_mode || teachingAction?.teaching_strategy || 'Prerequisite Repair Synthesis';

  const workedExample = teachingAction?.worked_example;
  const fadedExample = teachingAction?.faded_example;
  const misconceptionContrast = teachingAction?.misconception_contrast;
  const hintLadder = teachingAction?.hint_ladder || [];

  const handleCopyCode = () => {
    if (pythonCode) {
      navigator.clipboard.writeText(pythonCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleStartRecheck = async () => {
    await beginPractice(false);
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto">
      {/* Repair Banner */}
      <div className="rounded-xl bg-gradient-to-r from-rose-950/50 via-[#0E1526] to-[#0E1526] border border-rose-500/40 p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-[#FF6B6B] animate-ping" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#FF6B6B] flex items-center gap-1.5">
            <span>🔄 BACKWARD LOOP ACTIVE</span>
            <span>·</span>
            <span>Diagnostic Agent Sent Work Backward to Repair Prerequisite Gap</span>
          </span>
          <span className="text-slate-500">·</span>
          <span className="font-mono text-xs text-slate-300">Strategy: {teachingMode}</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          VISION found a prerequisite issue: <span className="text-[#FF6B6B]">{candidatePrereq}</span>
        </h1>
        <p className="text-xs sm:text-sm text-[#8EA4B8] mt-1 max-w-2xl leading-relaxed">
          Before tackling <strong className="text-white">{targetConcept}</strong> again, let's repair this foundation with a clear definition, practical step-by-step examples, and Python implementation.
        </p>
      </div>

      {/* 1. CONCEPT DEFINITION */}
      <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-7 shadow-xl flex flex-col gap-4 text-[#DFE8F2]">
        <div className="flex items-center justify-between border-b border-[#1F2F4A] pb-3">
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-white uppercase tracking-wider">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-rose-500/20 text-rose-400 text-xs font-black">
              1
            </span>
            <span>Prerequisite Foundation: {candidatePrereq}</span>
          </div>
          <span className="text-xs font-mono text-rose-300 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20">
            Core Mechanics
          </span>
        </div>

        <div className="prose prose-invert max-w-none whitespace-pre-line text-sm sm:text-base text-[#DFE8F2] leading-relaxed font-normal">
          {definition}
        </div>
      </div>

      {/* Misconception Contrast Warning */}
      {misconceptionContrast && (
        <div className="flex flex-col gap-3 p-5 rounded-xl bg-rose-950/20 border border-rose-500/30">
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

      {/* 2. STEP-BY-STEP EXAMPLES */}
      <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-7 shadow-xl flex flex-col gap-5 text-[#DFE8F2]">
        <div className="flex items-center justify-between border-b border-[#1F2F4A] pb-3">
          <div className="flex items-center gap-2 text-sm font-mono font-bold text-white uppercase tracking-wider">
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#10B981]/20 text-[#10B981] text-xs font-black">
              2
            </span>
            <span>Practical Examples for {candidatePrereq}</span>
          </div>
          <span className="text-xs font-mono text-[#10B981] px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/20">
            {examples.length > 0 ? `${examples.length} Worked Scenarios` : 'Step-by-Step Trace'}
          </span>
        </div>

        {examples.length > 0 ? (
          <div className="flex flex-col gap-4">
            {examples.map((ex, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-3 p-4 sm:p-5 rounded-xl bg-[#06080F] border border-[#1F2F4A] hover:border-rose-500/40 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2F4A]/70 pb-2.5">
                  <span className="text-sm font-semibold text-white flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 font-mono text-xs font-bold">
                      Example {idx + 1}
                    </span>
                    <span>{ex.title}</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400">Step Trace</span>
                </div>

                <div className="text-xs sm:text-sm text-slate-300">
                  <strong className="text-white font-mono">Scenario: </strong>
                  {ex.scenario}
                </div>

                {ex.steps && ex.steps.length > 0 && (
                  <div className="flex flex-col gap-2 mt-1">
                    {ex.steps.map((step, sIdx) => (
                      <div
                        key={sIdx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-[#0E1526] border border-[#1F2F4A] text-xs"
                      >
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-[11px] shrink-0 mt-0.5">
                          Step {step.step_number || sIdx + 1}
                        </span>
                        <div className="flex flex-col gap-1 w-full">
                          <span className="text-white font-medium">{step.action}</span>
                          {step.reason && (
                            <span className="text-slate-400 text-[11px] italic">
                              Why: {step.reason}
                            </span>
                          )}
                          {step.state_transition && (
                            <span className="text-rose-300 font-mono text-[11px] bg-[#06080F] px-2 py-1 rounded border border-[#1F2F4A] mt-0.5">
                              State: {step.state_transition}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {ex.visual_or_output && (
                  <div className="p-3 rounded-lg bg-[#0A0F1D] border border-rose-500/20 font-mono text-xs text-rose-300 overflow-x-auto whitespace-pre">
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 font-sans font-bold">
                      Visual / State Diagram:
                    </div>
                    {ex.visual_or_output}
                  </div>
                )}

                <div className="flex flex-col gap-1 pt-1 text-xs">
                  <div className="text-emerald-300 font-mono">
                    <strong>Result:</strong> {ex.result}
                  </div>
                  {ex.explanation && (
                    <div className="text-slate-300 italic">
                      <strong>Principle:</strong> {ex.explanation}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : workedExample ? (
          <div className="flex flex-col gap-3 p-4 rounded-xl bg-[#06080F] border border-rose-500/30">
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
        ) : null}
      </div>

      {/* 3. PYTHON PSEUDOCODE / IMPLEMENTATION */}
      {pythonCode && (
        <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-7 shadow-xl flex flex-col gap-4 text-[#DFE8F2]">
          <div className="flex items-center justify-between border-b border-[#1F2F4A] pb-3">
            <div className="flex items-center gap-2 text-sm font-mono font-bold text-white uppercase tracking-wider">
              <span className="flex items-center justify-center w-6 h-6 rounded-md bg-[#F59E0B]/20 text-[#F59E0B] text-xs font-black">
                3
              </span>
              <span>Python Reference Implementation</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#F59E0B] px-2 py-0.5 rounded bg-[#F59E0B]/10 border border-[#F59E0B]/20">
                Python 3
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1 rounded bg-[#141F36] hover:bg-[#1A2844] border border-[#1F2F4A] text-xs font-mono text-slate-200 hover:text-white transition-colors flex items-center gap-1.5"
                title="Copy Python Code"
              >
                <span className="material-symbols-outlined text-xs">
                  {copiedCode ? 'check' : 'content_copy'}
                </span>
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl bg-[#06080F] border border-[#1F2F4A] p-4 font-mono text-xs overflow-x-auto relative">
            <pre className="text-sky-200 whitespace-pre leading-relaxed">
              <code>{pythonCode}</code>
            </pre>
          </div>
        </div>
      )}

      {/* Hint Ladder & Takeaways */}
      {hintLadder.length > 0 && (
        <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-rose-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">lightbulb</span>
              Remediation Hints Available ({hintLadder.length} Levels)
            </span>
            <button
              onClick={() => setHintLevel(prev => (prev < hintLadder.length ? prev + 1 : 0))}
              className="text-[11px] font-mono text-rose-300 hover:text-white px-2.5 py-1 rounded bg-[#141F36] border border-[#1F2F4A]"
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
            Key Remediation Takeaways
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

      {/* Ask Tutor Q&A */}
      <AskTutorWidget />

      {/* Primary Action CTA */}
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
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#FF6B6B] hover:bg-rose-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all shadow-[0_0_20px_rgba(255,107,107,0.35)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
