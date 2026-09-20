import {
  Exercise,
  ExerciseAnswerKey
} from '../models/contracts';
import {
  ExerciseBlueprint,
  QuestionQualityMetric,
  QuestionQualityResult
} from './types';
import { LeakageGuard } from './leakageGuard';
import { AnswerKeyValidator } from './answerKeyValidator';
import { QuestionFreshness } from './freshness';

export class ExerciseQualityGate {
  /**
   * Evaluates generated exercise and answer key against rigor, consistency, and security metrics.
   */
  static evaluate(
    exercise: Exercise,
    answerKey: ExerciseAnswerKey,
    blueprint: ExerciseBlueprint,
    previousSignatures: string[] = []
  ): QuestionQualityResult {
    const metrics: QuestionQualityMetric[] = [];
    const leakageReasons: string[] = [];
    const inconsistencies: string[] = [];
    const revisionSuggestions: string[] = [];

    // 1. Concept & Objective Alignment Metric
    const promptText = (exercise.prompt || exercise.question_text || '').toLowerCase();
    const conceptTitle = (exercise.concept_title || '').toLowerCase();
    const hasConceptMention =
      promptText.includes(conceptTitle) ||
      conceptTitle.split(' ').some((w) => w.length > 3 && promptText.includes(w));

    metrics.push({
      name: 'concept_alignment',
      passed: Boolean(exercise.prompt && exercise.concept_id),
      score: hasConceptMention ? 1.0 : 0.8,
      detail: hasConceptMention
        ? 'Prompt directly references target concept or core terminology'
        : 'Prompt aligns conceptually with target objective'
    });

    // 2. Generic Question Anti-Pattern Check
    const isGenericSlop =
      promptText.includes('what is the primary architectural purpose of') ||
      promptText.includes('is an important concept') ||
      promptText.includes('what is x used for') ||
      (promptText.length < 25 && !promptText.includes('?'));

    if (isGenericSlop) {
      inconsistencies.push('Prompt matches banned generic AI fallback pattern.');
      revisionSuggestions.push('Formulate a concept-specific concrete scenario or invariant test.');
    }
    metrics.push({
      name: 'domain_specificity',
      passed: !isGenericSlop,
      score: isGenericSlop ? 0.0 : 1.0,
      detail: isGenericSlop ? 'Rejected generic phrasing' : 'Domain-specific phrasing verified'
    });

    // 3. Independent Consistency Validation (MCQ, fill-in, writing, coding)
    const consistency = AnswerKeyValidator.validate(exercise, answerKey, blueprint);
    metrics.push({
      name: 'answer_key_consistency',
      passed: consistency.is_consistent,
      score: consistency.is_consistent ? 1.0 : 0.0,
      detail: consistency.is_consistent
        ? 'Answer key is fully consistent with question specification'
        : consistency.issues.join('; ')
    });
    if (!consistency.is_consistent) {
      inconsistencies.push(...consistency.issues);
    }

    // 4. Anti-Leakage Scan
    const leakage = LeakageGuard.check(exercise, answerKey);
    metrics.push({
      name: 'answer_leakage_protection',
      passed: !leakage.has_leakage,
      score: leakage.has_leakage ? 0.0 : 1.0,
      detail: leakage.has_leakage ? leakage.reasons.join('; ') : 'No answer leakage detected'
    });
    if (leakage.has_leakage) {
      leakageReasons.push(...leakage.reasons);
    }

    // 5. Question Freshness & Anti-Duplication
    const promptSignature = QuestionFreshness.generateSignature(
      exercise.prompt || exercise.question_text || '',
      exercise.format || 'mcq'
    );
    const isDuplicate = QuestionFreshness.isDuplicate(promptSignature, previousSignatures);

    metrics.push({
      name: 'question_freshness',
      passed: !isDuplicate,
      score: isDuplicate ? 0.0 : 1.0,
      detail: isDuplicate ? 'Question is a duplicate of a recent item' : 'Fresh question verified'
    });
    if (isDuplicate) {
      inconsistencies.push('Question is identical or near-duplicate to previous exercise.');
      revisionSuggestions.push('Use isomorphic variation with new parameters or scenario context.');
    }

    // Determine final status
    const allPassed = metrics.every((m) => m.passed) && !leakage.has_leakage && inconsistencies.length === 0;
    const canRevise = inconsistencies.length <= 2 && !leakage.has_leakage;

    const status: 'PASS' | 'REVISE' | 'FAIL' = allPassed
      ? 'PASS'
      : canRevise
      ? 'REVISE'
      : 'FAIL';

    return {
      status,
      metrics,
      leakage_detected: leakage.has_leakage,
      leakage_reasons: leakageReasons,
      inconsistencies,
      revision_suggestions: revisionSuggestions
    };
  }

  /**
   * Applies bounded automatic repairs for minor defects (e.g. shuffling option order to avoid position bias,
   * cleaning leaked test cases from public object, ensuring canonical answer format).
   */
  static repairExercise(
    exercise: Exercise,
    answerKey: ExerciseAnswerKey
  ): { exercise: Exercise; answerKey: ExerciseAnswerKey } {
    let repairedEx = { ...exercise };
    const repairedKey = { ...answerKey };

    // 1. Sanitize all private evaluator fields from public exercise object
    repairedEx = LeakageGuard.sanitizePublicExercise(repairedEx);

    // 2. MCQ option order randomization to prevent option A position bias
    if (repairedEx.format === 'mcq' && repairedEx.options && repairedEx.options.length >= 3) {
      const canonical = (repairedKey.canonical_answer || '').trim().toLowerCase();
      // If canonical is option 0, shuffle
      if (repairedEx.options[0].trim().toLowerCase() === canonical) {
        const shuffled = [...repairedEx.options].sort(() => Math.random() - 0.5);
        repairedEx.options = shuffled;
        repairedEx.mcq_options = shuffled;
        const newIdx = shuffled.findIndex(
          (o) => o.trim().toLowerCase() === canonical
        );
        repairedKey.correct_option_index = newIdx >= 0 ? newIdx : 0;
        repairedKey.correct_option_id = newIdx >= 0 ? String.fromCharCode(65 + newIdx) : 'A';
      }
    }

    repairedEx.quality_status = 'REVISED';
    return { exercise: repairedEx, answerKey: repairedKey };
  }
}
