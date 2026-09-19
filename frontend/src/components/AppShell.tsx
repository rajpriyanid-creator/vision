import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';
import { BackendConfigModal } from './BackendConfigModal';

interface AppShellProps {
  currentTab: 'study' | 'history' | 'profile' | 'graph';
  onTabChange: (tab: 'study' | 'history' | 'profile' | 'graph') => void;
  onNewSession: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onTabChange,
  onNewSession,
  children
}) => {
  const {
    session,
    studentId,
    backendConnected,
    backendLatency,
    refreshSession,
    loading
  } = useVision();

  const [configModalOpen, setConfigModalOpen] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const subject = session?.subject;
  const targetConcept = session?.target_concept;
  const learnerLevel = session?.learner_level;
  const learningGoal = session?.learning_goal;
  const currentState = session?.current_state || 'IDLE';

  // Determine active step in breadcrumbs
  const isLearnActive = currentState === 'INITIAL_TEACHING' || currentState === 'START_STUDY';
  const isPracticeActive = currentState === 'PRACTICE' || currentState === 'GENERATE_EXERCISE';
  const isDiagnoseActive = currentState === 'DIAGNOSE_GAP' || currentState === 'VALIDATE_HYPOTHESIS' || currentState === 'TIE_BREAKER';
  const isRepairActive = currentState === 'RETEACH_PREREQ' || currentState === 'SELECT_RESOURCE' || currentState === 'RESOURCE_CROSS_CHECK' || currentState === 'GO_DEEPER';
  const isRetestActive = currentState === 'RECHECK_GAP' || currentState === 'RECHECK_ORIGINAL';
  const isMasteredActive = currentState === 'TARGET_MASTERED' || currentState === 'SESSION_COMPLETE';

  return (
    <div className="min-h-screen bg-[#090D16] text-[#DFE8F2] flex flex-col font-sans selection:bg-[#00D2FF]/20 selection:text-[#00D2FF]">
      {/* Backend Config Modal */}
      <BackendConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
      />

      {/* Left Sidebar (Desktop) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[260px] bg-[#060910] z-50 flex-col justify-between border-r border-[#1F2F4A]/60 shadow-[4px_0_24px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <div className="flex flex-col">
          {/* Logo & Brand */}
          <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1F2F4A]/50">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#00D2FF]/25 to-[#10B981]/10 border border-[#00D2FF]/40 flex items-center justify-center text-[#00D2FF] shadow-[0_0_14px_rgba(0,210,255,0.3)]">
              <span className="material-symbols-outlined text-xl">psychology</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-wider text-white flex items-center gap-1.5 font-mono">
                VISION <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-[#00D2FF]/10 text-[#00D2FF] border border-[#00D2FF]/30">CORE</span>
              </span>
              <span className="font-mono text-[10px] tracking-wider text-[#8EA4B8]">
                ADAPTIVE STUDY ENGINE
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="px-3 py-4 flex flex-col gap-1">
            <div className="px-3 py-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#8EA4B8] font-medium">
                Navigation
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#00D2FF]/40" />
            </div>

            <nav className="flex flex-col gap-1 mt-1">
              <button
                onClick={() => onTabChange('study')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-xs font-mono font-medium text-left ${
                  currentTab === 'study'
                    ? 'bg-gradient-to-r from-[#00D2FF]/15 to-transparent text-[#00D2FF] border-l-2 border-[#00D2FF] shadow-[inset_0_0_12px_rgba(0,210,255,0.08)]'
                    : 'text-[#8EA4B8] hover:bg-[#0E1526] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">cognition</span>
                <span>Active Study</span>
              </button>

              <button
                onClick={() => onTabChange('history')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-xs font-mono font-medium text-left ${
                  currentTab === 'history'
                    ? 'bg-gradient-to-r from-[#00D2FF]/15 to-transparent text-[#00D2FF] border-l-2 border-[#00D2FF]'
                    : 'text-[#8EA4B8] hover:bg-[#0E1526] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">history</span>
                <span>Session History</span>
              </button>

              <button
                onClick={() => onTabChange('profile')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-xs font-mono font-medium text-left ${
                  currentTab === 'profile'
                    ? 'bg-gradient-to-r from-[#00D2FF]/15 to-transparent text-[#00D2FF] border-l-2 border-[#00D2FF]'
                    : 'text-[#8EA4B8] hover:bg-[#0E1526] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">neurology</span>
                <span>Learner Memory</span>
              </button>

              <button
                onClick={() => onTabChange('graph')}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all text-xs font-mono font-medium text-left ${
                  currentTab === 'graph'
                    ? 'bg-gradient-to-r from-[#00D2FF]/15 to-transparent text-[#00D2FF] border-l-2 border-[#00D2FF]'
                    : 'text-[#8EA4B8] hover:bg-[#0E1526] hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-lg">account_tree</span>
                <span>Prerequisite DAG</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Student Profile & Backend Status Badge */}
        <div className="p-3 border-t border-[#1F2F4A]/50 bg-[#0A101D]/80 backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 rounded-lg bg-[#141F36] border border-[#00D2FF]/30 flex items-center justify-center text-[#00D2FF] font-mono text-xs font-bold">
                  {studentId.slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      backendConnected ? 'bg-[#10B981]' : 'bg-[#FF6B6B]'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      backendConnected ? 'bg-[#10B981]' : 'bg-[#FF6B6B]'
                    }`}
                  />
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-mono text-xs font-semibold text-white">
                  {studentId}
                </span>
                <span
                  className={`font-mono text-[10px] flex items-center gap-1 font-medium ${
                    backendConnected ? 'text-[#10B981]' : 'text-[#FF6B6B]'
                  }`}
                >
                  {backendConnected ? 'LIVE BACKEND' : 'OFFLINE'}
                </span>
              </div>
            </div>

            <button
              onClick={() => setConfigModalOpen(true)}
              aria-label="Backend Settings"
              title="Configure FastAPI Backend URL"
              className="text-[#8EA4B8] hover:text-[#00D2FF] transition-colors p-1.5 rounded-md hover:bg-[#141F36]"
            >
              <span className="material-symbols-outlined text-base">tune</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 lg:left-[260px] right-0 h-16 bg-[#090D16]/90 backdrop-blur-xl border-b border-[#1F2F4A]/60 z-40 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-[#141F36] text-[#8EA4B8] hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">menu</span>
          </button>

          {/* Current Session Context */}
          <div className="flex items-center gap-2 truncate">
            {subject && targetConcept ? (
              <div className="flex items-center gap-2 text-xs font-mono truncate">
                <span className="text-[#00D2FF] font-semibold uppercase tracking-wider hidden sm:inline">
                  Context:
                </span>
                <span className="font-semibold text-white truncate">
                  {subject} · {targetConcept}
                </span>
                {learnerLevel && (
                  <span className="hidden xl:inline-block px-2 py-0.5 rounded bg-[#141F36] border border-[#1F2F4A] text-slate-300 text-[10px]">
                    {learnerLevel}
                  </span>
                )}
                {learningGoal && (
                  <span className="hidden 2xl:inline-block px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px]">
                    {learningGoal}
                  </span>
                )}
              </div>
            ) : (
              <div className="text-xs font-mono text-[#8EA4B8]">
                VISION Adaptive Multi-Agent Study Engine
              </div>
            )}
          </div>
        </div>

        {/* Adaptive Breadcrumb Flow */}
        <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#060910] border border-[#1F2F4A]/60 text-[11px] font-mono">
          <div className={`flex items-center gap-1 ${isLearnActive ? 'text-[#00D2FF] font-bold' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-xs">school</span>
            <span>LEARN</span>
          </div>
          <span className="text-slate-700">›</span>

          <div className={`flex items-center gap-1 ${isPracticeActive ? 'text-[#00D2FF] font-bold' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-xs">edit_note</span>
            <span>PRACTICE</span>
          </div>
          <span className="text-slate-700">›</span>

          <div className={`flex items-center gap-1 ${isDiagnoseActive ? 'text-[#FF6B6B] font-bold' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-xs">troubleshoot</span>
            <span>DIAGNOSE</span>
          </div>
          <span className="text-slate-700">›</span>

          <div className={`flex items-center gap-1 ${isRepairActive ? 'text-purple-300 font-bold' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-xs">build</span>
            <span>REPAIR</span>
          </div>
          <span className="text-slate-700">›</span>

          <div className={`flex items-center gap-1 ${isRetestActive ? 'text-sky-300 font-bold' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-xs">fact_check</span>
            <span>RE-TEST</span>
          </div>
          <span className="text-slate-700">›</span>

          <div className={`flex items-center gap-1 ${isMasteredActive ? 'text-[#10B981] font-bold' : 'text-slate-500'}`}>
            <span className="material-symbols-outlined text-xs">verified</span>
            <span>MASTERED</span>
          </div>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Backend Health Badge / Config Button */}
          <button
            onClick={() => setConfigModalOpen(true)}
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-mono text-[11px] transition-colors ${
              backendConnected === true
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:border-emerald-400'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-400 hover:border-rose-400'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendConnected ? 'bg-[#10B981] animate-pulse' : 'bg-[#FF6B6B]'
              }`}
            />
            <span>{backendConnected ? `${backendLatency || '<10'}ms` : 'Offline'}</span>
          </button>

          {/* Refresh session */}
          {session && (
            <button
              onClick={refreshSession}
              disabled={loading}
              title="Refresh session from backend"
              className="px-2.5 py-1.5 rounded-lg bg-[#141F36] hover:bg-[#1C2740] text-slate-200 border border-[#1F2F4A] transition-colors font-mono text-xs flex items-center gap-1"
            >
              <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin text-primary' : ''}`}>
                sync
              </span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}

          {/* New Session CTA */}
          <button
            onClick={onNewSession}
            className="px-3 py-1.5 rounded-lg bg-[#00D2FF] hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all shadow-[0_0_12px_rgba(0,210,255,0.3)] flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            <span>New Session</span>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />
          <div className="relative w-64 max-w-[80vw] bg-[#060910] border-r border-[#1F2F4A] h-full flex flex-col justify-between p-4 z-10">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#1F2F4A]">
                <span className="font-mono text-sm font-bold text-[#00D2FF]">VISION CORE</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-slate-400"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <nav className="flex flex-col gap-2 font-mono text-xs">
                <button
                  onClick={() => {
                    onTabChange('study');
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded text-left hover:bg-[#141F36] text-white"
                >
                  Active Study
                </button>
                <button
                  onClick={() => {
                    onTabChange('history');
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded text-left hover:bg-[#141F36] text-slate-300"
                >
                  Session History
                </button>
                <button
                  onClick={() => {
                    onTabChange('profile');
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded text-left hover:bg-[#141F36] text-slate-300"
                >
                  Learner Memory
                </button>
                <button
                  onClick={() => {
                    onTabChange('graph');
                    setMobileMenuOpen(false);
                  }}
                  className="p-2.5 rounded text-left hover:bg-[#141F36] text-slate-300"
                >
                  Prerequisite DAG
                </button>
              </nav>
            </div>

            <div className="pt-3 border-t border-[#1F2F4A] flex flex-col gap-2">
              <button
                onClick={() => {
                  setConfigModalOpen(true);
                  setMobileMenuOpen(false);
                }}
                className="text-xs font-mono text-[#00D2FF] flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">tune</span>
                <span>FastAPI Backend URL</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="lg:pl-[260px] pt-16 min-h-screen flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
};
