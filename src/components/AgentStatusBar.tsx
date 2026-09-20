import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';
import { SessionState } from '../types/vision';

interface AgentInfo {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  role: string;
  activeStates: SessionState[];
}

const AGENTS: AgentInfo[] = [
  {
    id: 'supervisor',
    name: 'Supervisor Agent',
    shortName: 'Supervisor',
    icon: 'manage_accounts',
    role: 'Workflow & Lifecycle Orchestration',
    activeStates: ['START_STUDY', 'PLAN_NEXT_ACTION', 'PREREQ_SURVEY', 'TARGET_MASTERED', 'SESSION_COMPLETE']
  },
  {
    id: 'resource',
    name: 'Resource Agent',
    shortName: 'Resource',
    icon: 'library_books',
    role: 'Grounding Evidence & Course Provenance',
    activeStates: ['SELECT_RESOURCE', 'RESOURCE_CROSS_CHECK']
  },
  {
    id: 'tutor',
    name: 'Tutor Agent',
    shortName: 'Tutor',
    icon: 'school',
    role: 'Dynamic Definition, 2-3 Examples & Python Pseudocode',
    activeStates: ['INITIAL_TEACHING', 'RETEACH_PREREQ']
  },
  {
    id: 'exercise',
    name: 'Exercise Agent',
    shortName: 'Exercise',
    icon: 'psychology',
    role: 'Adaptive Assessment & Quality Gate',
    activeStates: ['PREREQ_QUIZ', 'PRACTICE', 'GENERATE_EXERCISE', 'TIE_BREAKER', 'RECHECK_GAP', 'RECHECK_ORIGINAL']
  },
  {
    id: 'evaluation',
    name: 'Evaluation Agent',
    shortName: 'Evaluation',
    icon: 'fact_check',
    role: 'Sandboxed Code Execution & Grading',
    activeStates: ['EVALUATION']
  },
  {
    id: 'diagnostic',
    name: 'Diagnostic Agent',
    shortName: 'Diagnostic',
    icon: 'stethoscope',
    role: 'Prerequisite Gap Analysis & DAG Validation',
    activeStates: ['DIAGNOSE_GAP', 'VALIDATE_HYPOTHESIS']
  }
];

