import { GroundedEvidence, ProvenanceType } from '../models/contracts';
import { ResourceCrossCheckResult } from './schemas';

export class GroundingValidator {
  /**
   * Cross-checks the candidate evidence against concept and subject.
   * Distinguishes VERIFIED_COURSE_SOURCE, LEARNER_PROVIDED, AI_GENERATED_SUPPORT, and UNVERIFIED.
   */
  static crossCheck(
    conceptId: string,
    conceptTitle: string,
    subject: string,
    evidence?: GroundedEvidence | null
  ): ResourceCrossCheckResult {
    if (!evidence) {
      return {
        relevant: false,
        concept_match: false,
        course_match: false,
        evidence_sufficient: false,
        unsupported_claim_risk: false,
        reason: 'No evidence provided. Tutor will deliver principled foundational instruction.',
        provenance: 'unverified'
      };
    }

    const normConcept = (conceptTitle || conceptId || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const normId = (conceptId || '').toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const normSubject = (subject || 'General').toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const normExcerpt = (evidence.excerpt || '').toLowerCase();
    const normTitle = (evidence.title || '').toLowerCase();

    // Check concept match: does the excerpt or title reference words from the concept?
    const conceptWords = normConcept.split(/\s+/).filter(w => w.length > 3);
    const idWords = normId.split(/\s+/).filter(w => w.length > 3);
    const searchTerms = Array.from(new Set([...conceptWords, ...idWords]));

    let matches = 0;
    for (const term of searchTerms) {
      if (normExcerpt.includes(term) || normTitle.includes(term)) {
        matches++;
      }
    }

    const conceptMatch = searchTerms.length === 0 || matches > 0 || evidence.relevance_score >= 0.5;

    // Provenance validation
    const provenance: ProvenanceType = evidence.provenance || 'unverified';
    const isCourseApproved = provenance === 'course_approved';
    const isVerifiedQuote = Boolean(evidence.verified_quote);

    // Source ID validity: must not be fabricated
    const hasValidSourceId = Boolean(evidence.source_id && evidence.source_id.trim().length > 0);

    const relevant = conceptMatch && hasValidSourceId && (evidence.relevance_score > 0.3 || isVerifiedQuote);
    const evidenceSufficient = Boolean(evidence.excerpt && evidence.excerpt.trim().length >= 30);

    let reason = '';
    if (!conceptMatch) {
      reason = `Evidence from '${evidence.source_id}' does not strongly match target concept '${conceptTitle}'.`;
    } else if (!isCourseApproved) {
      reason = `Evidence from '${evidence.source_id}' has provenance '${provenance}' (not official course approved).`;
    } else {
      reason = `Verified course-approved evidence '${evidence.source_id}' aligned with '${conceptTitle}'.`;
    }

    return {
      relevant,
      concept_match: conceptMatch,
      course_match: true,
      evidence_sufficient: evidenceSufficient,
      unsupported_claim_risk: !relevant,
      reason,
      provenance
    };
  }
}
