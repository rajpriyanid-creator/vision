import React, { useState } from 'react';
import { AgentEvent, HandoffEvent } from '../types/vision';

interface AgentTimelineProps {
  events: AgentEvent[];
  handoffs?: HandoffEvent[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const AgentTimeline: React.FC<AgentTimelineProps> = ({
  events = [],
  handoffs = [],
  onRefresh,
  isRefreshing = false
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [selectedEvent, setSelectedEvent] = useState<AgentEvent | null>(null);

  const getAgentBadgeColor = (agentName?: string) => {
    const name = (agentName || '').toLowerCase();
    if (name.includes('tutor')) return 'bg-cyan-500/20 text-[#00D2FF] border-cyan-400/40';
    if (name.includes('diagnostic')) return 'bg-rose-500/20 text-[#FF6B6B] border-rose-400/40';
    if (name.includes('resource')) return 'bg-amber-500/20 text-[#F59E0B] border-amber-400/40';
    if (name.includes('evaluation')) return 'bg-emerald-500/20 text-[#10B981] border-emerald-400/40';
    if (name.includes('exercise')) return 'bg-purple-500/20 text-[#D0BCFF] border-purple-400/40';
    if (name.includes('supervisor') || name.includes('controller')) return 'bg-blue-500/20 text-blue-300 border-blue-400/40';
    return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
  };

  const getAgentIcon = (agentName?: string) => {
    const name = (agentName || '').toLowerCase();
    if (name.includes('tutor')) return 'psychology';
    if (name.includes('diagnostic')) return 'troubleshoot';
    if (name.includes('resource')) return 'library_books';
    if (name.includes('evaluation')) return 'fact_check';
    if (name.includes('exercise')) return 'edit_note';
    if (name.includes('supervisor')) return 'admin_panel_settings';
    if (name.includes('controller')) return 'route';
    return 'smart_toy';
  };

  return (
    <div className="rounded-xl bg-[#0E1526]/90 border border-[#1F2F4A] p-4 flex flex-col gap-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-2 text-left hover:text-[#00D2FF] transition-colors"
        >
          <span className="material-symbols-outlined text-primary text-base">hub</span>
          <span className="font-mono text-xs font-semibold text-on-surface uppercase tracking-wider">
            Multi-Agent Trace
          </span>
          <span className="text-[10px] font-mono text-[#8EA4B8] px-1.5 py-0.5 rounded bg-[#141F36]">
            {events.length} Events
          </span>
          <span className="material-symbols-outlined text-sm text-[#8EA4B8] transition-transform">
            {collapsed ? 'expand_more' : 'expand_less'}
          </span>
        </button>

        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-1 rounded hover:bg-[#141F36] text-[#8EA4B8] hover:text-[#00D2FF] transition-colors"
            title="Refresh runtime events"
          >
            <span className={`material-symbols-outlined text-sm ${isRefreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
          </button>
        )}
      </div>

      {!collapsed && (
        <>
          {events.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#8EA4B8] font-mono">
              Waiting for runtime agent telemetry...
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
              {events.map((evt, idx) => {
                const source = evt.source_agent || 'Workflow Controller';
                const target = evt.target_agent;
                const isSelected = selectedEvent === evt;

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedEvent(isSelected ? null : evt)}
                    className={`p-2.5 rounded-lg border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-[#141F36] border-[#00D2FF]/60 shadow-[0_0_10px_rgba(0,210,255,0.15)]'
                        : 'bg-[#0A101D] border-[#1F2F4A]/70 hover:border-[#62778A]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium flex items-center gap-1 ${getAgentBadgeColor(
                            source
                          )}`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {getAgentIcon(source)}
                          </span>
                          {source}
                        </span>

                        {target && (
                          <>
                            <span className="material-symbols-outlined text-xs text-slate-500">
                              arrow_forward
                            </span>
                            <span
                              className={`text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase font-medium flex items-center gap-1 ${getAgentBadgeColor(
                                target
                              )}`}
                            >
                              <span className="material-symbols-outlined text-xs">
                                {getAgentIcon(target)}
                              </span>
                              {target}
                            </span>
                          </>
                        )}
                      </div>

                      {evt.timestamp && (
                        <span className="text-[10px] font-mono text-[#8EA4B8]">
                          {evt.timestamp.includes('T')
                            ? evt.timestamp.split('T')[1]?.slice(0, 8)
                            : evt.timestamp.slice(-8)}
                        </span>
                      )}
                    </div>

                    {evt.action && (
                      <div className="text-xs text-[#DFE8F2] font-medium mb-0.5">
                        {evt.action}
                      </div>
                    )}

                    {evt.reason && (
                      <div className="text-[11px] text-[#8EA4B8] leading-tight">
                        {evt.reason}
                      </div>
                    )}

                    {isSelected && (
                      <div className="mt-2 pt-2 border-t border-[#1F2F4A] text-[10px] font-mono text-slate-400 flex flex-col gap-1">
                        {evt.state && <div>State: <span className="text-sky-300">{evt.state}</span></div>}
                        {evt.input_record_refs && (
                          <div>Input: <span className="text-slate-300">{JSON.stringify(evt.input_record_refs)}</span></div>
                        )}
                        {evt.output_record_refs && (
                          <div>Output: <span className="text-slate-300">{JSON.stringify(evt.output_record_refs)}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {handoffs.length > 0 && (
            <div className="pt-2 border-t border-[#1F2F4A]/60 flex flex-col gap-1">
              <div className="text-[10px] font-mono text-[#8EA4B8] uppercase tracking-wider">
                Recent Handoffs ({handoffs.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {handoffs.slice(-3).map((h, i) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#06080F] border border-[#1F2F4A] text-slate-300"
                  >
                    {h.from} → {h.to}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
