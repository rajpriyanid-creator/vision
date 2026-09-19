import React, { useMemo } from 'react';
import { DAGNode, DAGEdge } from '../types/vision';

interface PrerequisiteGraphProps {
  dag?: Record<string, string[]> | { nodes?: any[]; edges?: any[] } | any;
  conceptTitles?: Record<string, string>;
  currentConcept?: string;
  candidatePrerequisite?: string;
  prereqChain?: string[];
  taughtConcepts?: string[];
  targetConcept?: string;
  onSelectConcept?: (conceptId: string) => void;
}

export const PrerequisiteGraph: React.FC<PrerequisiteGraphProps> = ({
  dag,
  conceptTitles = {},
  currentConcept,
  candidatePrerequisite,
  prereqChain = [],
  taughtConcepts = [],
  targetConcept,
  onSelectConcept
}) => {
  // Parse DAG into standardized nodes and edges
  const { nodes, edges } = useMemo(() => {
    const parsedNodes: DAGNode[] = [];
    const parsedEdges: DAGEdge[] = [];
    const nodeMap = new Map<string, DAGNode>();

    if (!dag) {
      return { nodes: parsedNodes, edges: parsedEdges };
    }

    // Format A: { nodes: [...], edges: [...] }
    if (dag.nodes && Array.isArray(dag.nodes)) {
      dag.nodes.forEach((n: any) => {
        const id = typeof n === 'string' ? n : n.id || n.concept_id || String(n);
        const title = conceptTitles[id] || (typeof n === 'object' ? n.title || n.name : id);
        const nodeObj: DAGNode = { id, title };
        nodeMap.set(id, nodeObj);
      });

      if (dag.edges && Array.isArray(dag.edges)) {
        dag.edges.forEach((e: any) => {
          const from = e.from || e.source || e[0];
          const to = e.to || e.target || e[1];
          if (from && to) {
            parsedEdges.push({ from: String(from), to: String(to) });
          }
        });
      }
    } else if (typeof dag === 'object') {
      // Format B: Adjacency list: { "nodeA": ["nodeB", "nodeC"], ... }
      Object.keys(dag).forEach((sourceId) => {
        if (!nodeMap.has(sourceId)) {
          nodeMap.set(sourceId, {
            id: sourceId,
            title: conceptTitles[sourceId] || sourceId
          });
        }
        const targets = dag[sourceId];
        if (Array.isArray(targets)) {
          targets.forEach((targetId: string) => {
            if (!nodeMap.has(targetId)) {
              nodeMap.set(targetId, {
                id: targetId,
                title: conceptTitles[targetId] || targetId
              });
            }
            parsedEdges.push({ from: sourceId, to: targetId });
          });
        }
      });
    }

    // Determine status of each node based on runtime state
    nodeMap.forEach((node) => {
      const idLower = node.id.toLowerCase();
      const currLower = (currentConcept || '').toLowerCase();
      const candLower = (candidatePrerequisite || '').toLowerCase();
      const targetLower = (targetConcept || '').toLowerCase();

      if (idLower === candLower || (candidatePrerequisite && node.title.toLowerCase().includes(candLower))) {
        node.status = 'candidate_prereq';
      } else if (idLower === currLower || (currentConcept && node.title.toLowerCase().includes(currLower))) {
        node.status = 'current';
      } else if (idLower === targetLower || (targetConcept && node.title.toLowerCase().includes(targetLower))) {
        node.status = 'current';
      } else if (taughtConcepts.some(tc => tc.toLowerCase() === idLower || tc.toLowerCase() === node.title.toLowerCase())) {
        node.status = 'repaired';
      } else if (prereqChain.some(pc => pc.toLowerCase() === idLower)) {
        node.status = 'repaired';
      } else {
        node.status = 'normal';
      }
      parsedNodes.push(node);
    });

    return { nodes: parsedNodes, edges: parsedEdges };
  }, [dag, conceptTitles, currentConcept, candidatePrerequisite, prereqChain, taughtConcepts, targetConcept]);

  if (nodes.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-[#0E1526]/80 border border-[#1F2F4A] text-center text-xs text-[#8EA4B8]">
        <div className="flex items-center justify-center gap-2 mb-1 text-sky-400">
          <span className="material-symbols-outlined text-base">account_tree</span>
          <span className="font-semibold uppercase tracking-wider">Prerequisite Graph</span>
        </div>
        No concept graph available for this session.
      </div>
    );
  }

  // Calculate layout coordinates for SVG rendering
  // Horizontal hierarchy: topological columns
  const nodePositions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const count = nodes.length;
    const width = 360;
    const height = Math.max(220, count * 55);

    // Group into levels based on incoming edges
    const inDegree = new Map<string, number>();
    nodes.forEach(n => inDegree.set(n.id, 0));
    edges.forEach(e => {
      inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
    });

    // Simple layered distribution
    nodes.forEach((node, idx) => {
      const deg = inDegree.get(node.id) || 0;
      const x = deg === 0 ? 70 : deg === 1 ? 180 : 290;
      const y = 40 + (idx * ((height - 60) / Math.max(1, count - 1)));
      pos.set(node.id, { x, y });
    });

    return { pos, width, height };
  }, [nodes, edges]);

  return (
    <div className="rounded-xl bg-[#0E1526]/90 border border-[#1F2F4A] p-4 flex flex-col gap-3 shadow-lg relative overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">account_tree</span>
          <span className="font-mono text-xs font-semibold text-on-surface uppercase tracking-wider">
            Concept Dependency Graph
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#8EA4B8] px-1.5 py-0.5 rounded bg-[#141F36]">
          {nodes.length} Nodes
        </span>
      </div>

      <div className="relative w-full overflow-x-auto rounded-lg bg-[#06080F]/90 border border-[#1F2F4A]/60 p-2">
        <svg
          viewBox={`0 0 ${nodePositions.width} ${nodePositions.height}`}
          className="w-full h-auto min-w-[300px]"
          style={{ maxHeight: '280px' }}
        >
          <defs>
            <marker
              id="graph-arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#62778A" opacity="0.7" />
            </marker>
            <marker
              id="graph-arrow-active"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#00D2FF" />
            </marker>
          </defs>

          {/* Render Edges */}
          {edges.map((edge, idx) => {
            const start = nodePositions.pos.get(edge.from);
            const end = nodePositions.pos.get(edge.to);
            if (!start || !end) return null;

            const isPrereqCandidateEdge =
              edge.from === candidatePrerequisite || edge.to === candidatePrerequisite;

            return (
              <g key={`edge-${idx}`}>
                <line
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke={isPrereqCandidateEdge ? '#FF6B6B' : '#3C494E'}
                  strokeWidth={isPrereqCandidateEdge ? 2 : 1.2}
                  strokeDasharray={isPrereqCandidateEdge ? '4 2' : undefined}
                  markerEnd={isPrereqCandidateEdge ? 'url(#graph-arrow-active)' : 'url(#graph-arrow)'}
                />
              </g>
            );
          })}

          {/* Render Nodes */}
          {nodes.map((node) => {
            const pos = nodePositions.pos.get(node.id);
            if (!pos) return null;

            const isCurrent = node.status === 'current';
            const isPrereq = node.status === 'candidate_prereq';
            const isRepaired = node.status === 'repaired';

            let fillColor = '#0E1526';
            let strokeColor = '#62778A';
            let textColor = '#DFE8F2';

            if (isCurrent) {
              fillColor = '#00232F';
              strokeColor = '#00D2FF';
              textColor = '#00D2FF';
            } else if (isPrereq) {
              fillColor = '#2A0808';
              strokeColor = '#FF6B6B';
              textColor = '#FF8585';
            } else if (isRepaired) {
              fillColor = '#042A1D';
              strokeColor = '#10B981';
              textColor = '#4EDEA3';
            }

            return (
              <g
                key={node.id}
                className="cursor-pointer transition-transform duration-150 hover:scale-105"
                onClick={() => onSelectConcept?.(node.id)}
              >
                {isCurrent && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="16"
                    fill="none"
                    stroke="#00D2FF"
                    strokeWidth="1.5"
                    opacity="0.5"
                    className="animate-ping"
                  />
                )}
                {isPrereq && (
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r="16"
                    fill="none"
                    stroke="#FF6B6B"
                    strokeWidth="1.5"
                    opacity="0.6"
                    className="animate-pulse"
                  />
                )}

                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="12"
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth="2"
                />

                <text
                  x={pos.x}
                  y={pos.y + 20}
                  textAnchor="middle"
                  fill={textColor}
                  fontSize="9px"
                  fontFamily="'JetBrains Mono', monospace"
                  fontWeight={isCurrent || isPrereq ? '600' : '400'}
                >
                  {node.title.length > 16 ? `${node.title.slice(0, 14)}…` : node.title}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-mono text-[#8EA4B8] pt-1 border-t border-[#1F2F4A]/60">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#00D2FF]"></span>
          <span>Target/Active</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#FF6B6B]"></span>
          <span>Prerequisite Gap</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
          <span>Repaired / Mastered</span>
        </div>
      </div>
    </div>
  );
};
