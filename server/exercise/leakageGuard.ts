/**
 * Anti-Leakage Guard.
 * Scans learner-visible exercise artifacts for answer leakage, private test leaks, or internal rubric exposure.
 */

import { Exercise, ExerciseAnswerKey } from '../models/contracts';

export interface LeakageCheckResult {
  has_leakage: boolean;
  reasons: string[];
}

export class LeakageGuard {
  static check(exercise: Exercise, answerKey: ExerciseAnswerKey): LeakageCheckResult {
    const reasons: string[] = [];
    const prompt = (exercise.prompt || exercise.question_text || '').toLowerCase();
    const starter = (exercise.starter_code || exercise.code_starter || '').toLowerCase();
    const canonical = (answerKey.canonical_answer || '').trim().toLowerCase();

    // 1. Check if canonical answer appears verbatim in the question prompt (for text/mcq)
    if (canonical.length > 3) {
      // Avoid false positive on simple keywords, but catch full solution strings
      const isShortWord = ['a', 'b', 'c', 'd', 'true', 'false', '0', '1'].includes(canonical);
      if (!isShortWord && prompt.includes(canonical)) {
        // Only flag if it's more than a common dictionary word
        if (canonical.length > 6 || canonical.includes(' ')) {
          reasons.push(`Prompt contains canonical answer verbatim: '${canonical}'.`);
        }
      }

      // Check if starter code contains the solved canonical answer
      if (starter && starter.includes(canonical) && !isShortWord) {
        reasons.push('Starter code contains the canonical solution implementation.');
      }
    }

    // 2. Check if private test cases with 'expected' values were placed in public exercise
    if (exercise.test_cases && exercise.test_cases.length > 0) {
      const leaksExpected = exercise.test_cases.some((tc) => Boolean(tc.expected));
      if (leaksExpected) {
        reasons.push('Public exercise object contains private test case expected outputs.');
      }
    }

    // 3. Check if public examples match private test cases exactly
    if (exercise.public_examples && answerKey.private_test_cases) {
      const publicInputs = new Set(
        exercise.public_examples.map((ex) => String(ex.input).trim().toLowerCase())
      );
      const leakedPrivateTest = answerKey.private_test_cases.some((pt) =>
        publicInputs.has(String(pt.input).trim().toLowerCase())
      );
      if (leakedPrivateTest) {
        reasons.push('Public example duplicates private grading test case.');
      }
    }

    // 4. Check if internal evaluation notes or hidden rubric leaked into prompt
    if (prompt.includes('internal evaluation') || prompt.includes('evaluator note') || prompt.includes('correct option is')) {
      reasons.push('Question prompt contains internal evaluator instructions or solution disclosure.');
    }

    return {
      has_leakage: reasons.length > 0,
      reasons
    };
  }

  /**
   * Cleans all private evaluator fields from the public Exercise object.
   */
  static sanitizePublicExercise(exercise: Exercise): Exercise {
    const clean = { ...exercise };

    // Delete legacy/private fields that must NEVER reach the student
    delete clean.test_cases;
    delete (clean as any).expected_answer;
    delete (clean as any).canonical_answer;
    delete (clean as any).correct_option;
    delete (clean as any).correct_option_id;
    delete (clean as any).correct_option_index;
    delete (clean as any).rubric;
    delete (clean as any).evaluation_notes;
    delete (clean as any).private_test_cases;

    return clean;
  }
}
