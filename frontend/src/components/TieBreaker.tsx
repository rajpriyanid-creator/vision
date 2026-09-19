import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const TieBreaker: React.FC = () => {
  const { exercise, submitStep, loading } = useVision();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState<string>('');

  if (!exercise) return null;

  const format = (exercise.format || 'mcq').toLowerCase();
  const options = exercise.options || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (format === 'mcq' && selectedOption) {
      await submitStep({
        selected_option: selectedOption,
        student_answer: selectedOption
      });
    } else if (textAnswer.trim()) {
      await submitStep({
        student_answer: textAnswer.trim()
      });
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto">
      <div className="rounded-xl bg-amber-950/40 border border-amber-500/40 p-5 shadow-xl flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
          <span className="material-symbols-outlined text-xl">balance</span>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
              Ambiguity Disambiguation · Tie-Breaker Probe
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            VISION needs one more signal to distinguish between possible causes.
          </h2>
          <p className="text-xs text-[#8EA4B8]">
            Your previous answer showed a split between two conceptual hypotheses. Please answer this targeted diagnostic question so the system can choose the correct repair path.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#0E1526] border border-[#1F2F4A] p-6 sm:p-8 shadow-2xl flex flex-col gap-6"
      >
        <div className="text-base sm:text-lg text-white leading-relaxed whitespace-pre-line border-b border-[#1F2F4A] pb-4">
          {exercise.prompt}
        </div>

        {format === 'mcq' && options.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            {options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedOption(opt)}
                  className={`p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-400 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
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
        ) : (
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            placeholder="Write your clarifying response..."
            rows={4}
            className="w-full p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
          />
        )}

        <div className="flex justify-end pt-3 border-t border-[#1F2F4A]">
          <button
            type="submit"
            disabled={loading || (format === 'mcq' ? !selectedOption : !textAnswer.trim())}
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs tracking-wider transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            {loading ? 'Submitting Signal...' : 'Submit Disambiguation'}
            <span className="material-symbols-outlined text-sm">send</span>
          </button>
        </div>
      </form>
    </div>
  );
};
