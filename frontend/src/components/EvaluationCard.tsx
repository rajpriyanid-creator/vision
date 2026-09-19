import React from 'react';
import { EvaluationResult } from '../types/vision';

interface EvaluationCardProps {
  evaluation?: EvaluationResult | null;
}

export const EvaluationCard: React.FC<EvaluationCardProps> = ({ evaluation }) => {
  if (!evaluation) return null;

  const status = (evaluation.status || 'evaluated').toLowerCase();
  const isDemonstrated = status === 'demonstrated' || status === 'passed' || status === 'mastered';
  const isUncertain = status === 'uncertain' || status === 'ambiguous';
  const isUnresolved = status === 'unresolved' || status === 'failed' || (!isDemonstrated && !isUncertain);

  let badgeBg = 'bg-rose-500/20 text-[#FF6B6B] border-rose-500/40';
  let badgeIcon = 'cancel';
  let badgeText = 'Prerequisite Gap Detected';
  let cardBorder = 'border-rose-500/30';

  if (isDemonstrated) {
    badgeBg = 'bg-emerald-500/20 text-[#10B981] border-emerald-500/40';
    badgeIcon = 'check_circle';
    badgeText = 'Concept Demonstrated';
    cardBorder = 'border-emerald-500/30';
  } else if (isUncertain) {
    badgeBg = 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40';
    badgeIcon = 'help_outline';
    badgeText = 'Evaluation Uncertain — Disambiguation Required';
    cardBorder = 'border-amber-500/30';
  }

  return (
    <div
      className={`rounded-xl bg-[#0E1526]/95 border ${cardBorder} p-5 sm:p-6 shadow-xl flex flex-col gap-4 relative overflow-hidden backdrop-blur-md`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2F4A] pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`px-3 py-1 rounded-lg border text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 ${badgeBg}`}
          >
            <span className="material-symbols-outlined text-sm">{badgeIcon}</span>
            {badgeText}
          </span>
          <span className="text-xs font-mono text-[#8EA4B8]">
            Status: <strong className="text-white">{evaluation.status}</strong>
          </span>
        </div>

        {evaluation.score !== undefined && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#06080F] border border-[#1F2F4A] font-mono text-xs">
            <span className="text-[#8EA4B8]">Score:</span>
            <span
              className={`font-bold ${
                isDemonstrated
                  ? 'text-[#10B981]'
                  : isUncertain
                  ? 'text-[#F59E0B]'
                  : 'text-[#FF6B6B]'
              }`}
            >
              {typeof evaluation.score === 'number'
                ? evaluation.score.toFixed(2)
                : evaluation.score}
            </span>
          </div>
        )}
      </div>

      {/* Feedback */}
      {evaluation.feedback && (
        <div className="text-sm sm:text-base text-white leading-relaxed font-normal">
          {evaluation.feedback}
        </div>
      )}

      {/* Reasoning */}
      {evaluation.reasoning && (
        <div className="p-3.5 rounded-lg bg-[#06080F] border border-[#1F2F4A] text-xs font-mono text-[#8EA4B8] flex flex-col gap-1">
          <span className="text-sky-300 font-semibold uppercase tracking-wider">
            Evaluation Agent Diagnostic Reasoning:
          </span>
          <div className="leading-relaxed text-slate-300">{evaluation.reasoning}</div>
        </div>
      )}

      {/* Prerequisite Gap identified */}
      {evaluation.prerequisite_gap && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/30 text-xs font-mono text-rose-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-base text-rose-400">warning</span>
          <span>
            Identified Root Prerequisite Deficit: <strong>{evaluation.prerequisite_gap}</strong>
          </span>
        </div>
      )}

      {/* Next Recommendation */}
      {evaluation.next_recommendation && (
        <div className="flex items-center gap-2 text-xs font-mono text-sky-400 pt-1">
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
          <span>Recommendation: {evaluation.next_recommendation}</span>
        </div>
      )}
    </div>
  );
};
