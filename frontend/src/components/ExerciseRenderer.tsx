import React, { useState, useEffect } from 'react';
import { useVision } from '../context/VisionContext';

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
      setCodeAnswer(exercise.starter_code || '');
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

  const format = (exercise.format || 'mcq').toLowerCase();
  const prompt = exercise.prompt || 'Evaluate the following scenario:';
  const options = exercise.options || [];
  const difficulty = exercise.difficulty;
  const conceptTitle = exercise.concept_title || recheckConcept || session?.target_concept || 'Concept';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (format === 'mcq') {
      if (!selectedOption) return;
      await submitStep({
        selected_option: selectedOption,
        student_answer: selectedOption
      });
    } else if (format === 'coding_problem') {
      await submitStep({
        code_submission: codeAnswer,
        student_answer: ''
      });
    } else {
      // fill_in_blank or free_text
      if (!textAnswer.trim()) return;
      await submitStep({
        student_answer: textAnswer.trim()
      });
    }
  };

  const isSubmitDisabled =
    loading ||
    (format === 'mcq' && !selectedOption) ||
    (format === 'coding_problem' && !codeAnswer.trim()) ||
    (format !== 'mcq' && format !== 'coding_problem' && !textAnswer.trim());

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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {difficulty !== undefined && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0E1526] border border-[#1F2F4A]">
              <span className="font-mono text-[11px] text-[#8EA4B8]">Difficulty:</span>
              <span className="font-mono text-[11px] font-bold text-[#10B981]">
                {typeof difficulty === 'number' ? difficulty.toFixed(2) : difficulty}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0E1526] border border-[#1F2F4A]">
            <span className="font-mono text-[11px] text-[#8EA4B8]">Format:</span>
            <span className="font-mono text-[11px] font-bold text-sky-300 uppercase">
              {format}
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

        {/* Dynamic Exercise Formats */}
        {format === 'mcq' && (
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono text-[#8EA4B8] uppercase tracking-wider">
              Select the correct statement:
            </span>
            <div className="flex flex-col gap-2.5">
              {options.map((option, idx) => {
                const isSelected = selectedOption === option;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedOption(option)}
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
                      <span className="leading-snug">{option}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {format === 'fill_in_blank' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-[#8EA4B8] uppercase tracking-wider">
              Your Answer:
            </label>
            <input
              type="text"
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Type your response here..."
              className="w-full px-4 py-3 rounded-xl bg-[#06080F] border border-[#1F2F4A] text-sm text-white font-mono focus:outline-none focus:border-[#00D2FF] transition-colors"
            />
          </div>
        )}

        {format === 'free_text' && (
          <div className="flex flex-col gap-2">
            <label className="text-xs font-mono text-[#8EA4B8] uppercase tracking-wider">
              Detailed Explanation / Answer:
            </label>
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              placeholder="Write your explanation or reasoning..."
              rows={5}
              className="w-full p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] text-sm text-white focus:outline-none focus:border-[#00D2FF] transition-colors resize-y leading-relaxed font-normal"
            />
          </div>
        )}

        {format === 'coding_problem' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-[#8EA4B8]">
                <span className="uppercase tracking-wider">Solution Editor</span>
                <span className="text-sky-400">Python / Pseudo</span>
              </div>
              <textarea
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                placeholder="Write your code implementation here..."
                rows={9}
                className="w-full p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] text-xs font-mono text-sky-200 focus:outline-none focus:border-[#00D2FF] transition-colors resize-y leading-relaxed"
              />
            </div>

            {/* Test cases if provided */}
            {exercise.test_cases && exercise.test_cases.length > 0 && (
              <div className="p-3 rounded-xl bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-2">
                <span className="text-xs font-mono text-[#8EA4B8] uppercase tracking-wider">
                  Test Case Specification
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {exercise.test_cases.map((tc, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-[#0B111E] border border-[#1F2F4A] font-mono text-xs flex flex-col gap-1 text-[#DFE8F2]"
                    >
                      <span className="text-[10px] text-sky-300 font-bold uppercase">
                        {tc.name || `Case ${idx + 1}`}
                      </span>
                      {tc.input && <div>Input: <code className="text-slate-300">{tc.input}</code></div>}
                      {tc.expected && <div>Expected: <code className="text-[#10B981]">{tc.expected}</code></div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

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
    </div>
  );
};
