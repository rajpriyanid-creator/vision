/**
 * AGENT 4: TUTOR AGENT (VISION Adaptive Multi-Agent Subsystem)
 * Delivers grounded, pedagogical instruction tailored to learner level, learning goal,
 * prior demonstrated strategy outcomes, verified course evidence, and diagnosed misconceptions.
 *
 * Full Internal Pipeline:
 * 1. Learner & Context Analysis
 * 2. Grounded Evidence Cross-Check & Provenance Verification
 * 3. Strategy Selection (Domain-Agnostic, Evidence-Based)
 * 4. Learning Objective Decomposition
 * 5. Lesson Sequence Blueprint Planning (Cognitive Load Bounds)
 * 6. Structured Content Generation (Worked Examples, Faded Examples, Hint Ladders)
 * 7. Pedagogical Self-Critic Quality Gate (Leakage Check, Overload Check, Alignment)
 * 8. Bounded Revision
 * 9. Exercise Context Alignment Handoff
 */

import { TeachingAction, GroundedEvidence, LearnerMemory } from '../models/contracts';
import { LessonSynthesizer } from '../tutor/lessonSynthesizer';
import { TutorContext } from '../tutor/schemas';

export interface TutorInput {
  teaching_context: 'INITIAL_TEACHING' | 'PREREQUISITE_REPAIR';
  concept_id: string;
  concept_title: string;
  subject: string;
  student_id?: string;
  course_id?: string;
  target_concept?: string;
  active_concept?: string;
  learner_level?: string;
  learning_goal?: string;
  evidence?: GroundedEvidence | null;
  misconception?: string;
  learner_memory?: LearnerMemory;
  recent_exercise_prompt?: string;
  hidden_expected_answer?: string;
}

export class TutorAgent {
  /**
   * Executes the full adaptive teaching pipeline.
   */
  async teach(input: TutorInput): Promise<TeachingAction> {
    const context: TutorContext = {
      student_id: input.student_id || 'student_default',
      course_id: input.course_id || 'course_default',
      subject: input.subject || 'Computer Science',
      target_concept: input.target_concept || input.concept_title,
      active_concept: input.concept_id,
      concept_title: input.concept_title,
      teaching_context: input.teaching_context,
      learner_level: input.learner_level || 'intermediate',
      learning_goal: input.learning_goal || 'understand',
      evidence: input.evidence,
      misconception: input.misconception,
      learner_memory: input.learner_memory,
      recent_exercise_prompt: input.recent_exercise_prompt,
      hidden_expected_answer: input.hidden_expected_answer
    };

    return await LessonSynthesizer.synthesize(context);
  }
}

export const tutorAgent = new TutorAgent();
