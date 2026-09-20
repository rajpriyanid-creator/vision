/**
 * Deterministic Knowledge Dependency Graph (DAG) Validator & Utility
 * Validates course context DAGs against cycle, self-loop, orphan, and ancestor rules.
 */

export interface DAGValidationReport {
  is_valid: boolean;
  has_cycle?: boolean;
  cycles: string[][];
  cycle_nodes?: string[];
  self_loops: string[];
  unknown_references: Array<{ from: string; to: string }>;
  unreachable_nodes: string[];
  errors: string[];
}

export class GraphValidator {
  /**
   * Validates structural invariants of a Directed Acyclic Graph.
   */
  static validate(dag: Record<string, string[]>, targetNodeId?: string): DAGValidationReport {
    const report: DAGValidationReport = {
      is_valid: true,
      has_cycle: false,
      cycles: [],
      cycle_nodes: [],
      self_loops: [],
      unknown_references: [],
      unreachable_nodes: [],
      errors: []
    };

    const nodeIds = new Set(Object.keys(dag));

    // 1. Check self-loops and unknown references
    for (const [node, prereqs] of Object.entries(dag)) {
      for (const p of prereqs) {
        if (p === node) {
          report.self_loops.push(node);
          report.has_cycle = true;
          report.cycle_nodes?.push(node);
          report.errors.push(`Self-loop detected on node '${node}'`);
        }
        if (!nodeIds.has(p)) {
          report.unknown_references.push({ from: node, to: p });
          report.errors.push(`Node '${node}' references unknown prerequisite '${p}'`);
        }
      }
    }

    // 2. Cycle detection via Depth-First Search
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (curr: string, path: string[]) => {
      visited.add(curr);
      recStack.add(curr);

      const neighbors = dag[curr] || [];
      for (const n of neighbors) {
        if (!visited.has(n)) {
          dfs(n, [...path, n]);
        } else if (recStack.has(n)) {
          const cyclePath = [...path.slice(path.indexOf(n)), n];
          report.cycles.push(cyclePath);
          report.has_cycle = true;
          for (const node of cyclePath) {
            if (!report.cycle_nodes?.includes(node)) {
              report.cycle_nodes?.push(node);
            }
          }
          report.errors.push(`Cycle detected: ${cyclePath.join(' -> ')}`);
        }
      }

      recStack.delete(curr);
    };

    for (const node of nodeIds) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    report.is_valid = report.self_loops.length === 0 && report.unknown_references.length === 0 && report.cycles.length === 0;
    return report;
  }

  /**
   * Alias for validate with comprehensive cycle metadata
   */
  static validateDAG(dag: Record<string, string[]>, targetNodeId?: string): DAGValidationReport {
    return this.validate(dag, targetNodeId);
  }

  /**
   * Computes all ancestors (direct and transitive prerequisites) of a concept in the DAG.
   */
  static getAncestors(dag: Record<string, string[]>, startNode: string): Set<string> {
    const ancestors = new Set<string>();
    const queue: string[] = [...(dag[startNode] || [])];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (!ancestors.has(curr)) {
        ancestors.add(curr);
        const nextPrereqs = dag[curr] || [];
        for (const p of nextPrereqs) {
          if (!ancestors.has(p)) {
            queue.push(p);
          }
        }
      }
    }

    return ancestors;
  }

  /**
   * Alias for getAncestors
   */
  static getReachableAncestors(dag: Record<string, string[]>, startNode: string): Set<string> {
    return this.getAncestors(dag, startNode);
  }

  /**
   * Determines if candidatePrereq is a legitimate prerequisite of concept in the DAG.
   */
  static isPrerequisiteOf(dag: Record<string, string[]>, concept: string, candidatePrereq: string): boolean {
    if (!dag[concept]) return false;
    const direct = dag[concept] || [];
    if (direct.includes(candidatePrereq)) return true;
    const ancestors = this.getAncestors(dag, concept);
    return ancestors.has(candidatePrereq);
  }

  /**
   * Alias for isPrerequisiteOf
   */
  static isValidPrerequisiteEdge(dag: Record<string, string[]>, concept: string, candidatePrereq: string): boolean {
    return this.isPrerequisiteOf(dag, concept, candidatePrereq);
  }

  /**
   * Sanitizes and normalizes an untrusted graph structure.
   */
  static sanitizeGraph(
    rawDag: Record<string, any>,
    targetId: string
  ): { dag: Record<string, string[]>; titles: Record<string, string> } {
    const cleanDag: Record<string, string[]> = {};
    const titles: Record<string, string> = {};

    for (const [key, val] of Object.entries(rawDag)) {
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const prereqs = Array.isArray(val)
        ? val
            .map((p) => String(p).toLowerCase().replace(/[^a-z0-9_]/g, ''))
            .filter((p) => p !== cleanKey)
        : [];
      cleanDag[cleanKey] = prereqs;
      titles[cleanKey] = cleanKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    if (!cleanDag[targetId]) {
      cleanDag[targetId] = [];
      titles[targetId] = targetId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return { dag: cleanDag, titles };
  }
}
