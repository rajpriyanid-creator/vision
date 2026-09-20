import { TeachingStrategy } from '../models/contracts';
import { StrategySelectionResult, TutorContext } from './schemas';

export class StrategySelector {
  /**
   * Selects an evidence-based pedagogical strategy and support level
   * based on learner level, goal, misconception context, and demonstrated historical outcomes.
   */
  static selectStrategy(context: TutorContext): StrategySelectionResult {
    const {
      teaching_context,
      learner_level,
      learning_goal,
      misconception,
      learner_memory,
      attempt_count = 1,
      revision_depth = 0
    } = context;

    const failedModes = learner_memory?.failed_teaching_modes || [];
    const successfulModes = learner_memory?.successful_teaching_modes || [];

    const avoidStrategies: string[] = [...failedModes];

    // Determine support level
    let support_level: 'minimal' | 'low' | 'moderate' | 'high' = 'moderate';
    if (learner_level === 'beginner') {
      support_level = 'high';
    } else if (learner_level === 'expert') {
      support_level = 'minimal';
    } else if (learner_level === 'advanced') {
      support_level = 'low';
    } else {
      support_level = revision_depth > 1 ? 'high' : 'moderate';
    }

    let primary: TeachingStrategy = 'DIRECT_EXPLANATION';
    let secondary: string | undefined = undefined;
    let reason = '';

    // RULE 1: If repairing a prerequisite with a diagnosed misconception
    if (teaching_context === 'PREREQUISITE_REPAIR' || Boolean(misconception)) {
      if (!avoidStrategies.includes('MISCONCEPTION_REPAIR') && !avoidStrategies.includes('targeted_repair')) {
        primary = 'MISCONCEPTION_REPAIR';
        secondary = learner_level === 'beginner' ? 'WORKED_EXAMPLE' : 'CONTRASTIVE_EXPLANATION';
        reason = `Diagnosed cognitive gap requires misconception-contrast repair to isolate the flaw before retesting.`;
      } else {
        primary = 'CONTRASTIVE_EXPLANATION';
        secondary = 'STEPWISE_REASONING';
        reason = `Selected contrastive explanation as alternative repair pathway avoiding previously ineffective modes.`;
      }
      return { primary_strategy: primary, secondary_strategy: secondary, support_level, reason, avoid_strategies: avoidStrategies };
    }

    // RULE 2: Revision goal
    if (learning_goal === 'revision') {
      primary = 'RETRIEVAL_ELICITATION';
      secondary = 'CONTRASTIVE_EXPLANATION';
      support_level = 'low';
      reason = `Revision goal prioritizes active retrieval prompts and compressed contrast over passive lecture.`;
      return { primary_strategy: primary, secondary_strategy: secondary, support_level, reason, avoid_strategies: avoidStrategies };
    }

    // RULE 3: Interview goal
    if (learning_goal === 'interview') {
      primary = 'STEPWISE_REASONING';
      secondary = 'CONTRASTIVE_EXPLANATION';
      support_level = learner_level === 'beginner' ? 'moderate' : 'low';
      reason = `Interview preparation emphasizes verbalizing trade-offs, edge cases, and step-by-step invariant justification.`;
      return { primary_strategy: primary, secondary_strategy: secondary, support_level, reason, avoid_strategies: avoidStrategies };
    }

    // RULE 4: Exam goal
    if (learning_goal === 'exam') {
      primary = 'CONTRASTIVE_EXPLANATION';
      secondary = 'STEPWISE_REASONING';
      reason = `Exam preparation emphasizes distinguishing subtle edge cases, common traps, and time-efficient reasoning.`;
      return { primary_strategy: primary, secondary_strategy: secondary, support_level, reason, avoid_strategies: avoidStrategies };
    }

    // RULE 5: Practice goal
    if (learning_goal === 'practice') {
      if (learner_level === 'beginner') {
        primary = 'WORKED_EXAMPLE';
        secondary = 'FADED_WORKED_EXAMPLE';
      } else {
        primary = 'FADED_WORKED_EXAMPLE';
        secondary = 'STEPWISE_REASONING';
      }
      reason = `Practice-first pathway emphasizes progressive scaffolding from modeled steps to independent execution.`;
      return { primary_strategy: primary, secondary_strategy: secondary, support_level, reason, avoid_strategies: avoidStrategies };
    }

    // RULE 6: Deep dive goal
    if (learning_goal === 'deep_dive' || learner_level === 'expert') {
      primary = 'STEPWISE_REASONING';
      secondary = 'VISUAL_MENTAL_MODEL';
      support_level = 'minimal';
      reason = `Deep-dive exploration focuses on internal mechanics, invariant boundary conditions, and architectural trade-offs.`;
      return { primary_strategy: primary, secondary_strategy: secondary, support_level, reason, avoid_strategies: avoidStrategies };
    }

    // RULE 7: Beginner level default (Understand goal)
    if (learner_level === 'beginner') {
      if (!avoidStrategies.includes('ANALOGICAL_BRIDGE') && !avoidStrategies.includes('grounded_analogy')) {
        primary = 'ANALOGICAL_BRIDGE';
        secondary = 'WORKED_EXAMPLE';
        reason = `Beginner learner benefits from an intuitive analogical bridge anchored to concrete physical intuition.`;
      } else {
        primary = 'WORKED_EXAMPLE';
        secondary = 'DIRECT_EXPLANATION';
        reason = `Selected structured worked example as beginner-friendly pathway avoiding previously failed analogy mode.`;
      }
      return { primary_strategy: primary, secondary_strategy: secondary, support_level: 'high', reason, avoid_strategies: avoidStrategies };
    }

    // RULE 8: Advanced level default
    if (learner_level === 'advanced') {
      primary = 'STEPWISE_REASONING';
      secondary = 'CODE_TRACE';
      reason = `Advanced learner benefits from formal state-trace invariants and edge-case handling.`;
      return { primary_strategy: primary, secondary_strategy: secondary, support_level: 'low', reason, avoid_strategies: avoidStrategies };
    }

    // Default Intermediate / Understand
    if (successfulModes.includes('code_walkthrough') && !avoidStrategies.includes('CODE_TRACE')) {
      primary = 'CODE_TRACE';
      secondary = 'DIRECT_EXPLANATION';
      reason = `Utilizing code-trace strategy aligned with learner's demonstrated historical success.`;
    } else {
      primary = 'DIRECT_EXPLANATION';
      secondary = 'WORKED_EXAMPLE';
      reason = `Intermediate learner receives clear first-principles mechanism explanation paired with an illustrative example.`;
    }

    return {
      primary_strategy: primary,
      secondary_strategy: secondary,
      support_level,
      reason,
      avoid_strategies: avoidStrategies
    };
  }
}
