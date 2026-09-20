import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const HumanInTheLoopView: React.FC = () => {
  const { session, resumeHuman, loading } = useVision();
  const humanQuestion = session?.human_question;
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [overrideAction, setOverrideAction] = useState<string>('override_remediation');

  if (!session) return null;

  const handleResume = async () => {
    await resumeHuman({
      decision: selectedOption || overrideAction,
      action: overrideAction,
      notes,
      selected_option: selectedOption
    });
  };

  const options = humanQuestion?.options || [
    'Reteach Prerequisite in greater depth',
    'Switch to hands-on visual trace diagram',
    'Mark Prerequisite as cleared and advance to target',
    'Restart study cycle from scratch'
  ];

  return (
    <div className="flex flex-col w-full gap-6 max-w-3xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/60 via-[#0E1526] to-[#0E1526] border border-amber-500/40 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="px-2.5 py-1 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            HUMAN-IN-THE-LOOP ESCALATION
          </span>
          <span className="text-xs text-[#8EA4B8]">· Multi-Agent Safeguard</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Supervisory Guidance Required
        </h1>
        <p className="text-sm text-[#8EA4B8] mt-2 leading-relaxed">
          The autonomous supervisor reached maximum retry depth or an ambiguous diagnostic state. Human educator intervention is requested to safely resume the loop.
        </p>
      </div>

      <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-8 shadow-xl flex flex-col gap-6">
        <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2F4A]">
          <h3 className="text-xs font-mono uppercase text-amber-400 mb-1">Supervisor Impasse Reason</h3>
          <p className="text-sm text-white leading-relaxed">
            {humanQuestion?.question || humanQuestion?.context || 'Maximum remediation revision limit reached without resolving prerequisite conceptual gap.'}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#8EA4B8]">
            Select Recommended Course of Action
          </label>
          <div className="flex flex-col gap-2">
            {options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  className={`p-3.5 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-amber-400 bg-amber-500/10 text-white font-medium ring-1 ring-amber-400'
                      : 'border-[#1F2F4A] bg-[#090D16] text-[#8EA4B8] hover:border-[#2D4266] hover:text-white'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-amber-400 text-base">
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#8EA4B8]">
            Educator Notes / Custom Guidance (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add specific instructions for the Tutor Agent (e.g. emphasize stack frame push/pop order with diagram)..."
            rows={3}
            className="w-full rounded-xl bg-[#090D16] border border-[#1F2F4A] p-3 text-sm text-white placeholder-[#8EA4B8]/50 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center justify-between border-t border-[#1F2F4A] pt-4">
          <p className="text-xs text-[#8EA4B8]">
            Decision will be logged to session audit trail with educator timestamp.
          </p>
          <button
            onClick={handleResume}
            disabled={loading || (!selectedOption && !notes.trim())}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all flex items-center gap-2 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                Applying Guidance...
              </>
            ) : (
              <>
                Resume Autonomous Engine
                <span className="material-symbols-outlined text-base">play_arrow</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
