import React from 'react';
import { SessionState, EvaluationResult, AgentEvent } from '../types/vision';

interface AdaptiveDecisionProps {
  currentState: SessionState;
  evaluation?: EvaluationResult | null;
  events?: AgentEvent[];
  candidatePrerequisite?: string;
  targetConcept?: string;
  onProceed?: () => void;
  proceedLabel?: string;
}

export const AdaptiveDecision: React.FC<AdaptiveDecisionProps> = ({
  currentState,
  evaluation,
  events = [],
  candidatePrerequisite,
  targetConcept,
  onProceed,
  proceedLabel
}) => {
  // Determine the adaptive plan change description based on real state
  let actionTitle = 'Adaptive Strategy Formulated';
  let actionDetail = 'The Workflow Controller is calibrating the optimal learning sequence.';
  let badgeText = 'Workflow Updated';
  let badgeColor = 'bg-cyan-500/20 text-[#00D2FF] border-cyan-400/40';

  const lastEvent = events.length > 0 ? events[events.length - 1] : null;

  switch (currentState) {
    case 'DIAGNOSE_GAP':
    case 'VALIDATE_HYPOTHESIS':
      actionTitle = 'Investigating Prerequisite Gap';
      actionDetail = candidatePrerequisite
        ? `Diagnostic Agent identified root deficit in '${candidatePrerequisite}'. Validating dependency edge.`
        : 'Diagnostic Agent is isolating conceptual foundation deficit.';
      badgeText = 'Diagnostic Triggered';
      badgeColor = 'bg-rose-500/20 text-[#FF6B6B] border-rose-400/40';
      break;

    case 'TIE_BREAKER':
      actionTitle = 'Administering Tie-Breaker Probe';
      actionDetail = 'Evaluation ambiguity detected. Deploying targeted discriminator question to pinpoint deficit.';
      badgeText = 'Ambiguity Resolved';
      badgeColor = 'bg-amber-500/20 text-[#F59E0B] border-amber-400/40';
      break;

    case 'SELECT_RESOURCE':
    case 'RESOURCE_CROSS_CHECK':
      actionTitle = 'Retrieving & Cross-Checking Verified Learning Evidence';
      actionDetail = 'Resource Agent retrieving targeted conceptual evidence; Tutor Agent performing safety cross-check.';
      badgeText = 'Resource Synthesis';
      badgeColor = 'bg-purple-500/20 text-[#D0BCFF] border-purple-400/40';
      break;

    case 'RETEACH_PREREQ':
      actionTitle = 'Repairing Prerequisite Foundation';
      actionDetail = candidatePrerequisite
        ? `Shifting focus to foundational prerequisite: '${candidatePrerequisite}' before returning to target.`
        : 'Tutor Agent is delivering targeted remediation for foundational prerequisite.';
      badgeText = 'Repair Sub-Cycle';
      badgeColor = 'bg-rose-500/20 text-[#FF6B6B] border-rose-400/40';
      break;

    case 'RECHECK_GAP':
    case 'GENERATE_EXERCISE':
      actionTitle = 'Verifying Repaired Prerequisite';
      actionDetail = 'Exercise Agent generated an isolated checkpoint to prove mastery of the repaired prerequisite.';
      badgeText = 'Prerequisite Probe';
      badgeColor = 'bg-sky-500/20 text-[#00D2FF] border-sky-400/40';
      break;

    case 'GO_DEEPER':
      actionTitle = 'Backtracking: Deeper Prerequisite Tracing';
      actionDetail = 'Prerequisite deficit persists. Tracing further upstream along dependency DAG.';
      badgeText = 'Deep Backtrack';
      badgeColor = 'bg-rose-500/20 text-[#FF6B6B] border-rose-400/40';
      break;

    case 'RECHECK_ORIGINAL':
      actionTitle = 'Re-Testing Original Target Concept';
      actionDetail = targetConcept
        ? `Prerequisite repaired! Returning to original goal: '${targetConcept}'.`
        : 'Prerequisite repaired! Returning to evaluate original target concept.';
      badgeText = 'Target Retest';
      badgeColor = 'bg-emerald-500/20 text-[#10B981] border-emerald-400/40';
      break;

    case 'WAITING_FOR_HUMAN':
      actionTitle = 'Escalating to Human Guidance';
      actionDetail = 'System reached an automated decision boundary requiring instructor or student input.';
      badgeText = 'Human in the Loop';
      badgeColor = 'bg-amber-500/20 text-[#F59E0B] border-amber-400/40';
      break;

    case 'TARGET_MASTERED':
    case 'SESSION_COMPLETE':
      actionTitle = 'Target Concept Fully Mastered';
      actionDetail = 'All prerequisite invariants and target evaluations satisfied.';
      badgeText = 'Goal Achieved';
      badgeColor = 'bg-emerald-500/20 text-[#10B981] border-emerald-400/40';
      break;

    case 'PRACTICE':
      actionTitle = 'Progressing to Target Concept Practice';
      actionDetail = 'Tutor lesson synthesized. Launching initial application exercise.';
      badgeText = 'Practice Phase';
      badgeColor = 'bg-cyan-500/20 text-[#00D2FF] border-cyan-400/40';
      break;

    default:
      if (lastEvent?.action) {
        actionTitle = lastEvent.action;
        actionDetail = lastEvent.reason || actionDetail;
      }
      break;
  }

  return (
    <div className="rounded-xl bg-[#090D16] border border-[#00D2FF]/40 p-5 shadow-[0_0_24px_rgba(0,210,255,0.15)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00D2FF]/30 to-[#10B981]/20 border border-[#00D2FF]/50 flex items-center justify-center text-[#00D2FF] shrink-0 shadow-[0_0_12px_rgba(0,210,255,0.3)]">
          <span className="material-symbols-outlined text-lg">auto_mode</span>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
              Your response changed the study plan
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.2 rounded border uppercase font-bold ${badgeColor}`}
            >
              {badgeText}
            </span>
          </div>

          <div className="text-sm font-semibold text-[#00D2FF]">
            {actionTitle}
          </div>

          <div className="text-xs text-[#8EA4B8] leading-relaxed max-w-2xl">
            {actionDetail}
          </div>
        </div>
      </div>

      {onProceed && (
        <button
          onClick={onProceed}
          className="px-5 py-2 rounded-lg bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(0,210,255,0.35)] shrink-0 self-end sm:self-auto flex items-center gap-1.5"
        >
          <span>{proceedLabel || 'Continue'}</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      )}
    </div>
  );
};
