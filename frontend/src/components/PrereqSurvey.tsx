import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

interface PrereqItem {
  id: string;
  title: string;
}

export const PrereqSurvey: React.FC = () => {
  const { session, submitPrereqSurvey, loading } = useVision();
  const [responses, setResponses] = useState<Record<string, 'yes' | 'partially' | 'no'>>({});

  const surveyData = session?.prereq_survey_data || {};
  const targetConcept = session?.target_concept || 'Target Concept';
  const targetId = session?.target_id || '';
  const dag = session?.dag || {};
  const conceptTitles = session?.concept_titles || {};

  // Resolve prerequisites list robustly from direct_prerequisites, prerequisites, or DAG
  const rawList =
    surveyData.direct_prerequisites ||
    surveyData.prerequisites ||
    (targetId && dag[targetId]) ||
    [];

  const prerequisites: PrereqItem[] = rawList.map((item: any) => {
    if (typeof item === 'string') {
      return {
        id: item,
        title:
          conceptTitles[item] ||
          item.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      };
    }
    return {
      id: item.id || item.title || '',
      title:
        item.title ||
        conceptTitles[item.id] ||
        (item.id ? item.id.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) : 'Prerequisite')
    };
  });

  const handleSelect = (prereqId: string, value: 'yes' | 'partially' | 'no') => {
    setResponses((prev) => ({
      ...prev,
      [prereqId]: value
    }));
  };

  const isAllAnswered =
    prerequisites.length > 0 &&
    prerequisites.every((p) => responses[p.id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAllAnswered) return;
    submitPrereqSurvey(responses);
  };

  return (
    /* Modal Backdrop with Slight Blur */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      {/* Centered Modal Card */}
      <div className="relative w-full max-w-2xl bg-[#090E1A] border border-[#1F2F4A] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col my-auto max-h-[90vh] overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#1F2F4A] bg-[#060910]/80 flex flex-col gap-3">
          {/* Developer Testing DAG Preview (Top Banner) */}
          <div className="p-3 rounded-xl bg-[#0B132B]/90 border border-[#00D2FF]/30">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#1F2F4A]">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#00D2FF] text-sm">account_tree</span>
                <span className="font-mono text-[11px] font-bold text-[#00D2FF] uppercase tracking-wider">
                  [DEV-MODE] Prerequisite Dependency Tree
                </span>
              </div>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/30">
                Supervisor Verification
              </span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              {prerequisites.map((prereq) => (
                <React.Fragment key={prereq.id}>
                  <div className="px-2.5 py-1 rounded-lg bg-[#141F36] border border-[#1F2F4A] text-slate-200 flex items-center gap-1 shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="font-semibold">{prereq.title}</span>
                  </div>
                  <span className="text-[#00D2FF] font-bold">──▶</span>
                </React.Fragment>
              ))}
              <div className="px-2.5 py-1 rounded-lg bg-[#00D2FF]/20 border border-[#00D2FF] text-[#00D2FF] flex items-center gap-1 font-bold shadow-[0_0_10px_rgba(0,210,255,0.2)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00D2FF] animate-ping" />
                <span>{targetConcept}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1 mt-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#00D2FF] text-lg">psychology_alt</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#00D2FF]">
                Supervisor Agent · Prerequisite Readiness Check
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Before we dive into <span className="text-[#00D2FF]">{targetConcept}</span>
            </h2>
            <p className="text-xs text-[#8EA4B8] leading-relaxed">
              To give you the smoothest learning experience without getting stuck, let us know your comfort level with these prerequisite concepts:
            </p>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto flex flex-col gap-4 max-h-[50vh]">
          <div className="flex flex-col gap-3">
            {prerequisites.map((prereq, index) => {
              const currentChoice = responses[prereq.id];
              return (
                <div
                  key={prereq.id}
                  className="p-3.5 rounded-xl bg-[#0F172A]/90 border border-[#1F2F4A] hover:border-[#00D2FF]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="h-6 w-6 rounded-full bg-[#141F36] text-[#00D2FF] text-xs font-mono font-bold flex items-center justify-center border border-[#1F2F4A] shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white font-mono">{prereq.title}</h4>
                      <p className="text-[10px] text-[#8EA4B8]">
                        Do you know this prerequisite?
                      </p>
                    </div>
                  </div>

                  {/* 3-Option Button Group */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    <button
                      type="button"
                      onClick={() => handleSelect(prereq.id, 'yes')}
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
                      onClick={() => handleSelect(prereq.id, 'partially')}
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
                      onClick={() => handleSelect(prereq.id, 'no')}
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

          <div className="p-3 rounded-xl bg-[#141F36]/50 border border-[#1F2F4A] text-[11px] font-mono text-slate-400 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <span className="material-symbols-outlined text-sm text-[#00D2FF]">info</span>
              <span>Supervisor Learning Paths:</span>
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[10px] text-slate-400 pl-1">
              <li><strong className="text-emerald-400">Yes</strong> to all → Proceeds directly to learn {targetConcept}.</li>
              <li><strong className="text-amber-400">Partially</strong> → 2-question diagnostic quiz (≥ 70% required to proceed directly).</li>
              <li><strong className="text-rose-400">No</strong> → Dynamically pivots curriculum to teach prerequisite foundational concept first.</li>
            </ul>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-[#1F2F4A] bg-[#060910]/80 flex items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-400">
            {Object.keys(responses).length} of {prerequisites.length} answered
          </div>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isAllAnswered || loading}
            className={`px-5 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 ${
              isAllAnswered && !loading
                ? 'bg-[#00D2FF] text-black hover:bg-cyan-400 shadow-[0_0_16px_rgba(0,210,255,0.4)] cursor-pointer'
                : 'bg-[#141F36] text-slate-500 border border-[#1F2F4A] cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                <span>Processing Assessment...</span>
              </>
            ) : (
              <>
                <span>Submit Readiness</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
