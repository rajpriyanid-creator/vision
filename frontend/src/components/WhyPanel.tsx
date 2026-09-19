import React, { useState } from 'react';
import { api } from '../api/client';

interface WhyPanelProps {
  runId?: string | null;
  currentState?: string | null;
  targetConcept?: string | null;
}

export const WhyPanel: React.FC<WhyPanelProps> = ({ runId, currentState, targetConcept }) => {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [whyData, setWhyData] = useState<{
    why?: string;
    reason?: string;
    current_state?: string;
    target_concept?: string;
    [key: string]: any;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWhy = async () => {
    if (!runId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getWhy(runId);
      setWhyData(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch pedagogical rationale');
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen && !whyData && runId) {
      fetchWhy();
    }
  };

  return (
    <div className="rounded-xl bg-[#0E1526]/90 border border-[#00D2FF]/20 p-3 shadow-lg backdrop-blur-sm transition-all hover:border-[#00D2FF]/40">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between text-left group"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base drop-shadow-[0_0_8px_rgba(0,210,255,0.4)]">
            psychology_alt
          </span>
          <span className="font-mono text-xs font-semibold text-[#00D2FF] group-hover:text-cyan-300 transition-colors">
            Why this step?
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 border border-sky-400/30 text-sky-300 uppercase">
            Pedagogy Rationale
          </span>
        </div>
        <span className="material-symbols-outlined text-sm text-sky-400 transition-transform">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-[#1F2F4A] flex flex-col gap-2 text-xs">
          {loading ? (
            <div className="flex items-center gap-2 text-[#8EA4B8] py-2 font-mono">
              <span className="material-symbols-outlined text-sm animate-spin text-primary">sync</span>
              Querying Supervisor Agent decision trace...
            </div>
          ) : error ? (
            <div className="text-rose-400 py-1 font-mono flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={fetchWhy}
                className="underline text-sky-400 hover:text-sky-300 ml-2"
              >
                Retry
              </button>
            </div>
          ) : whyData ? (
            <div className="flex flex-col gap-2">
              <div className="text-[#DFE8F2] leading-relaxed">
                {whyData.why || whyData.reason || JSON.stringify(whyData)}
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1F2F4A]/40 text-[10px] font-mono text-[#8EA4B8]">
                {whyData.current_state && (
                  <span>State: <strong className="text-sky-300">{whyData.current_state}</strong></span>
                )}
                {whyData.target_concept && (
                  <span>Target: <strong className="text-slate-300">{whyData.target_concept}</strong></span>
                )}
                <button
                  onClick={fetchWhy}
                  className="ml-auto text-sky-400 hover:text-sky-300 flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-xs">sync</span>
                  Refresh
                </button>
              </div>
            </div>
          ) : (
            <div className="text-[#8EA4B8] py-1 font-mono">
              Current state: <strong className="text-sky-300">{currentState || 'ACTIVE'}</strong>
              {targetConcept && <span> · Concept: <strong className="text-slate-300">{targetConcept}</strong></span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
