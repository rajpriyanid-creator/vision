import React, { useState } from 'react';
import { useVision } from '../context/VisionContext';
import { LearningPart } from '../types/vision';

interface VisionRoadmapProps {
  compact?: boolean;
}

export const VisionRoadmap: React.FC<VisionRoadmapProps> = ({ compact = false }) => {
  const { session } = useVision();
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [visionExpanded, setVisionExpanded] = useState<boolean>(!compact);

  if (!session) return null;

  const parts: LearningPart[] = session.learning_parts || [];
  const currentIndex = session.current_part_index ?? 0;
  const totalParts = session.n_parts || (parts.length > 0 ? parts.length : 1);
  const visionStatement = session.vision_statement || `Master ${session.target_concept || 'target concept'} systematically across all operational dimensions.`;
  const transitionData = session.part_transition_data;

  // Calculate overall progress percentage
  const masteredCount = parts.filter(p => p.status === 'mastered').length;
  const progressPercent = Math.round((masteredCount / Math.max(totalParts, 1)) * 100);

  const activePart = parts[currentIndex] || parts[0];

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Milestone Transition Alert Banner */}
      {transitionData && session.current_state === 'INITIAL_TEACHING' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/80 via-[#0B1A2F] to-[#0E1526] border border-emerald-500/50 shadow-lg flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-xl">workspace_premium</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                Milestone Unlocked!
              </span>
              <p className="text-xs text-slate-200 mt-0.5">
                {transitionData.message || `Part ${transitionData.previous_part?.part_number || 1} mastered! Advancing to Part ${transitionData.next_part?.part_number || 2}.`}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-semibold">
            {masteredCount}/{totalParts} Complete
          </span>
        </div>
      )}

      {/* Main Vision Roadmap Card */}
      <div className="rounded-2xl bg-[#0B111E]/95 border border-[#1F2F4A] p-5 sm:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        {/* Subtle decorative glow */}
        <div className="absolute -right-20 -top-20 w-56 h-56 bg-[#00D2FF]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-4">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-1 rounded bg-[#00D2FF]/15 border border-[#00D2FF]/40 text-[#00D2FF] font-mono text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,210,255,0.15)]">
                <span className="material-symbols-outlined text-sm">visibility</span>
                CLEAR VISION ROADMAP
              </div>
              <span className="text-xs font-mono text-[#8EA4B8]">
                {totalParts} Systematic Milestone Parts
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-28 sm:w-36 h-2 bg-[#141F36] rounded-full overflow-hidden border border-[#1F2F4A]">
                  <div
                    className="h-full bg-gradient-to-r from-[#00D2FF] to-[#10B981] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold text-white">
                  {progressPercent}%
                </span>
              </div>

              <button
                onClick={() => setVisionExpanded(!visionExpanded)}
                className="text-xs font-mono text-[#8EA4B8] hover:text-white flex items-center gap-1 cursor-pointer"
                title="Toggle Vision Statement"
              >
                <span>{visionExpanded ? 'Collapse' : 'Details'}</span>
                <span className="material-symbols-outlined text-sm">
                  {visionExpanded ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
          </div>

          {/* Overarching Vision Statement */}
          {visionExpanded && (
            <div className="p-3.5 rounded-xl bg-[#070B14] border border-[#1F2F4A] flex flex-col gap-1.5 transition-all">
              <div className="flex items-center gap-1.5 text-xs font-mono text-[#00D2FF] uppercase tracking-wider">
                <span className="material-symbols-outlined text-sm">flag</span>
                <span>The Vision for {session.target_concept || 'Mastery'}</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans">
                {visionStatement}
              </p>
            </div>
          )}

          {/* Stepper / Parts Timeline */}
          {parts.length > 0 && (
            <div className="flex flex-col gap-2 pt-2">
              <div className="text-[11px] font-mono text-[#8EA4B8] uppercase tracking-wider flex items-center justify-between">
                <span>Progressive Mastery Flow</span>
                <span>Active Part: <strong className="text-[#00D2FF]">{currentIndex + 1} of {totalParts}</strong></span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {parts.map((part, idx) => {
                  const isMastered = part.status === 'mastered';
                  const isCurrent = idx === currentIndex && session.status !== 'completed';
                  const isRepairing = isCurrent && part.status === 'repairing';
                  const isSelected = selectedPartId === part.id;

                  let borderClass = 'border-[#1F2F4A] bg-[#0A101D] text-slate-400';
                  let badgeText = 'Upcoming';
                  let badgeClass = 'bg-[#141F36] text-slate-400 border-[#1F2F4A]';

                  if (isMastered) {
                    borderClass = 'border-emerald-500/40 bg-emerald-950/20 text-slate-200';
                    badgeText = 'Mastered';
                    badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
                  } else if (isRepairing) {
                    borderClass = 'border-amber-500/50 bg-amber-950/20 text-slate-100 shadow-[0_0_15px_rgba(245,158,11,0.15)]';
                    badgeText = 'Repairing Gap';
                    badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse';
                  } else if (isCurrent) {
                    borderClass = 'border-[#00D2FF]/50 bg-[#00D2FF]/10 text-white shadow-[0_0_15px_rgba(0,210,255,0.15)]';
                    badgeText = 'Active Part';
                    badgeClass = 'bg-[#00D2FF]/20 text-[#00D2FF] border-[#00D2FF]/40 animate-pulse';
                  }

                  return (
                    <div
                      key={part.id || idx}
                      onClick={() => setSelectedPartId(isSelected ? null : part.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between gap-2 hover:border-[#00D2FF]/60 ${borderClass}`}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] uppercase font-bold text-[#8EA4B8]">
                            Part {part.part_number}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${badgeClass}`}>
                            {badgeText}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white line-clamp-1">
                          {part.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {part.subtitle}
                        </p>
                      </div>

                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-[#1F2F4A]/60">
                        <span className="truncate max-w-[120px]">{part.cognitive_demand}</span>
                        <span className="text-sky-400 flex items-center gap-0.5">
                          {isSelected ? 'Less' : 'Details'}
                          <span className="material-symbols-outlined text-xs">
                            {isSelected ? 'expand_less' : 'expand_more'}
                          </span>
                        </span>
                      </div>

                      {/* Expandable Focus Areas Popup/Drawer */}
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-[#1F2F4A] flex flex-col gap-1.5 text-xs animate-fade-in bg-[#060A13] p-2.5 rounded-lg">
                          <div className="font-semibold text-[#00D2FF] text-[11px]">
                            Objective:
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">
                            {part.objective}
                          </p>

                          <div className="font-semibold text-slate-400 text-[10px] uppercase tracking-wider mt-1">
                            Key Focus Areas:
                          </div>
                          <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-0.5">
                            {part.key_focus_areas?.map((fa, fIdx) => (
                              <li key={fIdx} className="truncate">{fa}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
