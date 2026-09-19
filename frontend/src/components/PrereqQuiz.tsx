import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const PrereqQuiz: React.FC = () => {
  const { session, submitPrereqQuiz, loading } = useVision();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const quiz = session?.prereq_quiz || {};
  const prerequisiteName = quiz.prerequisite || session?.candidate_prerequisite || 'Prerequisite';
  const targetConcept = session?.target_concept || 'Target Concept';
  const questions: Array<{
    id: string;
    question: string;
    options?: Record<string, string> | string[];
    correct_answer?: string;
  }> = quiz.questions || [];

  const handleSelectOption = (questionId: string, optionKey: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  const isAllAnswered =
    questions.length > 0 && questions.every((q) => answers[q.id] !== undefined && answers[q.id] !== '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered) return;
    submitPrereqQuiz(answers);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner indicating diagnostic threshold */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200 text-xs font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-400 text-base">quiz</span>
          <span>
            <strong>Prerequisite Diagnostic Check:</strong> Answer these questions on <span className="text-white font-bold">{prerequisiteName}</span>.
          </span>
        </div>
        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
          Passing Score: ≥ 70%
        </span>
      </div>

      <div className="p-6 rounded-2xl bg-[#0E1526] border border-[#1F2F4A] shadow-xl flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00D2FF] text-xl">science</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D2FF]">
              Diagnostic Probe · {prerequisiteName}
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Testing your foundation before advancing to <span className="text-[#00D2FF]">{targetConcept}</span>
          </h2>
          <p className="text-xs text-[#8EA4B8]">
            Scoring 70% or higher confirms you have the required foundation to start learning {targetConcept} directly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          {questions.map((q, idx) => {
            const selectedOpt = answers[q.id];
            const optionsObj = q.options || {};
            const optionEntries = Array.isArray(optionsObj)
              ? optionsObj.map((val, i) => [String.fromCharCode(97 + i), val] as [string, string])
              : Object.entries(optionsObj);

            return (
              <div
                key={q.id || idx}
                className="p-5 rounded-xl bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded-full bg-[#141F36] text-[#00D2FF] text-xs font-mono font-bold flex items-center justify-center shrink-0 border border-[#1F2F4A]">
                    Q{idx + 1}
                  </span>
                  <p className="text-sm font-semibold text-white leading-snug">{q.question}</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5 pl-9">
                  {optionEntries.map(([key, text]) => {
                    const isSelected = selectedOpt === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => handleSelectOption(q.id, key)}
                        className={`p-3 rounded-lg text-left text-xs font-mono transition-all flex items-center gap-3 ${
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

          <button
            type="submit"
            disabled={!isAllAnswered || loading}
            className={`w-full py-3.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              isAllAnswered && !loading
                ? 'bg-[#00D2FF] text-black hover:bg-cyan-400 shadow-[0_0_16px_rgba(0,210,255,0.4)] cursor-pointer'
                : 'bg-[#141F36] text-slate-500 border border-[#1F2F4A] cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Evaluating Quiz (70% Threshold Check)...</span>
              </>
            ) : (
              <>
                <span>Submit Diagnostic Answers</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