export const AgentStatusBar: React.FC = () => {
  const {
    session,
    currentState,
    loading,
    loadingMessage,
    events,
    handoffs,
    runId
  } = useVision();

  const [expanded, setExpanded] = useState<boolean>(false);

  // Determine current active and running agents
  const getAgentStatus = (agent: AgentInfo): {
    status: 'RUNNING' | 'ACTIVE' | 'COMPLETED' | 'STANDBY';
    activityDesc: string;
  } => {
    // If global loading is true, match by loading message or current state
    if (loading) {
      const msg = (loadingMessage || '').toLowerCase();
      if (
        (agent.id === 'tutor' && (msg.includes('tutor') || msg.includes('teach') || msg.includes('lesson'))) ||
        (agent.id === 'exercise' && (msg.includes('exercise') || msg.includes('quiz') || msg.includes('question'))) ||
        (agent.id === 'evaluation' && (msg.includes('eval') || msg.includes('grad') || msg.includes('sandbox'))) ||
        (agent.id === 'diagnostic' && (msg.includes('diagnos') || msg.includes('gap') || msg.includes('prereq'))) ||
        (agent.id === 'resource' && (msg.includes('resource') || msg.includes('ground') || msg.includes('evidence'))) ||
        (agent.id === 'supervisor' && (msg.includes('supervis') || msg.includes('session') || msg.includes('orchestrat')))
      ) {
        return {
          status: 'RUNNING',
          activityDesc: loadingMessage || 'Executing task...'
        };
      }
      // If no specific match but this agent owns current state, mark running
      if (currentState && agent.activeStates.includes(currentState)) {
        return {
          status: 'RUNNING',
          activityDesc: loadingMessage || 'Processing state transition...'
        };
      }
    }

    // Active state mapping
    if (currentState && agent.activeStates.includes(currentState)) {
      return {
        status: 'ACTIVE',
        activityDesc: `Active in state: ${currentState}`
      };
    }

    // Check if agent participated in recent events or handoffs
    const recentHandoff = handoffs && handoffs.length > 0 ? handoffs[handoffs.length - 1] : null;
    if (
      recentHandoff &&
      ((recentHandoff.to && recentHandoff.to.toLowerCase().includes(agent.id)) ||
       (recentHandoff.from && recentHandoff.from.toLowerCase().includes(agent.id)))
    ) {
      return {
        status: 'COMPLETED',
        activityDesc: `Recent handoff: ${recentHandoff.from || 'Agent'} ➔ ${recentHandoff.to || 'Agent'}`
      };
    }

    const recentEvent = events.slice(-3).find(e =>
      (e.source_agent && e.source_agent.toLowerCase().includes(agent.id)) ||
      (e.target_agent && e.target_agent.toLowerCase().includes(agent.id))
    );
    if (recentEvent) {
      return {
        status: 'COMPLETED',
        activityDesc: recentEvent.action || recentEvent.reason || 'Task completed'
      };
    }

    return {
      status: 'STANDBY',
      activityDesc: 'Ready on standby'
    };
  };

  const activeRunningCount = AGENTS.filter(a => {
    const s = getAgentStatus(a).status;
    return s === 'RUNNING' || s === 'ACTIVE';
  }).length;

  return (
    <div className="w-full bg-[#070B14] border-b border-[#1A263D] text-xs font-mono relative z-50 shadow-md">
      {/* Top Banner Row */}
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Indicator & Status Title */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>DEV AGENT STATUS</span>
          </div>
          <span className="text-[#64748B] hidden sm:inline">|</span>
          <span className="text-slate-300 text-[11px] hidden sm:inline">
            Active Agents: <strong className="text-[#00D2FF]">{activeRunningCount} / {AGENTS.length}</strong>
          </span>
          {loading && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#00D2FF]/10 border border-[#00D2FF]/30 text-[#00D2FF] text-[11px] animate-pulse">
              <span className="material-symbols-outlined text-xs animate-spin">sync</span>
              <span>{loadingMessage || 'Agent executing...'}</span>
            </div>
          )}
        </div>

        {/* Center / Right: Live Agent Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
          {AGENTS.map((agent) => {
            const { status } = getAgentStatus(agent);
            const isRunning = status === 'RUNNING';
            const isActive = status === 'ACTIVE';

            return (
              <div
                key={agent.id}
                title={`${agent.name} (${agent.role}): ${status}`}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  isRunning
                    ? 'bg-[#00D2FF]/20 border border-[#00D2FF] text-white shadow-[0_0_10px_rgba(0,210,255,0.3)] animate-pulse'
                    : isActive
                    ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                    : 'bg-[#0E1526] border border-[#1F2F4A] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[13px] text-[#00D2FF]">
                  {agent.icon}
                </span>
                <span className="font-semibold">{agent.shortName}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    isRunning
                      ? 'bg-[#00D2FF] text-black font-black'
                      : isActive
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {status}
                </span>
              </div>
            );
          })}

          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 p-1 rounded bg-[#0E1526] border border-[#1F2F4A] text-slate-400 hover:text-white hover:border-[#00D2FF] transition-colors cursor-pointer"
            title="Toggle Agent Telemetry Inspector"
          >
            <span className="material-symbols-outlined text-sm">
              {expanded ? 'expand_less' : 'tune'}
            </span>
          </button>
        </div>
      </div>

      {/* Expanded Agent Telemetry Drawer */}
      {expanded && (
        <div className="border-t border-[#1A263D] bg-[#050810] px-4 py-3 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            {AGENTS.map((agent) => {
              const { status, activityDesc } = getAgentStatus(agent);
              return (
                <div
                  key={agent.id}
                  className={`p-2.5 rounded-lg border flex flex-col gap-1.5 transition-all ${
                    status === 'RUNNING'
                      ? 'bg-[#00D2FF]/10 border-[#00D2FF]/60'
                      : status === 'ACTIVE'
                      ? 'bg-emerald-950/40 border-emerald-500/40'
                      : 'bg-[#0A0F1D] border-[#1A263D]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs">
                      <span className="material-symbols-outlined text-xs text-[#00D2FF]">
                        {agent.icon}
                      </span>
                      <span>{agent.shortName}</span>
                    </div>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono uppercase font-bold ${
                        status === 'RUNNING'
                          ? 'bg-[#00D2FF] text-black'
                          : status === 'ACTIVE'
                          ? 'bg-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {agent.role}
                  </span>
                  <div className="text-[10px] text-[#00D2FF] font-mono truncate border-t border-[#1F2F4A]/60 pt-1 mt-0.5">
                    {activityDesc}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t border-[#1A263D] text-[11px] text-slate-400">
            <div className="flex items-center gap-3">
              <span>Session State: <strong className="text-white">{currentState || 'IDLE'}</strong></span>
              <span>Run ID: <strong className="text-[#00D2FF]">{runId ? runId.slice(0, 16) + '...' : 'None'}</strong></span>
              {session?.active_concept && (
                <span>Active Concept: <strong className="text-emerald-400">{session.active_concept}</strong></span>
              )}
            </div>
            <span className="text-[10px] text-slate-500">Live Agent Multi-Thread Architecture (VISION Engine v2.5)</span>
          </div>
        </div>
      )}
    </div>
  );
};
