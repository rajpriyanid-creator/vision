import React, { useState } from 'react';
import { VisionProvider, useVision } from './context/VisionContext';
import { AppShell } from './components/AppShell';
import { NewSessionForm } from './components/NewSessionForm';
import { PrereqSurvey } from './components/PrereqSurvey';
import { PrereqQuiz } from './components/PrereqQuiz';
import { InitialTeaching } from './components/InitialTeaching';
import { ExerciseRenderer } from './components/ExerciseRenderer';
import { EvaluationCard } from './components/EvaluationCard';
import { AdaptiveDecision } from './components/AdaptiveDecision';
import { DiagnosticPanel } from './components/DiagnosticPanel';
import { ResourceSelectionView } from './components/ResourceSelectionView';
import { RepairLesson } from './components/RepairLesson';
import { TieBreaker } from './components/TieBreaker';
import { DeeperDiagnosis } from './components/DeeperDiagnosis';
import { HumanEscalation } from './components/HumanEscalation';
import { MasteryView } from './components/MasteryView';
import { PrerequisiteGraph } from './components/PrerequisiteGraph';
import { WhyPanel } from './components/WhyPanel';
import { AgentTimeline } from './components/AgentTimeline';
import { SessionHistory } from './components/SessionHistory';
import { StudentProfileView } from './components/StudentProfileView';

