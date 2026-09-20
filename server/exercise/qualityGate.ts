import {
  Exercise,
  ExerciseAnswerKey
} from '../models/contracts';
import {
  ExerciseBlueprint,
  QuestionQualityMetric,
  QuestionQualityResult
} from './types';

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

    // 3. MCQ Single-Correct and Distractor Quality Validation
    const format = String(exercise.format || exercise.question_format || '').toLowerCase();
    if (format === 'mcq') {
      const options = exercise.options || exercise.mcq_options || [];
      const optionCount = options.length;

      // Check option count
      const validCount = optionCount >= 3 && optionCount <= 6;
      metrics.push({
        name: 'mcq_option_count',
        passed: validCount,
        score: validCount ? 1.0 : 0.0,
        detail: `Found ${optionCount} options (required 3-6)`
      });

      // Check option uniqueness
      const uniqueOptions = new Set(options.map((o) => o.trim().toLowerCase()));
      const allUnique = uniqueOptions.size === optionCount;
      metrics.push({
        name: 'mcq_option_uniqueness',
        passed: allUnique,
        score: allUnique ? 1.0 : 0.0,
        detail: allUnique ? 'All options unique' : 'Duplicate options detected'
      });
      if (!allUnique) {
        inconsistencies.push('MCQ contains duplicate options.');
        revisionSuggestions.push('Ensure each option is distinct.');
      }

      // Check that expected answer is present in options
      const expectedAns =
        answerKey.canonical_answer ||
        answerKey.correct_option_id ||
        exercise.expected_answer ||
        '';

      const normExpected = expectedAns.trim().toLowerCase();
      const matchInOptions = options.some((opt) => {
        const normOpt = opt.trim().toLowerCase();
        return normOpt === normExpected || normOpt.includes(normExpected) || normExpected.includes(normOpt);
      });

      metrics.push({
        name: 'mcq_single_correctness',
        passed: matchInOptions && expectedAns.length > 0,
        score: matchInOptions ? 1.0 : 0.0,
        detail: matchInOptions
          ? 'Canonical answer exists unambiguously in option set'
          : 'Answer key is missing or not found in options'
      });
      if (!matchInOptions) {
        inconsistencies.push('Answer key does not match any provided option.');
        revisionSuggestions.push('Align canonical_answer with one exact option.');
      }
    }

    // 4. Fill-In-Blank Validation
    if (format === 'fill_in_blank') {
      const hasAccepted = answerKey.accepted_answers && answerKey.accepted_answers.length > 0;
      metrics.push({
        name: 'fill_in_accepted_answers',
        passed: hasAccepted,
        score: hasAccepted ? 1.0 : 0.0,
        detail: hasAccepted
          ? `Found ${answerKey.accepted_answers.length} accepted answer variants`
          : 'Missing accepted answer list'
      });
      if (!hasAccepted) {
        inconsistencies.push('Fill-in-blank exercise has no accepted answers in answer key.');
      }
    }

    // 5. Writing / Free-Response Rubric Completeness
    if (format === 'free_text' || format === 'writing' || format === 'short_answer') {
      const criteriaCount = answerKey.rubric?.criteria?.length || 0;
      const hasEvidence = (answerKey.required_evidence?.length || 0) > 0;
      const validRubric = criteriaCount >= 1 || hasEvidence;

      metrics.push({
        name: 'rubric_completeness',
        passed: validRubric,
        score: validRubric ? 1.0 : 0.5,
        detail: `Rubric has ${criteriaCount} criteria and ${answerKey.required_evidence?.length || 0} evidence keys`
      });
      if (!validRubric) {
        inconsistencies.push('Writing exercise missing structured rubric criteria.');
      }
    }

    // 6. Coding Exercise Validation
    if (format === 'coding' || format === 'coding_problem') {
      const hasStarter = Boolean(exercise.starter_code || exercise.code_starter);
      const hasPrivateTests = (answerKey.private_test_cases?.length || 0) >= 2;

      metrics.push({
        name: 'coding_test_coverage',
        passed: hasPrivateTests,
        score: hasPrivateTests ? 1.0 : 0.4,
        detail: `Found ${answerKey.private_test_cases?.length || 0} private test cases`
      });
      if (!hasPrivateTests) {
        inconsistencies.push('Coding exercise lacks sufficient private test coverage.');
      }
    }

    // 7. Answer Leakage Scan
    const canonical = (answerKey.canonical_answer || exercise.expected_answer || '').trim().toLowerCase();
    let leakageDetected = false;

    if (canonical.length > 4) {
      // Check if full canonical answer appears verbatim in the question stem
      if (promptText.includes(canonical)) {
        leakageDetected = true;
        leakageReasons.push(`Question prompt verbatim contains canonical answer '${canonical}'.`);
      }

      // Check if starter code contains the solved canonical answer
      const starter = (exercise.starter_code || exercise.code_starter || '').toLowerCase();
      if (starter && starter.includes(canonical)) {
        leakageDetected = true;
        leakageReasons.push('Starter code contains the canonical solution.');
      }
    }

    // Check if private test cases or reference solution leaked into public exercise
    if (exercise.test_cases && exercise.test_cases.length > 0) {
      // Legacy check: if test_cases with 'expected' are placed in public exercise
      const leakedExpected = exercise.test_cases.some((tc) => Boolean(tc.expected));
      if (leakedExpected) {
        leakageDetected = true;
        leakageReasons.push('Public exercise payload contains test case expected values.');
      }
    }

    metrics.push({
      name: 'answer_leakage_protection',
      passed: !leakageDetected,
      score: leakageDetected ? 0.0 : 1.0,
      detail: leakageDetected ? 'Answer leakage detected' : 'No answer leakage detected'
    });

    // 8. Question Freshness & Anti-Memorization
    const promptSignature = promptText.replace(/\s+/g, ' ').trim();
    const isDuplicate = previousSignatures.some((sig) => {
      if (sig === promptSignature) return true;
      // High character similarity
      if (Math.abs(sig.length - promptSignature.length) < 10 && sig.slice(0, 40) === promptSignature.slice(0, 40)) {
        return true;
      }
      return false;
    });

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
    const allPassed = metrics.every((m) => m.passed) && !leakageDetected && inconsistencies.length === 0;
    const canRevise = inconsistencies.length <= 2 && !leakageDetected;

    const status: 'PASS' | 'REVISE' | 'FAIL' = allPassed
      ? 'PASS'
      : canRevise
      ? 'REVISE'
      : 'FAIL';

    return {
      status,
      metrics,
      leakage_detected: leakageDetected,
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
    const repairedEx = { ...exercise };
    const repairedKey = { ...answerKey };

    // 1. Clean leaked test cases from public exercise
    if (repairedEx.test_cases) {
      // Move to private if private is empty
      if (!repairedKey.private_test_cases || repairedKey.private_test_cases.length === 0) {
        repairedKey.private_test_cases = repairedEx.test_cases.map((tc) => ({
          name: tc.name,
          input: tc.input,
          expected: tc.expected
        }));
      }
      delete repairedEx.test_cases;
    }

    // 2. MCQ option order randomization to prevent option A position bias
    if (repairedEx.format === 'mcq' && repairedEx.options && repairedEx.options.length >= 3) {
      const canonical = repairedKey.canonical_answer || repairedEx.expected_answer || '';
      // If canonical is option 0, shuffle
      if (repairedEx.options[0].trim().toLowerCase() === canonical.trim().toLowerCase()) {
        const shuffled = [...repairedEx.options].sort(() => Math.random() - 0.5);
        repairedEx.options = shuffled;
        repairedEx.mcq_options = shuffled;
        const newIdx = shuffled.findIndex(
          (o) => o.trim().toLowerCase() === canonical.trim().toLowerCase()
        );
        repairedKey.correct_option_index = newIdx >= 0 ? newIdx : 0;
        repairedKey.correct_option_id = newIdx >= 0 ? String.fromCharCode(65 + newIdx) : 'A';
      }
    }

    repairedEx.quality_status = 'REVISED';
    return { exercise: repairedEx, answerKey: repairedKey };
  }
}
