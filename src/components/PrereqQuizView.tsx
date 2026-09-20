import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const PrereqQuizView: React.FC = () => {
  const { session, submitPrereqQuiz, loading } = useVision();
  const quiz = session?.prereq_quiz;
  const questions = quiz?.questions || [];
  const conceptTitle = quiz?.concept_title || quiz?.concept || 'Prerequisite Diagnostic';

  const [answers, setAnswers] = useState<Record<string, any>>({});

  if (!quiz || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#0B111E] rounded-2xl border border-[#1F2F4A]">
        <span className="material-symbols-outlined text-4xl text-[#00D2FF] mb-2 animate-spin">sync</span>
        <p className="text-sm text-[#8EA4B8]">Loading diagnostic quiz...</p>
      </div>
    );
  }

  const allAnswered = questions.every((q, idx) => {
    const qKey = q.id !== undefined ? String(q.id) : String(idx);
    return answers[qKey] !== undefined;
  });

  const handleSubmit = async () => {
    await submitPrereqQuiz(answers);
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-3xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-r from-[#0B111E] via-[#0E1526] to-[#0B111E] border border-[#00D2FF]/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="px-2.5 py-1 rounded bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-ping" />
            DIAGNOSTIC AGENT
          </span>
          <span className="text-xs text-[#8EA4B8]">· 70% Mastery Benchmark</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Prerequisite Diagnostic: {conceptTitle}
        </h1>
        <p className="text-sm text-[#8EA4B8] mt-2 leading-relaxed">
          Quick verification check to confirm baseline mechanics before progressing to advanced concepts.
        </p>
      </div>

      <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-8 shadow-xl flex flex-col gap-6">
        <div className="flex flex-col gap-6">
          {questions.map((q, qIdx) => {
            const qKey = q.id !== undefined ? String(q.id) : String(qIdx);
            const currentAnswer = answers[qKey];

            // Normalize options
            let optionsList: Array<{ key: string; label: string }> = [];
            if (Array.isArray(q.options)) {
              optionsList = q.options.map((opt: any, optIdx: number) => ({
                key: String(opt),
                label: String(opt)
              }));
            } else if (typeof q.options === 'object' && q.options !== null) {
              optionsList = Object.entries(q.options).map(([k, v]) => ({
                key: k,
                label: `${k}) ${v}`
              }));
            }

            return (
              <div
                key={qKey}
                className="p-5 rounded-xl bg-[#090D16] border border-[#1F2F4A] flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <span className="px-2 py-0.5 rounded bg-[#00D2FF]/10 text-[#00D2FF] font-mono text-xs font-bold border border-[#00D2FF]/20 mt-0.5">
                    Q{qIdx + 1}
                  </span>
                  <p className="text-sm font-medium text-white leading-relaxed">{q.question}</p>
                </div>

                <div className="flex flex-col gap-2 pl-9">
                  {optionsList.map((opt) => {
                    const isSelected = currentAnswer === opt.key || currentAnswer === opt.label;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() =>
                          setAnswers((prev) => ({
                            ...prev,
                            [qKey]: opt.key
                          }))
                        }
                        className={`p-3 rounded-lg border text-left text-xs transition-all flex items-center justify-between ${
                          isSelected
                            ? 'border-[#00D2FF] bg-[#00D2FF]/15 text-white font-medium ring-1 ring-[#00D2FF]'
                            : 'border-[#1F2F4A] bg-[#0E1526] text-[#8EA4B8] hover:border-[#2D4266] hover:text-white'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-[#00D2FF] text-base">
                            check_circle
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-[#1F2F4A] pt-4">
          <p className="text-xs text-[#8EA4B8]">
            {allAnswered ? 'All questions answered' : `Answer all ${questions.length} questions to submit`}
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading || !allAnswered}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-[#0099FF] text-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                Scoring Diagnostic...
              </>
            ) : (
              <>
                Submit Diagnostic
                <span className="material-symbols-outlined text-base">check</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
