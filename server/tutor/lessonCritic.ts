import { TeachingAction } from '../models/contracts';
import { QualityGateResult, TutorContext } from './schemas';

export class LessonCritic {
  /**
   * Evaluates a candidate TeachingAction against pedagogical standards and safety constraints.
   */
  static evaluate(lesson: TeachingAction, context: TutorContext): QualityGateResult {
    const reasons: string[] = [];
    let status: 'PASS' | 'REVISE' | 'FAIL' = 'PASS';
    let leakageDetected = false;

    const explanationText = `${lesson.explanation || ''} ${lesson.explanation_text || ''}`.toLowerCase();
    const targetConcept = (context.concept_title || '').toLowerCase();
    const expectedAns = (context.hidden_expected_answer || '').toLowerCase().trim();

    // 1. Check Answer Leakage (CRITICAL SAFETY)
    if (expectedAns && expectedAns.length > 3) {
      if (explanationText.includes(expectedAns) && !explanationText.includes('example')) {
        leakageDetected = true;
        reasons.push(`Direct answer leakage risk detected for hidden expected answer: "${expectedAns}".`);
        status = 'REVISE';
      }
    }

    // 2. Check Concept Alignment
    const conceptTerms = targetConcept.split(/\s+/).filter(w => w.length > 3);
    const mentionsConcept = conceptTerms.some(term => explanationText.includes(term));
    if (!mentionsConcept && conceptTerms.length > 0) {
      reasons.push(`Lesson fails to explicitly address target concept "${context.concept_title}".`);
      status = 'REVISE';
    }

    // 3. Check Cognitive Overload (Word count & bloat)
    const wordCount = explanationText.split(/\s+/).length;
    let overloadScore = 0.2;
    if (wordCount > 600) {
      overloadScore = 0.8;
      reasons.push(`Lesson word count (${wordCount} words) exceeds cognitive load guidelines.`);
      if (context.learner_level === 'beginner') {
        status = 'REVISE';
      }
    }

    // 4. Check Groundedness & Provenance
    let groundingScore = lesson.is_course_grounded ? 0.95 : 0.6;
    if (context.evidence && !lesson.evidence_ref) {
      reasons.push(`Supplied evidence was not referenced in evidence_ref.`);
    }

    // 5. Check Misconception Alignment in Prerequisite Repair
    if (context.teaching_context === 'PREREQUISITE_REPAIR' && context.misconception) {
      const hasContrast = Boolean(lesson.misconception_contrast) || explanationText.includes('misconception') || explanationText.includes('instead') || explanationText.includes('common error');
      if (!hasContrast) {
        reasons.push(`Prerequisite repair does not explicitly contrast or address the diagnosed misconception.`);
        status = 'REVISE';
      }
    }

    // 6. Check Key Takeaways
    if (!lesson.key_takeaways || lesson.key_takeaways.length === 0) {
      reasons.push(`Lesson lacks structured key takeaways.`);
      if (status !== 'FAIL') status = 'REVISE';
    }

    const alignmentScore = status === 'PASS' ? 0.95 : status === 'REVISE' ? 0.6 : 0.2;

    let revisionGuidance: string | undefined;
    if (status === 'REVISE') {
      revisionGuidance = `Revise lesson to eliminate leakage, ensure concise focus on "${context.concept_title}", and incorporate structured takeaways and misconception contrast.`;
    }

    return {
      status,
      reasons,
      leakage_detected: leakageDetected,
      grounding_score: groundingScore,
      overload_score: overloadScore,
      objective_alignment_score: alignmentScore,
      actionable_revision_guidance: revisionGuidance
    };
  }
}
