/**
 * AGENT 5: EXERCISE AGENT
 * Responsible for ASSESSMENT GENERATION.
 * Generates the smallest, fairest, information-rich assessment that reveals whether
 * the learner can independently perform the learning objective Tutor taught.
 *
 * Pipeline:
 * Rich Input Context
 *   ↓
 * Strategy & Difficulty Selector
 *   ↓
 * Assessment Blueprint
 *   ↓
 * Question & Answer-Key Generator
 *   ↓
 * Internal Solve & Consistency Check
 *   ↓
 * Leakage & Security Scan
 *   ↓
 * Bounded Revision (max 1)
 *   ↓
 * Public Exercise + Private AnswerKey
 */

import {
  Exercise,
  ExerciseAnswerKey,
  ExercisePhaseIntent
} from '../models/contracts';
import {
  ExerciseInputContext,
  ExerciseBlueprint,
  ExerciseGenerationOutcome
} from '../exercise/types';
import { StrategySelector } from '../exercise/strategySelector';
import { QuestionGenerator } from '../exercise/questionGenerator';
import { LeakageGuard } from '../exercise/leakageGuard';
import { generateWithGemini } from '../gemini';

export interface PrereqQuizQuestion {
  id: number;
  question: string;
  options: string[];
  correct_index: number;
  correct_answer: string;
  explanation: string;
}

export interface PrereqQuiz {
  concept: string;
  prerequisite: string;
  concept_title: string;
  questions: PrereqQuizQuestion[];
}

export class ExerciseAgent {
  /**
   * Generates both the public Exercise and the private Evaluator-Only Answer Key.
   */
  async generateAssessment(input: ExerciseInputContext): Promise<ExerciseGenerationOutcome> {
    const context: ExerciseInputContext = {
      ...input,
      concept_title: input.concept_title || input.active_concept,
      phase_intent: input.phase_intent || 'INITIAL_TARGET',
      learner_level: input.learner_level || 'intermediate',
      learning_goal: input.learning_goal || 'understand'
    };

    // 1. Blueprint selection
    const blueprint: ExerciseBlueprint = StrategySelector.selectBlueprint(context);

    // 2. Question and Answer Key Generation with Quality Gate & Leakage Scan
    const outcome: ExerciseGenerationOutcome = await QuestionGenerator.generate(context, blueprint);

    // Ensure hidden test cases or expected answer fields do not leak into the public exercise
    outcome.exercise = LeakageGuard.sanitizePublicExercise(outcome.exercise);

    return outcome;
  }

  /**
   * Generates a 2-question multiple choice diagnostic quiz for prerequisite verification.
   */
  async generatePrereqDiagnosticQuiz(
    prereqId: string,
    prereqTitle: string,
    subject: string
  ): Promise<PrereqQuiz> {
    const prompt = `You are the EXERCISE AGENT for VISION.
Subject: "${subject}"
Prerequisite Concept: "${prereqTitle}" (${prereqId})

Generate a 2-question multiple choice diagnostic quiz to assess whether a learner possesses the foundational knowledge for this prerequisite.
Ensure:
1. Questions are domain-specific and test essential invariants.
2. 4 unique options per question with 1 unambiguous correct answer.
3. No answer leakage in questions.

Output strictly valid JSON:
{
  "concept": "${prereqId}",
  "prerequisite": "${prereqId}",
  "concept_title": "${prereqTitle}",
  "questions": [
    {
      "id": 1,
      "question": "Question 1 text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "correct_answer": "Option A",
      "explanation": "Why this answer is correct"
    },
    {
      "id": 2,
      "question": "Question 2 text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 1,
      "correct_answer": "Option B",
      "explanation": "Why this answer is correct"
    }
  ]
}`;

    try {
      const aiText = await generateWithGemini(prompt);
      if (aiText) {
        const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed.questions) && parsed.questions.length >= 2) {
          return {
            concept: prereqId,
            prerequisite: prereqId,
            concept_title: prereqTitle,
            questions: parsed.questions
          };
        }
      }
    } catch (err) {
      console.warn('Live prereq quiz generation failed, using structured fallback:', err);
    }

    // High quality domain-agnostic fallback
    return {
      concept: prereqId,
      prerequisite: prereqId,
      concept_title: prereqTitle,
      questions: [
        {
          id: 1,
          question: `Which fundamental principle is essential for understanding ${prereqTitle}?`,
          options: [
            'Recognizing core boundary rules and governing invariants',
            'Memorizing variable labels without contextual rules',
            'Bypassing prerequisite validation criteria',
            'Assuming unhandled states produce zero downstream side-effects'
          ],
          correct_index: 0,
          correct_answer: 'Recognizing core boundary rules and governing invariants',
          explanation: `Comprehension of ${prereqTitle} requires understanding governing invariant conditions.`
        },
        {
          id: 2,
          question: `How does ${prereqTitle} support dependent higher-level concepts?`,
          options: [
            'It operates in total isolation with zero impact on dependent stages',
            'It establishes the structural guarantees that subsequent operations rely upon',
            'It replaces the need for algorithmic correctness checks',
            'It only applies to single-pass static execution environments'
          ],
          correct_index: 1,
          correct_answer: 'It establishes the structural guarantees that subsequent operations rely upon',
          explanation: 'Prerequisites maintain the underlying state guarantees necessary for downstream concepts.'
        }
      ]
    };
  }

  /**
   * Standard legacy and controller interface for generating an assessment Exercise.
   */
  async generateExercise(input: {
    concept_id: string;
    concept_title?: string;
    target_id?: string;
    subject?: string;
    phase_intent?: ExercisePhaseIntent | string;
    learner_level?: string;
    learning_goal?: string;
    tutor_handoff?: any;
    latest_diagnosis?: any;
    latest_evaluation?: any;
    previous_exercise_id?: string;
    previous_exercise_ids?: string[];
  }): Promise<Exercise> {
    const outcome = await this.generateAssessment({
      student_id: 'active_student',
      subject: input.subject || 'General Domain',
      target_concept: input.target_id || input.concept_id,
      active_concept: input.concept_id,
      concept_title: input.concept_title || input.concept_id,
      phase_intent: (input.phase_intent as ExercisePhaseIntent) || 'INITIAL_TARGET',
      learner_level: input.learner_level || 'intermediate',
      learning_goal: input.learning_goal || 'understand',
      tutor_handoff: input.tutor_handoff,
      latest_diagnosis: input.latest_diagnosis,
      latest_evaluation: input.latest_evaluation,
      previous_exercise_ids: input.previous_exercise_ids || (input.previous_exercise_id ? [input.previous_exercise_id] : [])
    });

    return outcome.exercise;
  }
}

export const exerciseAgent = new ExerciseAgent();
