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
import { ExerciseFixtureRegistry } from '../exercise/exerciseFixtures';

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
    if (outcome.exercise.test_cases) {
      delete outcome.exercise.test_cases;
    }

    return outcome;
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

    // Populate legacy backward-compatibility expected_answer in internal memory if caller expects it
    const exercise = outcome.exercise;
    if (outcome.answer_key.canonical_answer) {
      exercise.expected_answer = outcome.answer_key.canonical_answer;
    }

    return exercise;
  }
}

export const exerciseAgent = new ExerciseAgent();
