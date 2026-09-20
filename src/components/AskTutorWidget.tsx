import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const AskTutorWidget: React.FC = () => {
  const { session, askTutor, loading } = useVision();
  const [questionText, setQuestionText] = useState<string>('');
  const [isAsking, setIsAsking] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{ question: string; answer: string; key_takeaway?: string } | null>(null);

  if (!session) return null;

  const activeConcept = session.active_concept || session.target_id || 'Concept';
  const conceptTitle = session.concept_titles?.[activeConcept] || session.target_concept || 'Active Concept';
  const qnaHistory = session.tutor_qna_history || [];

  const handleAsk = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!questionText.trim() || isAsking) return;

    const q = questionText.trim();
    setQuestionText('');
    setIsAsking(true);

    const res = await askTutor(q);
    if (res) {
      setLastAnswer({ question: q, answer: res.answer, key_takeaway: res.key_takeaway });
    }
    setIsAsking(false);
  };

  const handleQuickQuestion = (q: string) => {
    setQuestionText(q);
  };

  return (
    <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-5 sm:p-6 shadow-xl flex flex-col gap-4 text-[#DFE8F2]">
      <div className="flex items-center justify-between border-b border-[#1F2F4A] pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00D2FF] animate-pulse" />
          <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
            Ask Tutor Agent
          </span>
          <span className="text-slate-500">·</span>
          <span className="text-xs text-[#00D2FF] font-medium truncate max-w-[200px]">
            {conceptTitle}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#00D2FF] px-2 py-0.5 rounded bg-[#00D2FF]/10 border border-[#00D2FF]/20">
          Live Pedagogical Support
        </span>
      </div>

      {/* Suggested Quick Questions */}
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="text-slate-400 font-mono text-[11px] self-center mr-1">Quick prompts:</span>
        {[
          `What is the core invariant of ${conceptTitle}?`,
          `Why does this concept matter in practice?`,
          `Can you explain step-by-step with a simple analogy?`
        ].map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickQuestion(prompt)}
            className="px-2.5 py-1 rounded-lg bg-[#06080F] hover:bg-[#141F36] border border-[#1F2F4A] text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer text-left"
          >
            "{prompt}"
          </button>
        ))}
      </div>

      {/* Question Form */}
      <form onSubmit={handleAsk} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={questionText}
          onChange={(e) => setQuestionText(e.target.value)}
          placeholder={`Ask a question about ${conceptTitle}...`}
          disabled={isAsking || loading}
          className="flex-1 px-4 py-2.5 rounded-xl bg-[#06080F] border border-[#1F2F4A] focus:border-[#00D2FF] focus:outline-none text-xs text-white placeholder-slate-500"
        />
        <button
          type="submit"
          disabled={!questionText.trim() || isAsking || loading}
          className="px-5 py-2.5 rounded-xl bg-[#00D2FF] hover:bg-[#33DCFF] text-black font-mono font-bold text-xs transition-all shadow-[0_0_15px_rgba(0,210,255,0.25)] disabled:opacity-40 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
        >
          {isAsking ? (
            <>
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
              <span>Thinking...</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">send</span>
              <span>Ask Tutor</span>
            </>
          )}
        </button>
      </form>

      {/* Latest or Historical Q&A */}
      {(lastAnswer || qnaHistory.length > 0) && (
        <div className="flex flex-col gap-3 mt-2 pt-3 border-t border-[#1F2F4A]">
          <span className="text-[11px] font-mono font-bold text-[#00D2FF] uppercase tracking-wider">
            Tutor Responses ({qnaHistory.length})
          </span>

          {qnaHistory.slice().reverse().map((item, idx) => (
            <div key={idx} className="flex flex-col gap-2 p-3.5 rounded-xl bg-[#06080F] border border-[#1F2F4A]">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold border-b border-[#1F2F4A]/60 pb-2">
                <span className="material-symbols-outlined text-sm text-[#00D2FF]">help</span>
                <span>"{item.question}"</span>
              </div>
              <p className="text-xs text-[#DFE8F2] leading-relaxed whitespace-pre-line font-normal">
                {item.answer}
              </p>
              {item.key_takeaway && (
                <div className="p-2 rounded-lg bg-[#0E1526] border border-[#00D2FF]/20 text-[11px] text-[#00D2FF] font-mono flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">lightbulb</span>
                  <span><strong>Key Takeaway:</strong> {item.key_takeaway}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
