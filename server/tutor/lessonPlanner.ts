import { LessonBlockType, LessonBlock } from '../models/contracts';
import { StrategySelectionResult, TutorContext } from './schemas';

export class LessonPlanner {
  /**
   * Plans the sequence of block types appropriate for the chosen strategy and learner profile.
   * Enforces cognitive load bounds (minimum useful sequence, no redundant bloat).
   */
  static planBlockSequence(
    context: TutorContext,
    strategy: StrategySelectionResult
  ): LessonBlockType[] {
    const { teaching_context, learner_level, learning_goal } = context;
    const strat = strategy.primary_strategy;

    if (teaching_context === 'PREREQUISITE_REPAIR') {
      return [
        'CONTEXT_BRIDGE',
        'MISCONCEPTION_WARNING',
        'CONTRASTIVE_EXAMPLE',
        'WORKED_EXAMPLE',
        'SELF_EXPLANATION',
        'RECAP'
      ];
    }

    if (learning_goal === 'revision') {
      return [
        'OBJECTIVE',
        'CORE_IDEA',
        'CONTRASTIVE_EXAMPLE',
        'SELF_EXPLANATION',
        'RECAP'
      ];
    }

    if (learning_goal === 'interview') {
      return [
        'CONTEXT_BRIDGE',
        'CORE_IDEA',
        'MECHANISM',
        'CODE_TRACE',
        'CONTRASTIVE_EXAMPLE',
        'TRANSFER',
        'RECAP'
      ];
    }

    if (learning_goal === 'exam') {
      return [
        'OBJECTIVE',
        'CORE_IDEA',
        'MECHANISM',
        'MISCONCEPTION_WARNING',
        'CONTRASTIVE_EXAMPLE',
        'RECAP'
      ];
    }

    if (learning_goal === 'practice' || strat === 'FADED_WORKED_EXAMPLE') {
      return [
        'OBJECTIVE',
        'CORE_IDEA',
        'WORKED_EXAMPLE',
        'PARTIALLY_WORKED_EXAMPLE',
        'SELF_EXPLANATION',
        'RECAP'
      ];
    }

    if (learner_level === 'beginner' || strat === 'ANALOGICAL_BRIDGE') {
      return [
        'CONTEXT_BRIDGE',
        'INTUITION',
        'CORE_IDEA',
        'WORKED_EXAMPLE',
        'SELF_EXPLANATION',
        'RECAP'
      ];
    }

    if (learner_level === 'expert' || learning_goal === 'deep_dive') {
      return [
        'OBJECTIVE',
        'MECHANISM',
        'CODE_TRACE',
        'CONTRASTIVE_EXAMPLE',
        'TRANSFER',
        'RECAP'
      ];
    }

    // Default Intermediate / Understand
    return [
      'CONTEXT_BRIDGE',
      'CORE_IDEA',
      'MECHANISM',
      'WORKED_EXAMPLE',
      'SELF_EXPLANATION',
      'RECAP'
    ];
  }
}
