import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';

export const PrereqSurveyView: React.FC = () => {
  const { session, submitPrereqSurvey, loading } = useVision();
  const surveyData = session?.prereq_survey_data;
  const directPrereqs = surveyData?.direct_prerequisites || surveyData?.prerequisites || [];
  const conceptTitles = session?.concept_titles || {};

  // Form state: map conceptId -> 'mastered' | 'familiar' | 'shaky' | 'new'
  const [responses, setResponses] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    directPrereqs.forEach((p: any) => {
      const id = typeof p === 'string' ? p : p.id;
      initial[id] = 'familiar';
    });
    return initial;
  });

  if (!session || directPrereqs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-[#0B111E] rounded-2xl border border-[#1F2F4A]">
        <span className="material-symbols-outlined text-4xl text-[#00D2FF] mb-2 animate-spin">sync</span>
        <p className="text-sm text-[#8EA4B8]">Checking prerequisite readiness...</p>
      </div>
    );
  }

  const handleSubmit = async () => {
    await submitPrereqSurvey(responses);
  };

  return (
    <div className="flex flex-col w-full gap-6 max-w-3xl mx-auto">
      <div className="rounded-2xl bg-gradient-to-r from-[#0B111E] via-[#0E1526] to-[#0B111E] border border-[#00D2FF]/30 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="px-2.5 py-1 rounded bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] font-mono text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-pulse" />
            SUPERVISOR CALIBRATION
          </span>
          <span className="text-xs text-[#8EA4B8]">· Prerequisite Survey</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Prerequisite Readiness Check
        </h1>
        <p className="text-sm text-[#8EA4B8] mt-2 leading-relaxed">
          Before diving into <strong className="text-white">{session.target_concept}</strong>, let's calibrate your comfort level with its foundational prerequisites to ensure the best pacing.
        </p>
      </div>

      <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-6 sm:p-8 shadow-xl flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {directPrereqs.map((p: any, idx: number) => {
            const id = typeof p === 'string' ? p : p.id;
            const title = typeof p === 'string' ? (conceptTitles[id] || id.replace(/_/g, ' ')) : (p.title || conceptTitles[id] || id);
            const currentChoice = responses[id] || 'familiar';

            return (
              <div
                key={id || idx}
                className="p-4 rounded-xl bg-[#090D16] border border-[#1F2F4A] hover:border-[#00D2FF]/40 transition-all flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#00D2FF]/10 text-[#00D2FF] flex items-center justify-center font-mono text-xs font-bold border border-[#00D2FF]/20">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-white text-base capitalize">{title}</span>
                  </div>
                  <span className="font-mono text-xs text-[#8EA4B8]">{id}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  {[
                    { val: 'mastered', label: 'Mastered', desc: 'Very confident', color: 'border-[#10B981] text-[#10B981] bg-[#10B981]/10' },
                    { val: 'familiar', label: 'Familiar', desc: 'Need quick review', color: 'border-[#00D2FF] text-[#00D2FF] bg-[#00D2FF]/10' },
                    { val: 'shaky', label: 'Shaky', desc: 'Need guidance', color: 'border-[#F59E0B] text-[#F59E0B] bg-[#F59E0B]/10' },
                    { val: 'new', label: 'New to me', desc: 'Teach me first', color: 'border-[#EC4899] text-[#EC4899] bg-[#EC4899]/10' }
                  ].map((opt) => {
                    const isSelected = currentChoice === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => setResponses((prev) => ({ ...prev, [id]: opt.val }))}
                        className={`p-2.5 rounded-lg border text-left transition-all flex flex-col ${
                          isSelected
                            ? `${opt.color} ring-1 ring-offset-0 font-medium`
                            : 'border-[#1F2F4A] bg-[#0E1526] text-[#8EA4B8] hover:border-[#2D4266] hover:text-white'
                        }`}
                      >
                        <span className="text-xs font-semibold">{opt.label}</span>
                        <span className="text-[10px] opacity-75">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-[#1F2F4A] pt-4">
          <p className="text-xs text-[#8EA4B8]">
            Supervisor Agent will use your answers to tailor explanation depth and diagnostic checks.
          </p>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00D2FF] to-[#0099FF] text-black font-semibold text-sm hover:shadow-[0_0_20px_rgba(0,210,255,0.4)] transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">sync</span>
                Calibrating...
              </>
            ) : (
              <>
                Continue to Lesson
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
