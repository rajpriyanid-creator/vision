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
import { generateWithGemini } from '../gemini';

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

  /**
   * Directly answers a student question about the concept being taught or practiced.
   */
  async answerQuestion(input: {
    question: string;
    concept_title: string;
    subject: string;
    learner_level?: string;
    learning_goal?: string;
  }): Promise<{ answer: string; key_takeaway: string }> {
    const prompt = `You are the VISION DYNAMIC TUTOR AGENT.
Subject: "${input.subject}"
Concept: "${input.concept_title}"
Learner Level: "${input.learner_level || 'intermediate'}"

The student asked this specific question:
"${input.question}"

Provide a clear, encouraging, pedagogically grounded response in 2-3 concise paragraphs with code or examples if relevant.
Output strictly valid JSON with no markdown formatting:
{
  "answer": "Clear explanation answering the student's question...",
  "key_takeaway": "Single-sentence core intuition to remember."
}`;

    const aiText = await generateWithGemini(prompt);
    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (parsed.answer) {
          return {
            answer: parsed.answer,
            key_takeaway: parsed.key_takeaway || 'Focus on fundamental invariant principles.'
          };
        }
      } catch {
        // Fallback below
      }
    }

    return {
      answer: `To address your question about ${input.concept_title}: Great question! In ${input.subject}, ${input.concept_title} relies on strictly maintaining structural invariants. Make sure to trace each state transition step-by-step.`,
      key_takeaway: `Always trace operations step-by-step on ${input.concept_title}.`
    };
  }
}

export const tutorAgent = new TutorAgent();