const VisionDashboard: React.FC = () => {
  const {
    session,
    evaluation,
    resourceSelection,
    events,
    refreshEvents,
    isRefreshingEvents,
    resetSession,
    loadSession,
    error,
    clearError
  } = useVision();

  const [currentTab, setCurrentTab] = useState<'study' | 'history' | 'profile' | 'graph'>('study');
  const [selectedDagNode, setSelectedDagNode] = useState<string | null>(null);

  const handleNewSessionClick = () => {
    resetSession();
    setCurrentTab('study');
  };

  const currentState = session?.current_state || 'IDLE';

  // Render workspace content based on state
  const renderStudyWorkspace = () => {
    if (!session) {
      return <NewSessionForm />;
    }

    return (
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Left / Center Work Area (7 cols on large, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          {/* Error Banner if any */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-slate-400 hover:text-white"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
          )}

          {/* If there is an active evaluation, display evaluation card prominently */}
          {evaluation && (
            <EvaluationCard evaluation={evaluation} />
          )}

          {/* State-specific Interactive Component */}
          {currentState === 'PREREQ_SURVEY' ? (
            <PrereqSurvey />
          ) : currentState === 'PREREQ_QUIZ' ? (
            <PrereqQuiz />
          ) : currentState === 'INITIAL_TEACHING' || currentState === 'START_STUDY' ? (
            <InitialTeaching />
          ) : currentState === 'PRACTICE' || currentState === 'GENERATE_EXERCISE' ? (
            <ExerciseRenderer titlePrefix="Target Concept Practice" />
          ) : currentState === 'DIAGNOSE_GAP' || currentState === 'VALIDATE_HYPOTHESIS' ? (
            <DiagnosticPanel />
          ) : currentState === 'TIE_BREAKER' ? (
            <TieBreaker />
          ) : currentState === 'SELECT_RESOURCE' || currentState === 'RESOURCE_CROSS_CHECK' ? (
            <ResourceSelectionView
              resourceSelection={resourceSelection}
              isCrossCheck={currentState === 'RESOURCE_CROSS_CHECK'}
            />
          ) : currentState === 'RETEACH_PREREQ' ? (
            <RepairLesson />
          ) : currentState === 'RECHECK_GAP' ? (
            <ExerciseRenderer
              titlePrefix="Prerequisite Checkpoint Probe"
              isRecheck={true}
              recheckConcept={session.candidate_prerequisite}
            />
          ) : currentState === 'GO_DEEPER' ? (
            <DeeperDiagnosis />
          ) : currentState === 'RECHECK_ORIGINAL' ? (
            <ExerciseRenderer
              titlePrefix="Target Concept Re-test"
              isRecheck={false}
              recheckConcept={session.target_concept}
            />
          ) : currentState === 'WAITING_FOR_HUMAN' ? (
            <HumanEscalation />
          ) : currentState === 'TARGET_MASTERED' || currentState === 'SESSION_COMPLETE' ? (
            <MasteryView
              onNewSession={handleNewSessionClick}
              onViewHistory={() => setCurrentTab('history')}
            />
          ) : (
            // Fallback for intermediate loading / unknown state
            <div className="p-8 rounded-xl bg-[#0E1526] border border-[#1F2F4A] text-center font-mono text-xs text-[#8EA4B8]">
              Current State: <strong className="text-[#00D2FF]">{currentState}</strong>
            </div>
          )}

          {/* Adaptive Plan Change Notification (Visible when agents make decisions) */}
          {currentState !== 'TARGET_MASTERED' && currentState !== 'SESSION_COMPLETE' && (
            <AdaptiveDecision
              currentState={currentState}
              evaluation={evaluation}
              events={events}
              candidatePrerequisite={session.candidate_prerequisite}
              targetConcept={session.target_concept}
            />
          )}
        </div>

        {/* Right Rail: Graph, Pedagogy Rationale, Multi-Agent Telemetry (5 cols on large, 4 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-5">
          {/* Interactive DAG Graph */}
          <PrerequisiteGraph
            dag={session.dag}
            targetConcept={session.target_concept}
            candidatePrerequisite={session.candidate_prerequisite}
            onSelectConcept={(nodeId: string) => setSelectedDagNode(nodeId)}
          />

          {/* Real "Why this step?" Rationale */}
          <WhyPanel
            runId={session.run_id}
            currentState={session.current_state}
            targetConcept={session.target_concept}
          />

          {/* Real Agent Runtime Telemetry Timeline */}
          <AgentTimeline
            events={events}
            handoffs={session.handoffs}
            onRefresh={refreshEvents}
            isRefreshing={isRefreshingEvents}
          />
        </div>
      </div>
    );
  };

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={setCurrentTab}
      onNewSession={handleNewSessionClick}
    >
      {currentTab === 'study' && renderStudyWorkspace()}

      {currentTab === 'history' && (
        <div className="p-4 sm:p-6">
          <SessionHistory
            onSelectSession={(runId) => {
              loadSession(runId);
              setCurrentTab('study');
            }}
            onBackToStudy={() => setCurrentTab('study')}
          />
        </div>
      )}

      {currentTab === 'profile' && (
        <div className="p-4 sm:p-6">
          <StudentProfileView
            onBackToStudy={() => setCurrentTab('study')}
          />
        </div>
      )}

      {currentTab === 'graph' && (
        <div className="p-4 sm:p-6 max-w-6xl mx-auto w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-xs uppercase tracking-widest text-[#00D2FF] font-bold">
                Knowledge Dependency Explorer
              </span>
              <h1 className="text-2xl font-bold text-white">
                Course Prerequisite DAG
              </h1>
            </div>
            <button
              onClick={() => setCurrentTab('study')}
              className="px-4 py-2 rounded-xl bg-[#141F36] hover:bg-[#1C2740] border border-[#1F2F4A] text-xs font-mono text-slate-200"
            >
              Back to Study
            </button>
          </div>

          <div className="rounded-2xl bg-[#0E1526] border border-[#1F2F4A] p-4">
            <PrerequisiteGraph
              dag={session?.dag}
              targetConcept={session?.target_concept}
              candidatePrerequisite={session?.candidate_prerequisite}
              onSelectConcept={(id: string) => setSelectedDagNode(id)}
            />
          </div>

          {selectedDagNode && (
            <div className="p-4 rounded-xl bg-[#06080F] border border-[#00D2FF]/40 text-xs font-mono">
              <span className="text-sky-400 font-bold">Selected Node:</span>{' '}
              <span className="text-white">{selectedDagNode}</span>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
};

export function App() {
  return (
    <VisionProvider>
      <VisionDashboard />
    </VisionProvider>
  );
}

export default App;
