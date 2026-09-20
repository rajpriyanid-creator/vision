import { generateWithGemini } from '../gemini';
import {
  Exercise,
  ExerciseAnswerKey
} from '../models/contracts';
import {
  ExerciseInputContext,
  ExerciseBlueprint,
  ExerciseGenerationOutcome,
  QuestionQualityResult
} from './types';
import { ExerciseQualityGate } from './qualityGate';
import { ExerciseFixtureRegistry } from './exerciseFixtures';

export class QuestionGenerator {
  /**
   * Generates a grounded, domain-agnostic assessment and private answer key.
   */
  static async generate(
    context: ExerciseInputContext,
    blueprint: ExerciseBlueprint
  ): Promise<ExerciseGenerationOutcome> {
    const startTime = Date.now();
    const exerciseId = `ex_${context.active_concept}_${Date.now()}`;

    const prompt = this.buildPrompt(context, blueprint, exerciseId);

    let rawAiResponse: string | null = null;
    let exercise: Exercise | null = null;
    let answerKey: ExerciseAnswerKey | null = null;
    let qualityResult: QuestionQualityResult | null = null;
    let generationMode: 'LIVE' | 'REPLAY' | 'SAFE_FALLBACK' = 'LIVE';

    try {
      rawAiResponse = await generateWithGemini(prompt);
      if (rawAiResponse) {
        const parsed = this.parseResponse(rawAiResponse, exerciseId, context, blueprint);
        if (parsed) {
          exercise = parsed.exercise;
          answerKey = parsed.answerKey;

          // Run Quality Gate
          qualityResult = ExerciseQualityGate.evaluate(
            exercise,
            answerKey,
            blueprint,
            context.previous_question_signatures || []
          );

          // If Quality Gate flagged REVISE (e.g. slight leakage or option mismatch), attempt ONE bounded repair
          if (qualityResult.status === 'REVISE') {
            const revisionPrompt = `You are the EXERCISE QUALITY GATE for VISION.
The previous assessment had minor quality issues:
${qualityResult.inconsistencies.concat(qualityResult.leakage_reasons).join('\n')}

Fix these issues and regenerate strictly conforming JSON for concept "${context.concept_title}".
Ensure:
1. No answer leakage in prompt or starter code.
2. MCQ has 4 unique options with single matching canonical answer.
3. Writing or Coding includes complete private rubric/test cases.

Output strictly valid JSON:
{
  "exercise": { ... },
  "answer_key": { ... }
}`;

            const revisionRes = await generateWithGemini(revisionPrompt);
            if (revisionRes) {
              const revisedParsed = this.parseResponse(revisionRes, exerciseId, context, blueprint);
              if (revisedParsed) {
                exercise = revisedParsed.exercise;
                answerKey = revisedParsed.answerKey;
                qualityResult = ExerciseQualityGate.evaluate(
                  exercise,
                  answerKey,
                  blueprint,
                  context.previous_question_signatures || []
                );
                exercise.quality_status = 'REVISED';
              }
            }
          }

          // If still minor issues, apply deterministic repairs (e.g. shuffling MCQ, stripping leaked fields)
          if (exercise && answerKey) {
            const repaired = ExerciseQualityGate.repairExercise(exercise, answerKey);
            exercise = repaired.exercise;
            answerKey = repaired.answerKey;
          }
        }
      }
    } catch (err) {
      console.warn('Live exercise generation failed, falling back to safe fixture generator:', err);
    }

    // If live generation failed or was rejected by Quality Gate, use safe vetted generator
    if (!exercise || !answerKey) {
      generationMode = 'SAFE_FALLBACK';
      const fixtureItem =
        ExerciseFixtureRegistry.findFixture(context.active_concept, context.phase_intent, blueprint.format) ||
        ExerciseFixtureRegistry.getFallbackFixture(
          context.concept_title,
          context.subject,
          context.phase_intent,
          blueprint.difficulty_band
        );

      exercise = {
        ...fixtureItem.exercise,
        exercise_id: exerciseId,
        concept_id: context.active_concept,
        concept_title: context.concept_title,
        generation_mode: 'SAFE_FALLBACK',
        quality_status: 'SAFE_FALLBACK'
      };

      answerKey = {
        ...fixtureItem.answer_key,
        exercise_id: exerciseId,
        concept_id: context.active_concept
      };

      qualityResult = ExerciseQualityGate.evaluate(exercise, answerKey, blueprint, []);
    }

    return {
      exercise,
      answer_key: answerKey,
      blueprint,
      quality_result: qualityResult || {
        status: 'PASS',
        metrics: [],
        leakage_detected: false,
        leakage_reasons: [],
        inconsistencies: []
      },
      generation_mode: generationMode,
      execution_time_ms: Date.now() - startTime
    };
  }

