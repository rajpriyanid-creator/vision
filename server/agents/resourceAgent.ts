/**
 * AGENT 3: RESOURCE AGENT
 * Retrieves, verifies, and ranks curriculum evidence.
 * Preserves provenance and rejects ungrounded or fabricated sources.
 */

import { ResourceSelection } from '../models/contracts';
import { evidenceRetriever } from '../retrieval/evidenceRetriever';

export interface ResourceInput {
  concept_id: string;
  concept_title: string;
  query_context?: string;
  require_course_approved?: boolean;
}

export class ResourceAgent {
  async selectResource(input: ResourceInput): Promise<ResourceSelection> {
    const { concept_id, concept_title, query_context } = input;

    // Use EvidenceRetriever for multi-layer search and quote verification
    const selection = evidenceRetriever.findEvidence(concept_id, concept_title, query_context);

    // Ensure safety bounds: do not invent citations or URL links
    return selection;
  }
}

export const resourceAgent = new ResourceAgent();
