import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const PrereqQuiz: React.FC = () => {
  const { session, submitPrereqQuiz, loading } = useVision();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const quiz = session?.prereq_quiz || {};
  const prerequisiteName = quiz.prerequisite || session?.candidate_prerequisite || 'Prerequisite';
  const targetConcept = session?.target_concept || 'Target Concept';
  const questions: Array<{
    id?: string | number;
    question: string;
    options?: Record<string, string> | string[];
    correct_answer?: string;
    correct_index?: number;
    explanation?: string;
  }> = quiz.questions || [];

  const handleSelectOption = (questionKey: string, optionKey: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: optionKey
    }));
  };

  const isAllAnswered =
    questions.length > 0 &&
    questions.every((q, idx) => {
      const qKey = String(q.id !== undefined ? q.id : idx);
      return answers[qKey] !== undefined && answers[qKey] !== '';
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered) return;
    submitPrereqQuiz(answers);
  };

  return (
    /* Modal Backdrop with Slight Blur */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Centered Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#090E1A] border border-[#1F2F4A] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col my-auto max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#1F2F4A] bg-[#060910]/80 flex flex-col gap-3">
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-base">quiz</span>
              <span>
                <strong>Prerequisite Diagnostic Check:</strong> Testing <span className="text-white font-bold">{prerequisiteName}</span>
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
              Pass: ≥ 70%
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00D2FF] text-lg">science</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D2FF]">
                Diagnostic Probe · {prerequisiteName}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Verifying foundation before advancing to <span className="text-[#00D2FF]">{targetConcept}</span>
            </h2>
            <p className="text-xs text-[#8EA4B8]">
              Scoring 70% or higher unlocks {targetConcept} directly; otherwise we will strengthen your {prerequisiteName} foundation first.
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-5 max-h-[50vh]">
          {questions.map((q, idx) => {
            const qKey = String(q.id !== undefined ? q.id : idx);
            const selectedOpt = answers[qKey];
            const optionsObj = q.options || {};
            const optionEntries = Array.isArray(optionsObj)
              ? optionsObj.map((val, i) => [String.fromCharCode(97 + i), val] as [string, string])
              : Object.entries(optionsObj);

            return (
              <div
                key={qKey}
                className="p-4 rounded-xl bg-[#0F172A]/90 border border-[#1F2F4A] flex flex-col gap-3"
              >
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#141F36] text-[#00D2FF] text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-[#1F2F4A]">
                    Q{idx + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-semibold text-white leading-snug">{q.question}</p>
                </div>

                <div className="grid grid-cols-1 gap-2 pl-9">
                  {optionEntries.map(([key, text]) => {
                    const isSelected = selectedOpt === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => handleSelectOption(qKey, key)}
                        className={`p-2.5 rounded-lg text-left text-xs font-mono transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'bg-[#00D2FF]/20 border border-[#00D2FF] text-[#00D2FF] font-bold shadow-[0_0_12px_rgba(0,210,255,0.15)]'
                            : 'bg-[#141F36]/60 border border-[#1F2F4A] text-slate-300 hover:bg-[#141F36] hover:border-slate-500'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] uppercase font-bold shrink-0 ${
                            isSelected
                              ? 'bg-[#00D2FF] text-black'
                              : 'bg-[#06080F] border border-[#1F2F4A] text-slate-400'
                          }`}
                        >
                          {key}
                        </span>
                        <span className="flex-1">{text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1F2F4A] bg-[#060910]/80 flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400">
            {Object.keys(answers).length} of {questions.length} answered
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isAllAnswered || loading}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 ${
              isAllAnswered && !loading
                ? 'bg-[#00D2FF] text-black hover:bg-cyan-400 shadow-[0_0_16px_rgba(0,210,255,0.4)] cursor-pointer'
                : 'bg-[#141F36] text-slate-500 border border-[#1F2F4A] cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Evaluating Diagnostic (≥ 70%)...</span>
              </>
            ) : (
              <>
                <span>Submit Diagnostic Answers</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