  private static buildPrompt(
    context: ExerciseInputContext,
    blueprint: ExerciseBlueprint,
    exerciseId: string
  ): string {
    return `You are the EXERCISE AGENT for the VISION adaptive study engine.
Generate an assessment for the concept: "${context.concept_title}" (${context.active_concept}) in "${context.subject}".

CONTEXT & METRICS:
- Phase Intent: "${context.phase_intent}" (Target Concept: "${context.target_concept}")
- Strategy: "${blueprint.strategy}"
- Format: "${blueprint.format}"
- Difficulty Band: "${blueprint.difficulty_band}"
- Cognitive Demand: "${blueprint.cognitive_demand}"
- Learning Goal: "${context.learning_goal || 'understand'}"
- Learner Level: "${context.learner_level || 'intermediate'}"
${context.tutor_handoff?.lesson_summary ? `- What Tutor Taught: "${context.tutor_handoff.lesson_summary}"` : ''}
${blueprint.target_misconception ? `- Address Misconception: "${blueprint.target_misconception}"` : ''}
${blueprint.isomorphic_to_previous ? '- NOTE: Must be ISOMORPHIC with different surface numbers/context to test genuine transfer.' : ''}

ASSESSMENT REQUIREMENTS:
1. Question must be domain-specific, fair, unambiguous, and directly test whether the learner can independently perform the objective.
2. DO NOT use generic AI clichés (e.g. "What is the primary architectural purpose of X?").
3. DO NOT leak the answer in the prompt, options, hints, or starter code.
4. Output separate "exercise" (public, learner-visible) and "answer_key" (evaluator-only, private).

Output STRICTLY JSON with this schema:
{
  "exercise": {
    "exercise_id": "${exerciseId}",
    "concept_id": "${context.active_concept}",
    "concept_title": "${context.concept_title}",
    "format": "${blueprint.format}",
    "prompt": "Clear, concept-specific problem statement or scenario",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "difficulty": "${blueprint.difficulty_band}",
    "cognitive_demand": "${blueprint.cognitive_demand}",
    "starter_code": "// Optional starter snippet or context",
    "public_examples": [
      { "input": "...", "output": "...", "explanation": "..." }
    ]
  },
  "answer_key": {
    "exercise_id": "${exerciseId}",
    "concept_id": "${context.active_concept}",
    "correct_option_id": "A",
    "canonical_answer": "Exact correct answer",
    "accepted_answers": ["Acceptable variant 1", "Acceptable variant 2"],
    "required_evidence": ["Evidence criterion 1", "Evidence criterion 2"],
    "rubric": {
      "rubric_type": "conceptual",
      "criteria": [
        { "id": "crit_1", "description": "Accurate application of invariant", "weight": 0.6, "required": true }
      ],
      "common_misconceptions": ["Known misconception pattern"]
    },
    "private_test_cases": [
      { "name": "Standard case", "input": "...", "expected": "..." }
    ],
    "reference_solution_metadata": {
      "approach": "Reasoning summary"
    },
    "evaluation_notes": ["Private note for evaluation agent"]
  }
}`;
  }

  private static parseResponse(
    aiRes: string,
    exerciseId: string,
    context: ExerciseInputContext,
    blueprint: ExerciseBlueprint
  ): { exercise: Exercise; answerKey: ExerciseAnswerKey } | null {
    try {
      const cleaned = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      if (parsed.exercise && parsed.answer_key) {
        const exData = parsed.exercise;
        const keyData = parsed.answer_key;

        const exercise: Exercise = {
          exercise_id: exerciseId,
          concept_id: context.active_concept,
          concept_title: context.concept_title,
          format: exData.format || blueprint.format,
          question_format: exData.format || blueprint.format,
          prompt: exData.prompt || exData.question_text || '',
          question_text: exData.prompt || exData.question_text || '',
          options: Array.isArray(exData.options) ? exData.options : exData.mcq_options || [],
          mcq_options: Array.isArray(exData.options) ? exData.options : exData.mcq_options || [],
          blank_template: exData.blank_template,
          difficulty: exData.difficulty || blueprint.difficulty_band,
          cognitive_demand: exData.cognitive_demand || blueprint.cognitive_demand,
          starter_code: exData.starter_code || exData.code_starter || '',
          code_starter: exData.starter_code || exData.code_starter || '',
          language: exData.language || 'javascript',
          public_examples: Array.isArray(exData.public_examples) ? exData.public_examples : [],
          phase_intent: context.phase_intent,
          generation_mode: 'LIVE',
          quality_status: 'PASS'
        };

        const answerKey: ExerciseAnswerKey = {
          exercise_id: exerciseId,
          concept_id: context.active_concept,
          correct_option_id: keyData.correct_option_id || 'A',
          correct_option_index: typeof keyData.correct_option_index === 'number' ? keyData.correct_option_index : 0,
          accepted_answers: Array.isArray(keyData.accepted_answers) ? keyData.accepted_answers : [keyData.canonical_answer || ''],
          canonical_answer: keyData.canonical_answer || '',
          required_evidence: Array.isArray(keyData.required_evidence) ? keyData.required_evidence : [],
          rubric: keyData.rubric || {
            rubric_type: 'conceptual',
            criteria: [{ id: 'invariants', description: 'Governing invariants hold', required: true }]
          },
          misconception_signals: Array.isArray(keyData.misconception_signals) ? keyData.misconception_signals : [],
          private_test_cases: Array.isArray(keyData.private_test_cases) ? keyData.private_test_cases : [],
          reference_solution_metadata: keyData.reference_solution_metadata || {},
          evaluation_notes: Array.isArray(keyData.evaluation_notes) ? keyData.evaluation_notes : []
        };

        return { exercise, answerKey };
      }
    } catch (err) {
      console.warn('Failed to parse AI exercise response:', err);
    }
    return null;
  }
}
