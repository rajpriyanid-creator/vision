import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const HumanEscalation: React.FC = () => {
  const { session, resumeHuman, loading } = useVision();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [humanNotes, setHumanNotes] = useState<string>('');

  if (!session) return null;

  const humanQuestion = session.human_question || {
    question: 'How would you prefer the study engine to proceed?',
    options: ['Continue targeted repair', 'Skip prerequisite and retry target', 'Request tutor consultation']
  };

  const options = humanQuestion.options || [];

  const handleResume = async (e: React.FormEvent) => {
    e.preventDefault();
    await resumeHuman({
      decision: selectedOption || humanNotes,
      selected_option: selectedOption,
      notes: humanNotes
    });
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto">
      <div className="rounded-xl bg-amber-950/40 border border-amber-500/50 p-6 shadow-2xl flex flex-col gap-3 backdrop-blur-md">
        <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
          <span className="material-symbols-outlined text-base">engineering</span>
          <span>Human-in-the-Loop Escalation</span>
        </div>

        <h2 className="text-2xl font-bold text-white tracking-tight">
          Automated Decision Boundary Reached
        </h2>

        <p className="text-sm text-[#8EA4B8] leading-relaxed">
          VISION has reached a point where the automated agents require human pedagogical guidance to proceed effectively.
        </p>
      </div>

      <form
        onSubmit={handleResume}
        className="rounded-2xl bg-[#0E1526] border border-[#1F2F4A] p-6 sm:p-8 shadow-2xl flex flex-col gap-6"
      >
        <div className="text-base sm:text-lg text-white font-medium border-b border-[#1F2F4A] pb-4">
          {humanQuestion.question}
        </div>

        {options.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <span className="text-xs font-mono uppercase tracking-wider text-[#8EA4B8]">
              Select Resolution Directive:
            </span>
            {options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  className={`p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                      : 'bg-[#06080F] border-[#1F2F4A] text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && (
                    <span className="material-symbols-outlined text-amber-400 text-sm font-bold">check</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-xs font-mono text-[#8EA4B8] uppercase tracking-wider">
            Additional Instructor / Human Guidance Notes:
          </label>
          <textarea
            value={humanNotes}
            onChange={(e) => setHumanNotes(e.target.value)}
            placeholder="Provide specific directions or instructions..."
            rows={3}
            className="w-full p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
          />
        </div>

        <div className="flex justify-end pt-3 border-t border-[#1F2F4A]">
          <button
            type="submit"
            disabled={loading || (!selectedOption && !humanNotes.trim())}
            className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Resuming Session...' : 'Resume Agent Workflow'}
            <span className="material-symbols-outlined text-sm">play_arrow</span>
          </button>
        </div>
      </form>
    </div>
  );
};
