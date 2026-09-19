import React from 'react';
import { ResourceSelection } from '../types/vision';

interface ResourceSelectionViewProps {
  resourceSelection?: ResourceSelection | null;
  isCrossCheck?: boolean;
}

export const ResourceSelectionView: React.FC<ResourceSelectionViewProps> = ({
  resourceSelection,
  isCrossCheck = false
}) => {
  if (!resourceSelection) return null;

  const status = (resourceSelection.verification_status || 'verified').toLowerCase();
  const isRejected = status === 'off_target' || status === 'rejected';
  const isVerified = status === 'verified' || status === 'verified course source';
  const isExternal = status === 'external' || status === 'external source';
  const needsVerification = status === 'needs_verification' || status === 'could not establish';

  let statusBadge = 'bg-emerald-500/20 text-[#10B981] border-emerald-500/40';
  let statusText = 'Verified Course Source';

  if (isRejected) {
    statusBadge = 'bg-rose-500/20 text-[#FF6B6B] border-rose-500/40';
    statusText = 'Resource Rejected — Off Target';
  } else if (isExternal) {
    statusBadge = 'bg-sky-500/20 text-sky-300 border-sky-400/40';
    statusText = 'External Source';
  } else if (needsVerification) {
    statusBadge = 'bg-amber-500/20 text-[#F59E0B] border-amber-500/40';
    statusText = 'Needs Verification';
  }

  return (
    <div className="rounded-xl bg-[#0E1526]/95 border border-[#1F2F4A] p-5 sm:p-6 shadow-xl flex flex-col gap-4 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2F4A] pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#F59E0B] text-base">library_books</span>
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            Resource Agent · Evidence Retrieval
          </span>
          {isCrossCheck && (
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-[#D0BCFF] border border-purple-400/30">
              Tutor Cross-Check
            </span>
          )}
        </div>

        <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded border font-semibold ${statusBadge}`}>
          {statusText}
        </span>
      </div>

      {/* Rejection notice if cross-check rejected */}
      {isRejected && (
        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-xs font-mono text-rose-300 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 font-bold text-rose-200">
            <span className="material-symbols-outlined text-sm text-rose-400">cancel</span>
            <span>Resource Cross-Check: Content Divergence Detected</span>
          </div>
          <div>{resourceSelection.rejection_reason || 'Tutor Agent determined this retrieved snippet was off-target for the identified prerequisite gap. Initiating fallback retrieval.'}</div>
        </div>
      )}

      {/* Query & Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
        {resourceSelection.query && (
          <div className="p-3 rounded-lg bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-1">
            <span className="text-[10px] text-[#8EA4B8] uppercase">Retrieval Query:</span>
            <span className="text-sky-300">{resourceSelection.query}</span>
          </div>
        )}
        {resourceSelection.source && (
          <div className="p-3 rounded-lg bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-1">
            <span className="text-[10px] text-[#8EA4B8] uppercase">Source / Provenance:</span>
            <span className="text-slate-300">{resourceSelection.source} {resourceSelection.provenance ? `(${resourceSelection.provenance})` : ''}</span>
          </div>
        )}
      </div>

      {/* Excerpt */}
      {resourceSelection.excerpt && (
        <div className="p-4 rounded-xl bg-[#06080F] border border-[#1F2F4A] flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Retrieved Knowledge Excerpt:
          </span>
          <div className="text-xs text-[#DFE8F2] leading-relaxed italic">
            "{resourceSelection.excerpt}"
          </div>
        </div>
      )}

      {/* Recommended Links */}
      {resourceSelection.recommended_links && resourceSelection.recommended_links.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#8EA4B8]">
            Evidence Links:
          </span>
          <div className="flex flex-wrap gap-2">
            {resourceSelection.recommended_links.map((link, idx) => {
              const title = typeof link === 'string' ? link : link.title || link.url || 'Reference';
              const url = typeof link === 'string' ? link : link.url || '#';
              return (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#06080F] border border-[#1F2F4A] hover:border-[#00D2FF] text-xs font-mono text-sky-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-xs">open_in_new</span>
                  <span>{title}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
