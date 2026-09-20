/**
 * Independent Answer-Key Consistency Validator.
 * Verifies that the question prompt and private answer key mathematically/logically agree.
 */

import { Exercise, ExerciseAnswerKey } from '../models/contracts';
import { ExerciseBlueprint } from './types';

export interface ConsistencyValidationResult {
  is_consistent: boolean;
  issues: string[];
}

export class AnswerKeyValidator {
  static validate(
    exercise: Exercise,
    answerKey: ExerciseAnswerKey,
    blueprint: ExerciseBlueprint
  ): ConsistencyValidationResult {
    const issues: string[] = [];
    const format = String(exercise.format || exercise.question_format || 'mcq').toLowerCase();

    // 1. MCQ Single-Correct Consistency
    if (format === 'mcq') {
      const options = exercise.options || exercise.mcq_options || [];
      if (!Array.isArray(options) || options.length < 3) {
        issues.push(`MCQ requires at least 3 options, found ${options?.length || 0}.`);
      } else if (options.length > 6) {
        issues.push(`MCQ has too many options (${options.length}), maximum is 6.`);
      }

      // Check unique options
      const normalizedOpts = options.map((o) => o.trim().toLowerCase());
      const uniqueOpts = new Set(normalizedOpts);
      if (uniqueOpts.size !== options.length) {
        issues.push('MCQ contains duplicate options.');
      }

      // Check canonical answer match
      const canonical = (answerKey.canonical_answer || '').trim().toLowerCase();
      const correctId = (answerKey.correct_option_id || '').trim().toUpperCase();

      let matchedByCanonical = false;
      let matchedByCorrectId = false;

      options.forEach((opt, idx) => {
        const normOpt = opt.trim().toLowerCase();
        const letterId = String.fromCharCode(65 + idx);

        if (canonical) {
          if (
            normOpt === canonical ||
            normOpt === `${letterId.toLowerCase()}. ${canonical}` ||
            normOpt === `${letterId.toLowerCase()}) ${canonical}` ||
            normOpt.includes(canonical) ||
            canonical.includes(normOpt)
          ) {
            matchedByCanonical = true;
          }
        }

        if (correctId) {
          if (letterId === correctId || normOpt.startsWith(`${correctId.toLowerCase()}.`) || normOpt.startsWith(`${correctId.toLowerCase()})`)) {
            matchedByCorrectId = true;
          }
        }
      });

      if (canonical && !matchedByCanonical) {
        issues.push(`Canonical answer '${answerKey.canonical_answer}' does not match any provided MCQ option.`);
      }
      if (correctId && !matchedByCorrectId) {
        issues.push(`Correct option ID '${answerKey.correct_option_id}' is out of bounds for the provided options.`);
      }
    }

    // 2. Fill-in-the-Blank Consistency
    if (format === 'fill_in_blank') {
      const accepted = answerKey.accepted_answers || (answerKey.canonical_answer ? [answerKey.canonical_answer] : []);
      if (!accepted || accepted.length === 0 || accepted.every((a) => a.trim().length === 0)) {
        issues.push('Fill-in-the-blank exercise requires at least one non-empty accepted answer.');
      }
    }

    // 3. Short Answer / Writing Consistency
    if (format === 'free_text' || format === 'writing' || format === 'short_answer') {
      const criteriaCount = answerKey.rubric?.criteria?.length || 0;
      const evidenceCount = answerKey.required_evidence?.length || 0;
      if (criteriaCount === 0 && evidenceCount === 0 && !answerKey.canonical_answer) {
        issues.push('Writing exercise lacks structured rubric criteria and required evidence.');
      }
    }

    // 4. Coding Exercise Consistency
    if (format === 'coding' || format === 'coding_problem') {
      const privateTests = answerKey.private_test_cases || [];
      if (privateTests.length < 2) {
        issues.push(`Coding exercise requires at least 2 private test cases, found ${privateTests.length}.`);
      }
      const invalidTests = privateTests.some((tc) => !tc.input || !tc.expected);
      if (invalidTests) {
        issues.push('Coding private test cases must have non-empty input and expected output fields.');
      }
    }

    // 5. Code Trace Consistency
    if (format === 'code_trace') {
      if (!answerKey.canonical_answer && !answerKey.correct_option_id) {
        issues.push('Code trace exercise missing expected execution trace outcome.');
      }
    }

    return {
      is_consistent: issues.length === 0,
      issues
    };
  }
}
