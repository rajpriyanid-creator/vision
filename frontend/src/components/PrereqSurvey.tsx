import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const PrereqSurvey: React.FC = () => {
  const { session, submitPrereqSurvey, loading } = useVision();
  const [responses, setResponses] = useState<Record<string, 'yes' | 'partially' | 'no'>>({});

  const surveyData = session?.prereq_survey_data || {};
  const prerequisites: string[] = surveyData.prerequisites || [];
  const targetConcept = session?.target_concept || 'Target Concept';
  const dag = session?.dag || {};

  const handleSelect = (prereq: string, value: 'yes' | 'partially' | 'no') => {
    setResponses((prev) => ({
      ...prev,
      [prereq]: value
    }));
  };

  const isAllAnswered = prerequisites.length > 0 && prerequisites.every((p) => responses[p]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered) return;
    submitPrereqSurvey(responses);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Developer Testing DAG Preview (Top Banner) */}
      <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-[#00D2FF]/30 backdrop-blur">
        <div className="flex items-center justify-between pb-2 border-b border-[#1F2F4A]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00D2FF] text-base">account_tree</span>
            <span className="font-mono text-xs font-bold text-[#00D2FF] uppercase tracking-wider">
              [DEV-MODE] Prerequisite Dependency Tree
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/30">
            Supervisor Verification
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-mono">
          {prerequisites.map((prereq) => (
            <React.Fragment key={prereq}>
              <div className="px-3 py-1.5 rounded-lg bg-[#141F36] border border-[#1F2F4A] text-slate-200 flex items-center gap-1.5 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <span className="font-semibold">{prereq}</span>
              </div>
              <span className="text-[#00D2FF] font-bold">──▶</span>
            </React.Fragment>
          ))}
          <div className="px-3 py-1.5 rounded-lg bg-[#00D2FF]/20 border border-[#00D2FF] text-[#00D2FF] flex items-center gap-1.5 font-bold shadow-[0_0_10px_rgba(0,210,255,0.2)]">
            <span className="h-2 w-2 rounded-full bg-[#00D2FF] animate-ping" />
            <span>{targetConcept} (Target Goal)</span>
          </div>
        </div>
      </div>

      {/* Main Prerequisite Readiness Survey Card */}
      <div className="p-6 rounded-2xl bg-[#0E1526] border border-[#1F2F4A] shadow-xl flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00D2FF] text-xl">psychology_alt</span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D2FF]">
              Supervisor Agent · Prerequisite Readiness Check
            </span>
          </div>
          <h2 className="text-xl font-bold text-white">
            Before we dive into <span className="text-[#00D2FF]">{targetConcept}</span>
          </h2>
          <p className="text-xs text-[#8EA4B8] leading-relaxed">
            {surveyData.message ||
              `To guarantee you master ${targetConcept} without getting stuck, let's verify your comfort with foundational Computer Science concepts.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            {prerequisites.map((prereq, index) => {
              const currentChoice = responses[prereq];
              return (
                <div
                  key={prereq}
                  className="p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] hover:border-[#00D2FF]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-[#141F36] text-[#00D2FF] text-xs font-mono font-bold flex items-center justify-center border border-[#1F2F4A]">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-sm font-semibold text-white font-mono">{prereq}</h4>
                      <p className="text-[11px] text-[#8EA4B8]">
                        Do you feel confident with this prerequisite?
                      </p>
                    </div>
                  </div>

                  {/* 3-Option Button Group */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSelect(prereq, 'yes')}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-medium transition-all ${
                        currentChoice === 'yes'
                          ? 'bg-[#10B981] text-black font-bold shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                          : 'bg-[#141F36] text-slate-300 hover:bg-[#1C2740] border border-[#1F2F4A]'
                      }`}
                    >
                      ✓ Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelect(prereq, 'partially')}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-medium transition-all ${
                        currentChoice === 'partially'
                          ? 'bg-amber-400 text-black font-bold shadow-[0_0_10px_rgba(251,191,36,0.4)]'
                          : 'bg-[#141F36] text-slate-300 hover:bg-[#1C2740] border border-[#1F2F4A]'
                      }`}
                    >
                      ⚡ Partially
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelect(prereq, 'no')}
                      className={`px-3 py-1.5 rounded-lg font-mono text-xs font-medium transition-all ${
                        currentChoice === 'no'
                          ? 'bg-[#FF6B6B] text-black font-bold shadow-[0_0_10px_rgba(255,107,107,0.4)]'
                          : 'bg-[#141F36] text-slate-300 hover:bg-[#1C2740] border border-[#1F2F4A]'
                      }`}
                    >
                      ✕ No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-[#141F36]/50 border border-[#1F2F4A] text-xs font-mono text-slate-400 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span className="material-symbols-outlined text-sm text-[#00D2FF]">info</span>
              <span>How Supervisor Agent routes your learning path:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-slate-400 pl-1">
              <li><strong className="text-emerald-400">Yes</strong> to all → Proceeds directly to learn {targetConcept}.</li>
              <li><strong className="text-amber-400">Partially</strong> → 2-question diagnostic quiz (≥ 70% required to proceed directly).</li>
              <li><strong className="text-rose-400">No</strong> → Dynamically pivots curriculum to teach prerequisite foundational concept first.</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={!isAllAnswered || loading}
            className={`w-full py-3 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              isAllAnswered && !loading
                ? 'bg-[#00D2FF] text-black hover:bg-cyan-400 shadow-[0_0_16px_rgba(0,210,255,0.4)] cursor-pointer'
                : 'bg-[#141F36] text-slate-500 border border-[#1F2F4A] cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Processing Readiness Assessment...</span>
              </>
            ) : (
              <>
                <span>Submit Readiness Assessment</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
