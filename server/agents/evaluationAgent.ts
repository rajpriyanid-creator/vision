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

    const format = String(exercise.format || exercise.question_format || 'mcq').toLowerCase();

    // =========================================================================
    // 1. CODING SUBMISSION EVALUATION (Server-Side Sandbox)
    // =========================================================================
    if (format === 'coding' || format === 'coding_problem') {
      const code = String(code_submission || student_answer || '').trim();
      const privateTests = answer_key?.private_test_cases || [];

      if (!code) {
        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: 'unresolved',
          score: 0,
          reasoning_summary: 'No code submission received.',
          evidence_found: [],
          missing_evidence: ['Valid executable function implementation'],
          misconceptions: ['Empty solution'],
          next_recommendation: 'Provide an implementation adhering to the starter template.'
        };
      }

      // Execute in sandbox ignoring client-provided test results
      const execResult = await CodeSandbox.evaluateUntrustedCode(
        code,
        privateTests,
        exercise.language || 'javascript'
      );

      if (execResult.passed) {
        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: 'demonstrated',
          score: 100,
          reasoning_summary: `Solution passed all ${execResult.total_tests} private test cases and satisfied algorithmic invariants.`,
          evidence_found: [
            `Verified ${execResult.passed_tests}/${execResult.total_tests} private test cases in sandbox execution`
          ],
          missing_evidence: [],
          misconceptions: [],
          next_recommendation: 'Advance to next concept milestone.',
          code_execution_result: {
            passed: true,
            stdout: execResult.stdout,
            stderr: execResult.stderr,
            exit_code: execResult.exit_code,
            timeout: execResult.timeout
          }
        };
      } else {
        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: 'unresolved',
          score: Math.round(
            (execResult.passed_tests / Math.max(execResult.total_tests, 1)) * 100
          ),
          reasoning_summary: `Code failed ${execResult.total_tests - execResult.passed_tests} test cases. ${execResult.stderr || 'Did not meet all assertions.'}`,
          evidence_found:
            execResult.passed_tests > 0
              ? [`Passed ${execResult.passed_tests} baseline test cases`]
              : [],
          missing_evidence: ['Complete edge case coverage', 'Invariant preservation'],
          misconceptions: ['Algorithmic constraint violation or boundary failure'],
          next_recommendation: 'Diagnose prerequisite gap or algorithmic invariant misconception.',
          code_execution_result: {
            passed: false,
            stdout: execResult.stdout,
            stderr: execResult.stderr,
            exit_code: execResult.exit_code,
            timeout: execResult.timeout
          }
        };
      }
    }

    // =========================================================================
    // 2. MCQ EXACT OPTION EVALUATION (Deterministic server-side check)
    // =========================================================================
    if (format === 'mcq') {
      const cleanExpected = canonicalExpected.trim().toLowerCase();
      const cleanAnswer = answer.toLowerCase();

      // Check if student selected exact option ID (e.g. 'A', 'B', 'C') or exact text
      const isOptionLetterMatch =
        Boolean(answer_key?.correct_option_id) &&
        (cleanAnswer === answer_key!.correct_option_id!.toLowerCase() ||
          cleanAnswer.startsWith(`${answer_key!.correct_option_id!.toLowerCase()}.`) ||
          cleanAnswer.startsWith(`${answer_key!.correct_option_id!.toLowerCase()})`) ||
          cleanAnswer.startsWith(`${answer_key!.correct_option_id!.toLowerCase()} -`));

      const isTextMatch =
        cleanExpected.length > 0 &&
        (cleanAnswer === cleanExpected ||
          (cleanExpected.length > 3 && cleanAnswer.includes(cleanExpected)) ||
          (cleanAnswer.length > 3 && cleanExpected.includes(cleanAnswer)));

      const isExactMatch = isOptionLetterMatch || isTextMatch;

      if (isExactMatch) {
        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: 'demonstrated',
          score: 100,
          reasoning_summary: `Student selected the correct answer. Demonstrates adherence to core invariants.`,
          evidence_found: [answer],
          missing_evidence: [],
          misconceptions: [],
          next_recommendation: 'Advance to next learning phase.',
          rubric_ref: rubric?.concept_id
        };
      }

      // Check if answer is explicitly a hesitation / incomplete note (only when typed, not standard option selection)
      const isHesitation =
        !selected_option &&
        (cleanAnswer.includes('maybe') ||
          cleanAnswer.includes('not sure') ||
          cleanAnswer.includes('idk') ||
          cleanAnswer === '?');

      if (isHesitation) {
        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: 'uncertain',
          score: 40,
          reasoning_summary: `Student expressed hesitation ('${answer}'). Disambiguation probe recommended.`,
          evidence_found: [],
          missing_evidence: ['Definitive selection of concept invariant'],
          misconceptions: [],
          next_recommendation: 'Serve tie-breaker question or diagnostic quiz.',
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
        missing_evidence: [canonicalExpected || 'Correct option selection'],
        misconceptions: [identifiedMisconception],
        next_recommendation: 'Trigger Diagnostic Agent to isolate root-cause prerequisite failure.',
        rubric_ref: rubric?.concept_id
      };
    }

    // =========================================================================
    // 3. FILL-IN-THE-BLANK EVALUATION
    // =========================================================================
    if (format === 'fill_in_blank') {
      const acceptedAnswers =
        answer_key?.accepted_answers || (canonicalExpected ? [canonicalExpected] : []);
      const cleanAnswer = answer.trim().toLowerCase();

      const isAccepted = acceptedAnswers.some((acc) => {
        const cleanAcc = acc.trim().toLowerCase();
        return cleanAnswer === cleanAcc || (cleanAcc.length > 3 && cleanAnswer.includes(cleanAcc));
      });

      if (isAccepted) {
        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: 'demonstrated',
          score: 100,
          reasoning_summary: `Student provided accepted response '${answer}'.`,
          evidence_found: [answer],
          missing_evidence: [],
          misconceptions: [],
          next_recommendation: 'Advance to next phase.'
        };
      } else {
        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: 'unresolved',
          score: 25,
          reasoning_summary: `Input '${answer}' did not match required concept terms.`,
          evidence_found: [],
          missing_evidence: acceptedAnswers.slice(0, 2),
          misconceptions: ['Missing key terminology invariant'],
          next_recommendation: 'Trigger Diagnostic Agent.'
        };
      }
    }

    // =========================================================================
    // 4. FREE TEXT / CODE TRACE / WRITTEN EXPLANATION EVALUATION
    // =========================================================================
    const questionRubric = answer_key?.rubric || {
      rubric_type: 'conceptual',
      criteria: rubric
        ? rubric.core_principles.map((p, i) => ({ id: `p_${i}`, description: p, required: true }))
        : []
    };

    const requiredEvidence = answer_key?.required_evidence || (canonicalExpected ? [canonicalExpected] : []);

    // Try AI model semantic evaluation if available
    const prompt = `You are the EVALUATION AGENT for the VISION adaptive learning system.
Evaluate the student's answer against the question rubric and private criteria.

Concept: "${exercise.concept_title}" (${exercise.concept_id})
Question: "${exercise.prompt}"
Private Criteria / Expected Evidence: ${JSON.stringify(requiredEvidence)}
Question Rubric: ${JSON.stringify(questionRubric)}
Student Answer: "${answer}"

CRITICAL RULES:
1. Status must be: "demonstrated", "unresolved", or "uncertain".
2. Assign "demonstrated" ONLY if the core required evidence is present and conceptually correct.
3. Assign "uncertain" ONLY if student is clearly ambivalent or expresses incomplete hesitation.
4. Assign "unresolved" if key evidence is missing or misconceptions are asserted.
5. DO NOT reveal hidden answer keys in reasoning summary.

Output strictly JSON:
{
  "status": "demonstrated" | "unresolved" | "uncertain",
  "score": 85,
  "reasoning_summary": "Objective evaluation reasoning",
  "evidence_found": ["Observed evidence 1"],
  "missing_evidence": ["Missing evidence 1"],
  "misconceptions": []
}`;

    try {
      const aiRes = await generateWithGemini(prompt);
      if (aiRes) {
        const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        const parsedStatus = parsed.status === 'demonstrated' ? 'demonstrated' : parsed.status === 'uncertain' ? 'uncertain' : 'unresolved';

        return {
          evaluation_id: evaluationId,
          exercise_id: exercise.exercise_id,
          concept_id: exercise.concept_id,
          status: parsedStatus as EvaluationStatus,
          score: typeof parsed.score === 'number' ? Math.min(Math.max(parsed.score, 0), 100) : (parsedStatus === 'demonstrated' ? 90 : 30),
          reasoning_summary: parsed.reasoning_summary || 'Evaluated against cognitive rubric.',
          evidence_found: Array.isArray(parsed.evidence_found) ? parsed.evidence_found : [],
          missing_evidence: Array.isArray(parsed.missing_evidence) ? parsed.missing_evidence : [],
          misconceptions: Array.isArray(parsed.misconceptions) ? parsed.misconceptions : [],
          next_recommendation: parsedStatus === 'demonstrated' ? 'Proceed' : 'Remediate prerequisite gap',
          rubric_ref: rubric?.concept_id
        };
      }
    } catch (err) {
      console.warn('AI evaluation call failed. Executing deterministic rubric fallback.');
    }

    // =========================================================================
    // 5. DETERMINISTIC OFFLINE / FALLBACK EVALUATION (Honest, Strict, No False Positives)
    // =========================================================================
    if (!answer || answer.length < 2) {
      return {
        evaluation_id: evaluationId,
        exercise_id: exercise.exercise_id,
        concept_id: exercise.concept_id,
        status: 'unresolved',
        score: 0,
        reasoning_summary: 'No response provided.',
        evidence_found: [],
        missing_evidence: requiredEvidence.slice(0, 2),
        misconceptions: ['Omission of response'],
        next_recommendation: 'Trigger Diagnostic Agent'
      };
    }

    const cleanAnswer = answer.toLowerCase();
    const cleanExpected = canonicalExpected.toLowerCase();

    // Check direct match with canonical expected
    if (cleanExpected && (cleanAnswer === cleanExpected || (cleanExpected.length > 5 && cleanAnswer.includes(cleanExpected)))) {
      return {
        evaluation_id: evaluationId,
        exercise_id: exercise.exercise_id,
        concept_id: exercise.concept_id,
        status: 'demonstrated',
        score: 100,
        reasoning_summary: 'Student response directly satisfies canonical criteria.',
        evidence_found: [answer],
        missing_evidence: [],
        misconceptions: [],
        next_recommendation: 'Proceed to next milestone.'
      };
    }

    // Check keyword evidence requirements
    let evidenceMatches = 0;
    const found: string[] = [];
    const missing: string[] = [];

    for (const req of requiredEvidence) {
      const keywords = req
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(' ')
        .filter((w) => w.length > 3 && !['this', 'that', 'with', 'from', 'when', 'then'].includes(w));

      if (keywords.length === 0) continue;

      const hasKeywords = keywords.some((kw) => cleanAnswer.includes(kw));
      if (hasKeywords) {
        evidenceMatches++;
        found.push(req);
      } else {
        missing.push(req);
      }
    }

    // Require at least 60% of required evidence to be present
    const threshold = requiredEvidence.length > 0 ? Math.ceil(requiredEvidence.length * 0.6) : 1;
    const isDemonstrated = requiredEvidence.length > 0 && evidenceMatches >= threshold;

    if (isDemonstrated) {
      return {
        evaluation_id: evaluationId,
        exercise_id: exercise.exercise_id,
        concept_id: exercise.concept_id,
        status: 'demonstrated',
        score: 85,
        reasoning_summary: `Student response demonstrates understanding of required invariants (${evidenceMatches}/${requiredEvidence.length} criteria satisfied).`,
        evidence_found: found,
        missing_evidence: missing,
        misconceptions: [],
        next_recommendation: 'Proceed to next milestone.'
      };
    }

    // Honest unresolved failure (NEVER false positive demonstrated on fallback!)
    return {
      evaluation_id: evaluationId,
      exercise_id: exercise.exercise_id,
      concept_id: exercise.concept_id,
      status: 'unresolved',
      score: evidenceMatches > 0 ? 40 : 20,
      reasoning_summary: 'Student response omitted required conceptual invariants and evidence.',
      evidence_found: found,
      missing_evidence: missing.length > 0 ? missing : requiredEvidence.slice(0, 2),
      misconceptions: ['Incomplete invariant articulation'],
      next_recommendation: 'Trigger Diagnostic Agent to analyze prerequisite gap.'
    };
  }
}

export const evaluationAgent = new EvaluationAgent();
