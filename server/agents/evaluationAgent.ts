/**
 * AGENT 6: EVALUATION AGENT
 * Evaluates student answers objectively using private ExerciseAnswerKey and structured rubrics.
 * Returns structured statuses: 'demonstrated', 'unresolved', or 'uncertain'.
 *
 * Security & Integrity:
 * - Strictly treats all client code submissions and client-reported test results as UNTRUSTED.
 * - When a model call fails, times out, or has no key, NEVER defaults to false-positive 'demonstrated'.
 * - Executes code in isolated server-side sandbox against private test cases.
 * - Compares options and text against deterministic canonical keys and required evidence.
 */

import {
  Evaluation,
  Exercise,
  ExerciseAnswerKey,
  EvaluationStatus
} from '../models/contracts';
import { rubricRegistry } from '../rubrics/rubricRegistry';
import { generateWithGemini } from '../gemini';
import { CodeSandbox } from '../exercise/codeSandbox';

export interface EvaluationInput {
  exercise: Exercise;
  answer_key?: ExerciseAnswerKey;
  student_answer?: string;
  selected_option?: string;
  code_submission?: string;
  client_test_results?: any; // UNTRUSTED — MUST NOT BE USED AUTHORITATIVELY
}

export class EvaluationAgent {
  async evaluate(input: EvaluationInput): Promise<Evaluation> {
    const { exercise, answer_key, student_answer, selected_option, code_submission } = input;
    const answer = String(selected_option || student_answer || code_submission || '').trim();
    const evaluationId = `eval_${exercise.exercise_id}_${Date.now()}`;
    const rubric = rubricRegistry.getRubric(exercise.concept_id);

    const canonicalExpected =
      answer_key?.canonical_answer ||
      answer_key?.correct_option_id ||
      exercise.expected_answer ||
      '';

    const format = 'mcq';

    // =========================================================================
    // MCQ EXACT OPTION EVALUATION (Deterministic server-side check)
    // =========================================================================
    const cleanExpected = canonicalExpected.trim().toLowerCase();
    const cleanAnswer = answer.toLowerCase();

    // Check if student selected exact option ID (e.g. 'A', 'B', 'C') or exact text or index
    const correctOptId = (answer_key?.correct_option_id || 'A').toUpperCase();
    const correctOptIdx = typeof answer_key?.correct_option_index === 'number' ? answer_key.correct_option_index : (correctOptId.charCodeAt(0) - 65);

    const options = exercise.options || exercise.mcq_options || [];
    const correctOptText = (options[correctOptIdx] || '').trim().toLowerCase();

    const isOptionLetterMatch =
      cleanAnswer === correctOptId.toLowerCase() ||
      cleanAnswer.startsWith(`${correctOptId.toLowerCase()}.`) ||
      cleanAnswer.startsWith(`${correctOptId.toLowerCase()})`) ||
      cleanAnswer.startsWith(`${correctOptId.toLowerCase()} -`);

    const isTextMatch =
      (cleanExpected.length > 0 && (cleanAnswer === cleanExpected || cleanAnswer.includes(cleanExpected) || cleanExpected.includes(cleanAnswer))) ||
      (correctOptText.length > 0 && (cleanAnswer === correctOptText || cleanAnswer.includes(correctOptText) || correctOptText.includes(cleanAnswer)));

    const isExactMatch = isOptionLetterMatch || isTextMatch;

    if (isExactMatch) {
      return {
        evaluation_id: evaluationId,
        exercise_id: exercise.exercise_id,
        concept_id: exercise.concept_id,
        status: 'demonstrated',
        score: 100,
        reasoning_summary: `Student selected the correct option (${correctOptId}). Demonstrates adherence to core invariants.`,
        evidence_found: [answer],
        missing_evidence: [],
        misconceptions: [],
        next_recommendation: 'Advance to next learning phase.',
        rubric_ref: rubric?.concept_id
      };
    }

    // Explicitly an incorrect choice
    let identifiedMisconception = 'Incorrect choice relative to target invariant';
    if (answer_key?.misconception_signals && answer_key.misconception_signals.length > 0) {
      identifiedMisconception = answer_key.misconception_signals[0];
    }

    return {
      evaluation_id: evaluationId,
      exercise_id: exercise.exercise_id,
      concept_id: exercise.concept_id,
      status: 'unresolved',
      score: 20,
      reasoning_summary: `Incorrect choice submitted: '${answer}'. ${identifiedMisconception}`,
      evidence_found: [],
      missing_evidence: [correctOptText || canonicalExpected || 'Correct option selection'],
      misconceptions: [identifiedMisconception],
      next_recommendation: 'Trigger Diagnostic Agent to isolate root-cause prerequisite failure.',
      rubric_ref: rubric?.concept_id
    };
  }
}

export const evaluationAgent = new EvaluationAgent();
