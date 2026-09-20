/**
 * Assessment Planner.
 * Coordinates between context analysis, strategy selection, and blueprint preparation.
 */

import { ExerciseInputContext, ExerciseBlueprint } from './types';
import { StrategySelector } from './strategySelector';

export class AssessmentPlanner {
  /**
   * Plans the assessment blueprint based on learner context, tutor handoff, and pedagogical intent.
   */
  static plan(context: ExerciseInputContext): ExerciseBlueprint {
    return StrategySelector.selectBlueprint(context);
  }
}
