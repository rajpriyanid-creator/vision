import React from 'react';
import { useVision } from '../context/VisionContext';

export const DagVisualizer: React.FC = () => {
  const { session } = useVision();

  if (!session || !session.dag) {
    return (
      <div className="p-4 rounded-xl bg-[#090D16] border border-[#1F2F4A] text-xs text-[#8EA4B8] text-center">
        No DAG topology loaded.
      </div>
    );
  }

  const dag = session.dag;
  const conceptTitles = session.concept_titles || {};
  const activeConcept = session.active_concept || session.target_id;
  const targetId = session.target_id || session.target_concept;
  const candidatePrereq = session.candidate_prerequisite;
  const taughtConcepts = session.taught_concepts || [];

  // Parse adjacency or nodes
  const nodes = Object.keys(dag);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase text-[#8EA4B8] flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-[#00D2FF]">account_tree</span>
          Prerequisite Dependency Graph
        </span>
        <span className="text-[10px] font-mono text-[#00D2FF] bg-[#00D2FF]/10 px-2 py-0.5 rounded border border-[#00D2FF]/20">
          {nodes.length} Nodes
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {nodes.map((nodeKey) => {
          const prereqs = dag[nodeKey] || [];
          const isTarget = nodeKey === targetId;
          const isActive = nodeKey === activeConcept;
          const isCandidate = nodeKey === candidatePrereq;
          const isTaught = taughtConcepts.includes(nodeKey);
          const title = conceptTitles[nodeKey] || nodeKey.replace(/_/g, ' ');

          let badgeColor = 'border-[#1F2F4A] bg-[#0E1526] text-[#8EA4B8]';
          if (isActive) {
            badgeColor = 'border-[#00D2FF] bg-[#00D2FF]/15 text-[#00D2FF] font-semibold ring-1 ring-[#00D2FF]';
          } else if (isCandidate) {
            badgeColor = 'border-rose-500 bg-rose-500/15 text-rose-300 font-semibold ring-1 ring-rose-500';
          } else if (isTaught) {
            badgeColor = 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300';
          } else if (isTarget) {
            badgeColor = 'border-amber-500/50 bg-amber-500/10 text-amber-300';
          }

          return (
            <div
              key={nodeKey}
              className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${badgeColor}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-current" />
                  <span className="text-xs capitalize">{title}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isTarget && (
                    <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                      Target
                    </span>
                  )}
                  {isActive && (
                    <span className="text-[10px] font-mono uppercase bg-[#00D2FF]/20 text-[#00D2FF] px-1.5 py-0.5 rounded border border-[#00D2FF]/30">
                      Active
                    </span>
                  )}
                  {isCandidate && (
                    <span className="text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/30">
                      Repair Gap
                    </span>
                  )}
                </div>
              </div>

              {prereqs.length > 0 && (
                <div className="flex items-center gap-1 text-[10px] opacity-75 pl-4">
                  <span className="material-symbols-outlined text-xs rotate-90">subdirectory_arrow_right</span>
                  <span>Prerequisites:</span>
                  <span className="font-mono text-[10px] text-[#DFE8F2]">
                    {prereqs.map((p: string) => conceptTitles[p] || p).join(', ')}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
