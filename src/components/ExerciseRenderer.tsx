import React, { useState, useEffect } from 'react';
import { useVision } from '../context/VisionContext';
import { AskTutorWidget } from './AskTutorWidget';

interface ExerciseRendererProps {
  titlePrefix?: string;
  isRecheck?: boolean;
  recheckConcept?: string;
}

export const ExerciseRenderer: React.FC<ExerciseRendererProps> = ({
  titlePrefix = 'Adaptive Practice',
  isRecheck = false,
  recheckConcept
}) => {
  const { session, exercise, submitStep, loading } = useVision();

  const [selectedOption, setSelectedOption] = useState<string>('');
  const [textAnswer, setTextAnswer] = useState<string>('');
  const [codeAnswer, setCodeAnswer] = useState<string>('');

  // Reset inputs when a new exercise arrives
  useEffect(() => {
    if (exercise) {
      setSelectedOption('');
      setTextAnswer('');
      setCodeAnswer(exercise.starter_code || exercise.code_starter || '');
    }
  }, [exercise?.exercise_id]);

  if (!exercise) {
    return (
      <div className="rounded-xl bg-[#0E1526] border border-[#1F2F4A] p-8 text-center text-[#8EA4B8]">
        <span className="material-symbols-outlined text-3xl text-sky-400 mb-2">pending</span>
        <div className="text-sm font-mono">Waiting for Exercise Agent to generate task...</div>
      </div>
    );
  }

  const rawFormat = 'mcq';
  const isMcq = true;

  const prompt = exercise.prompt || exercise.question_text || 'Evaluate the following scenario:';
  const rawOptions = exercise.options || exercise.mcq_options || [];
  const difficulty = exercise.difficulty;
  const cognitiveDemand = exercise.cognitive_demand;
  const conceptTitle = exercise.concept_title || recheckConcept || session?.target_concept || 'Concept';

  // Normalize options into a flat array of { key, label, fullValue }
  let optionsList: Array<{ key: string; label: string; fullValue: string }> = [];
  if (Array.isArray(rawOptions) && rawOptions.length > 0) {
    optionsList = rawOptions.map((opt: any, idx: number) => {
      const letter = String.fromCharCode(65 + idx);
      if (typeof opt === 'string') {
        return { key: letter, label: opt, fullValue: opt };
      } else if (typeof opt === 'object' && opt !== null) {
        const key = opt.key || opt.id || letter;
        const text = opt.text || opt.label || opt.value || JSON.stringify(opt);
        return { key: String(key), label: String(text), fullValue: `${key}: ${text}` };
      }
      return { key: letter, label: String(opt), fullValue: String(opt) };
    });
  } else if (typeof rawOptions === 'object' && rawOptions !== null && Object.keys(rawOptions).length > 0) {
    optionsList = Object.entries(rawOptions).map(([k, v]) => {
      const textVal = typeof v === 'string' ? v : (v as any)?.text || String(v);
      return { key: k, label: textVal, fullValue: `${k}: ${textVal}` };
    });
  }

  // Fallback for MCQ if no options provided
  if (optionsList.length === 0) {
    optionsList = [
      { key: 'A', label: `Primary structural requirement for ${conceptTitle}`, fullValue: `A: Primary structural requirement for ${conceptTitle}` },
      { key: 'B', label: `Secondary execution mode without structural invariants`, fullValue: `B: Secondary execution mode without structural invariants` },
      { key: 'C', label: `Direct state mutation bypassing prerequisite checks`, fullValue: `C: Direct state mutation bypassing prerequisite checks` },
      { key: 'D', label: `External module reference without state persistence`, fullValue: `D: External module reference without state persistence` }
    ];
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) return;
    await submitStep({
      selected_option: selectedOption,
      student_answer: selectedOption
    });
  };

  const isSubmitDisabled = loading || !selectedOption;

  return (
    <div className="flex flex-col w-full gap-6 max-w-4xl mx-auto">
      {/* Exercise Meta Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-mono text-xs uppercase tracking-widest font-bold flex items-center gap-1.5 ${
                isRecheck ? 'text-[#FF6B6B]' : 'text-[#00D2FF]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full animate-pulse ${
                  isRecheck ? 'bg-[#FF6B6B]' : 'bg-[#00D2FF]'
                }`}
              />
              {titlePrefix}
            </span>
            <span className="text-[#64748B]">/</span>
            <span className="font-mono text-xs text-[#8EA4B8]">
              {conceptTitle}
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            {isRecheck ? 'Prerequisite Verification Probe' : "Let's see what you understood."}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {difficulty && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0E1526] border border-[#1F2F4A]">
              <span className="font-mono text-[11px] text-[#8EA4B8]">Difficulty:</span>
              <span className="font-mono text-[11px] font-bold text-[#10B981]">
                {difficulty}
              </span>
            </div>
          )}
          {cognitiveDemand && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0E1526] border border-[#1F2F4A]">
              <span className="font-mono text-[11px] text-[#8EA4B8]">Cognitive:</span>
              <span className="font-mono text-[11px] font-bold text-amber-300">
                {cognitiveDemand}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0E1526] border border-[#1F2F4A]">
            <span className="font-mono text-[11px] text-[#8EA4B8]">Format:</span>
            <span className="font-mono text-[11px] font-bold text-sky-300 uppercase">
              {rawFormat}
            </span>
          </div>
        </div>
      </div>

      {/* Main Exercise Card */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative overflow-hidden backdrop-blur-md"
      >
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-[#00D2FF]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Prompt */}
        <div className="text-base sm:text-lg font-normal text-white leading-relaxed whitespace-pre-line border-b border-[#1F2F4A] pb-5">
          {prompt}
        </div>

        {/* MCQ Options */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-mono text-[#8EA4B8] uppercase tracking-wider">
            Select the correct statement:
          </span>
          <div className="flex flex-col gap-2.5">
            {optionsList.map((option, idx) => {
              const isSelected =
                selectedOption === option.fullValue ||
                selectedOption === option.key ||
                selectedOption === option.label;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedOption(option.fullValue)}
                  className={`p-4 rounded-xl border text-left text-sm transition-all flex items-center justify-between group ${
                    isSelected
                      ? 'bg-cyan-500/15 border-[#00D2FF] text-white shadow-[0_0_16px_rgba(0,210,255,0.25)]'
                      : 'bg-[#06080F] border-[#1F2F4A] text-[#DFE8F2] hover:border-[#62778A] hover:bg-[#0A101D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'border-[#00D2FF] bg-[#00D2FF] text-slate-950'
                          : 'border-[#62778A] group-hover:border-white'
                      }`}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-xs font-bold">check</span>
                      )}
                    </div>
                    <span className="leading-snug">
                      <strong className="text-[#00D2FF] font-mono mr-2">{option.key}.</strong>
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-between pt-4 border-t border-[#1F2F4A] mt-2">
          <div className="text-xs text-[#8EA4B8] font-mono">
            Evaluated by VISION Evaluation Agent
          </div>

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="px-8 py-3 rounded-xl bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 font-mono font-bold text-sm tracking-wide transition-all shadow-[0_0_20px_rgba(0,210,255,0.4)] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                <span>Evaluating Response...</span>
              </>
            ) : (
              <>
                <span>Submit Answer</span>
                <span className="material-symbols-outlined text-base">send</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Ask Tutor Q&A */}
      <AskTutorWidget />
    </div>
  );
};
