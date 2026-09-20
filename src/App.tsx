import React, { useState } from 'react';
import { useVision } from './context/VisionContext';
import { NewSessionForm } from './components/NewSessionForm';
import { InitialTeaching } from './components/InitialTeaching';
import { ExerciseRenderer } from './components/ExerciseRenderer';
import { RepairLesson } from './components/RepairLesson';
import { PrereqSurveyView } from './components/PrereqSurveyView';
import { PrereqQuizView } from './components/PrereqQuizView';
import { HumanInTheLoopView } from './components/HumanInTheLoopView';
import { MasterySummary } from './components/MasterySummary';
import { VisionRoadmap } from './components/VisionRoadmap';
import { DagVisualizer } from './components/DagVisualizer';
import { AgentTimeline } from './components/AgentTimeline';
import { BackendConfigModal } from './components/BackendConfigModal';
import { StudentProfileDrawer } from './components/StudentProfileDrawer';
import { AgentStatusBar } from './components/AgentStatusBar';
import { SystemHealthBanner } from './components/SystemHealthBanner';

export const App: React.FC = () => {
  const {
    session,
    currentState,
    runId,
    studentId,
    loading,
    loadingMessage,
    error,
    clearError,
    backendConnected,
    backendLatency,
    resetCurrentSession,
    refreshSession
  } = useVision();

  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [profileDrawerOpen, setProfileDrawerOpen] = useState<boolean>(false);
  const [activeSideTab, setActiveSideTab] = useState<'roadmap' | 'dag' | 'agents'>('roadmap');

  // Decide which primary view to render
  const renderMainContent = () => {
    if (!session || !runId) {
      return <NewSessionForm />;
    }

    switch (currentState) {
      case 'START_STUDY':
      case 'READ_LEARNER_STATE':
      case 'LOAD_COURSE_CONTEXT':
      case 'PLAN_NEXT_ACTION':
        return <NewSessionForm />;

      case 'PREREQ_SURVEY':
        return <PrereqSurveyView />;

      case 'PREREQ_QUIZ':
        return <PrereqQuizView />;

      case 'INITIAL_TEACHING':
        return <InitialTeaching />;

      case 'PRACTICE':
      case 'EVALUATION':
      case 'TIE_BREAKER':
      case 'RECHECK_GAP':
      case 'RECHECK_ORIGINAL':
      case 'GENERATE_EXERCISE':
        return <ExerciseRenderer />;

      case 'RETEACH_PREREQ':
      case 'DIAGNOSE_GAP':
      case 'SELECT_RESOURCE':
      case 'VALIDATE_HYPOTHESIS':
        return <RepairLesson />;

      case 'WAITING_FOR_HUMAN':
        return <HumanInTheLoopView />;

      case 'TARGET_MASTERED':
      case 'SESSION_COMPLETE':
        return <MasterySummary />;

      default:
        // Fallback depending on available payload
        if (session.exercise) return <ExerciseRenderer />;
        if (session.teaching_action) return <InitialTeaching />;
        return <NewSessionForm />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-[#DFE8F2] selection:bg-[#00D2FF]/20 selection:text-[#00D2FF]">
      {/* Persistent System Health Diagnostic Alert Banner */}
      <SystemHealthBanner />

      {/* Top Agent Status Bar for Continuous Live Telemetry in Every Page */}
      <AgentStatusBar />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#1F2F4A] bg-[#0B111E]/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#00D2FF] to-[#0066FF] flex items-center justify-center text-black font-black text-base shadow-[0_0_15px_rgba(0,210,255,0.3)]">
              V
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-white tracking-wider text-sm font-mono flex items-center gap-1.5">
                VISION
                <span className="text-[10px] font-normal text-[#00D2FF] px-1.5 py-0.2 rounded bg-[#00D2FF]/10 border border-[#00D2FF]/20">
                  ENGINE v2.5
                </span>
              </span>
              <span className="text-[10px] text-[#8EA4B8]">Multi-Agent Continuous Adaptive Learning & Prerequisite Engine</span>
            </div>
          </div>
        </div>

        {/* Center state indicator (if in active study) */}
        {session && runId && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0E1526] border border-[#1F2F4A] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF] animate-pulse" />
            <span className="text-[#8EA4B8]">State:</span>
            <span className="font-mono font-semibold text-white uppercase">{currentState || 'ACTIVE'}</span>
            <span className="text-[#1F2F4A]">|</span>
            <span className="text-[#8EA4B8]">Target:</span>
            <span className="font-medium text-[#00D2FF] truncate max-w-[140px]">{session.target_concept}</span>
            {session.learning_parts && (
              <>
                <span className="text-[#1F2F4A]">|</span>
                <span className="text-[#10B981] font-mono text-[11px] font-semibold">
                  Part {(session.current_part_index ?? 0) + 1}/{session.n_parts || session.learning_parts.length}
                </span>
              </>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Backend Connection Indicator */}
          <button
            onClick={() => setConfigModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0E1526] hover:bg-[#141F36] border border-[#1F2F4A] text-xs transition-colors cursor-pointer"
            title="Backend Connection Settings"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendConnected === true
                  ? 'bg-[#10B981]'
                  : backendConnected === false
                  ? 'bg-rose-500'
                  : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="font-mono text-[11px] text-[#8EA4B8] hidden sm:inline">
              {backendConnected === true ? `${backendLatency ?? 0}ms` : 'Connecting'}
            </span>
            <span className="material-symbols-outlined text-xs text-[#8EA4B8]">tune</span>
          </button>

          {/* Student Profile Button */}
          <button
            onClick={() => setProfileDrawerOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0E1526] hover:bg-[#141F36] border border-[#1F2F4A] text-xs text-white transition-colors cursor-pointer"
            title="Learner Profile"
          >
            <span className="material-symbols-outlined text-sm text-[#00D2FF]">person</span>
            <span className="font-mono text-xs hidden sm:inline">{studentId}</span>
          </button>

          {/* New Session or Refresh */}
          {session && (
            <>
              <button
                onClick={() => refreshSession()}
                className="p-1.5 rounded-lg bg-[#0E1526] hover:bg-[#141F36] border border-[#1F2F4A] text-[#8EA4B8] hover:text-white transition-colors cursor-pointer"
                title="Refresh Session"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
              </button>
              <button
                onClick={() => resetCurrentSession()}
                className="px-3 py-1.5 rounded-lg bg-[#141F36] hover:bg-[#1F2F4A] text-xs font-semibold text-white border border-[#1F2F4A] transition-colors cursor-pointer"
              >
                New Session
              </button>
            </>
          )}
        </div>
      </header>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-rose-950/90 border-b border-rose-500/40 px-4 py-2.5 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-400 text-sm">error</span>
            <span>{error}</span>
          </div>
          <button
            onClick={clearError}
            className="p-1 rounded hover:bg-rose-900/50 text-rose-300 hover:text-white"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}

      {/* Global Loading Overlay (non-blocking banner) */}
      {loading && (
        <div className="bg-[#00D2FF]/10 border-b border-[#00D2FF]/20 px-4 py-2 text-xs text-[#00D2FF] flex items-center justify-center gap-2 animate-pulse font-mono">
          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
          <span>{loadingMessage || 'Processing multi-agent task...'}</span>
        </div>
      )}

      {/* Main Layout Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Agent Interaction Canvas */}
        <section
          className={
            session && runId
              ? 'lg:col-span-8 flex flex-col gap-6'
              : 'col-span-12 flex flex-col gap-6'
          }
        >
          {/* Always show VisionRoadmap at top of active sessions */}
          {session && runId && currentState !== 'START_STUDY' && (
            <VisionRoadmap />
          )}

          {renderMainContent()}
        </section>

        {/* Telemetry & Sidebars (When session active) */}
        {session && runId && (
          <aside className="lg:col-span-4 flex flex-col gap-4">
            {/* Tab selector */}
            <div className="grid grid-cols-3 p-1 rounded-xl bg-[#0E1526] border border-[#1F2F4A]">
              <button
                type="button"
                onClick={() => setActiveSideTab('roadmap')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSideTab === 'roadmap'
                    ? 'bg-[#141F36] text-[#00D2FF] shadow-sm border border-[#00D2FF]/30'
                    : 'text-[#8EA4B8] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xs">timeline</span>
                Roadmap
              </button>
              <button
                type="button"
                onClick={() => setActiveSideTab('dag')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSideTab === 'dag'
                    ? 'bg-[#141F36] text-[#00D2FF] shadow-sm border border-[#00D2FF]/30'
                    : 'text-[#8EA4B8] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xs">account_tree</span>
                DAG
              </button>
              <button
                type="button"
                onClick={() => setActiveSideTab('agents')}
                className={`py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                  activeSideTab === 'agents'
                    ? 'bg-[#141F36] text-[#00D2FF] shadow-sm border border-[#00D2FF]/30'
                    : 'text-[#8EA4B8] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xs">hub</span>
                Agents
              </button>
            </div>

            {/* Sidebar Tab Content */}
            <div className="rounded-2xl bg-[#0E1526]/95 border border-[#1F2F4A] p-4 shadow-xl">
              {activeSideTab === 'roadmap' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1F2F4A]">
                    <span className="font-mono text-xs font-bold text-white uppercase">Vision Milestones</span>
                    <span className="text-[10px] font-mono text-[#00D2FF]">
                      Part {(session.current_part_index ?? 0) + 1} of {session.n_parts || session.learning_parts?.length || 1}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {session.learning_parts?.map((p, idx) => {
                      const isCur = idx === (session.current_part_index ?? 0);
                      const isMast = p.status === 'mastered';
                      return (
                        <div
                          key={p.id || idx}
                          className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 ${
                            isMast
                              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                              : isCur
                              ? 'bg-[#00D2FF]/15 border-[#00D2FF]/50 text-white'
                              : 'bg-[#090D16] border-[#1F2F4A] text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="font-bold">Part {p.part_number}</span>
                            <span className="uppercase font-semibold">{p.status}</span>
                          </div>
                          <div className="font-bold text-slate-100">{p.title}</div>
                          <div className="text-[11px] text-slate-400 leading-tight">{p.subtitle}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeSideTab === 'dag' ? (
                <DagVisualizer />
              ) : (
                <AgentTimeline />
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Modals & Drawers */}
      <BackendConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />
      <StudentProfileDrawer
        isOpen={profileDrawerOpen}
        onClose={() => setProfileDrawerOpen(false)}
      />
    </div>
  );
};

export default App;

