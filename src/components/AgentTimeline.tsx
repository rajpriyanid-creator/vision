import React from 'react';
import { useVision } from '../context/VisionContext';

export const AgentTimeline: React.FC = () => {
  const { events, handoffs, isRefreshingEvents } = useVision();

  const agentColorMap: Record<string, string> = {
    SupervisorAgent: 'text-[#00D2FF] border-[#00D2FF]/40 bg-[#00D2FF]/10',
    DiagnosticAgent: 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10',
    ResourceAgent: 'text-[#10B981] border-[#10B981]/40 bg-[#10B981]/10',
    TutorAgent: 'text-[#A855F7] border-[#A855F7]/40 bg-[#A855F7]/10',
    ExerciseAgent: 'text-[#3B82F6] border-[#3B82F6]/40 bg-[#3B82F6]/10',
    EvaluationAgent: 'text-[#EC4899] border-[#EC4899]/40 bg-[#EC4899]/10',
    Controller: 'text-[#8EA4B8] border-[#8EA4B8]/40 bg-[#8EA4B8]/10'
  };

  if (!events || events.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2F4A] text-xs text-[#8EA4B8] text-center">
        No multi-agent events recorded for current session.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase text-[#8EA4B8] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-[#00D2FF]">hub</span>
          Multi-Agent Trace Log
        </span>
        {isRefreshingEvents && (
          <span className="material-symbols-outlined text-xs text-[#00D2FF] animate-spin">
            sync
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto pr-1">
        {events.slice().reverse().map((evt, idx) => {
          const agent = evt.source_agent || 'SupervisorAgent';
          const color = agentColorMap[agent] || 'text-[#DFE8F2] border-[#1F2F4A] bg-[#0E1526]';
          const time = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : '';

          return (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-[#090D16] border border-[#1F2F4A] flex flex-col gap-1 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded border font-mono text-[10px] font-bold ${color}`}>
                  {agent}
                </span>
                <span className="font-mono text-[10px] text-[#8EA4B8]">{time}</span>
              </div>
              <p className="text-white font-medium text-xs mt-0.5">{evt.action || evt.reason || 'Agent Action'}</p>
              {evt.reason && evt.reason !== evt.action && (
                <p className="text-[11px] text-[#8EA4B8] leading-relaxed line-clamp-2">{evt.reason}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
