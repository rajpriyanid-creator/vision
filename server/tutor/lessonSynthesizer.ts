import {
  TeachingAction,
  LessonBlock,
  LearningObjective,
  WorkedExample,
  FadedExample,
  ConceptExample
} from '../models/contracts';
import { generateWithGemini } from '../gemini';
import { DynamicPromptBuilder } from './dynamicPromptBuilder';
import { DynamicFallbackGenerator } from './dynamicFallbackGenerator';
import { StrategySelector } from './strategySelector';
import { ObjectiveDecomposer } from './objectiveDecomposer';
import { GroundingValidator } from './groundingValidator';
import { HintLadder } from './hintLadder';
import { TutorContext } from './schemas';

export class LessonSynthesizer {
  /**
   * Synthesizes a structured, dynamically generated lesson based on:
   * 1. Course Context (Subject, Target Concept, Active Part)
   * 2. Learner's Prerequisite Knowledge & Skill Level
   * 3. Strict 3-part teaching format (Definition, 2-3 Examples, Python Pseudocode)
   */
  static async synthesize(context: TutorContext): Promise<TeachingAction> {
    const {
      subject,
      concept_title,
      concept_id,
      teaching_context,
      learner_level,
      learning_goal,
      evidence,
      misconception
    } = context;

    // 1. Evidence Verification & Grounding Cross-Check
    const crossCheck = GroundingValidator.crossCheck(concept_id, concept_title, subject, evidence);

    // 2. Strategy Selection
    const strategyDecision = StrategySelector.selectStrategy(context);

    // 3. Learning Objective Decomposition
    const objectives = ObjectiveDecomposer.decompose(context);

    // 4. Generate dynamic prompt
    const systemPrompt = DynamicPromptBuilder.buildPrompt(context);

    const isPrereq = teaching_context === 'PREREQUISITE_REPAIR';

    try {
      const aiText = await generateWithGemini(systemPrompt);

      if (aiText) {
        const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.definition || parsed.explanation) {
          const definition = parsed.definition || parsed.explanation;
          const rawExamples = Array.isArray(parsed.examples) && parsed.examples.length > 0
            ? parsed.examples
            : [];

          const examples: ConceptExample[] = rawExamples.map((ex: any, idx: number) => ({
            title: ex.title || `Example ${idx + 1}: ${concept_title} Application`,
            scenario: ex.scenario || `Walkthrough for ${concept_title}`,
            steps: Array.isArray(ex.steps)
              ? ex.steps.map((s: any, sIdx: number) => ({
                  step_number: s.step_number || sIdx + 1,
                  action: typeof s === 'string' ? s : s.action || `Action step ${sIdx + 1}`,
                  reason: s.reason || '',
                  state_transition: s.state_transition || ''
                }))
              : [{ step_number: 1, action: 'Execute baseline step', reason: 'Initial precondition' }],
            result: ex.result || 'Executed successfully in accordance with invariants.',
            visual_or_output: ex.visual_or_output || '',
            explanation: ex.explanation || ''
          }));

          const pseudocodePython = parsed.pseudocode_python || parsed.code_example || '';
          const keyTakeaways = Array.isArray(parsed.key_takeaways) && parsed.key_takeaways.length > 0
            ? parsed.key_takeaways
            : [
                `Core Invariant: ${concept_title} preserves structural guarantees.`,
                `Boundary Discipline: Preconditions and edge cases must be explicitly verified.`,
                `Deterministic Execution: State transitions unwind in predictable order.`
              ];

          // Build backward compatible full text
          const fullExplanation = `${definition}\n\n### Practical Examples\n${examples.map((ex, i) => `**${ex.title}**\n${ex.scenario}\n${ex.steps.map(s => `• Step ${s.step_number || i + 1}: ${s.action} ${s.reason ? `(${s.reason})` : ''}`).join('\n')}\n*Result:* ${ex.result}`).join('\n\n')}`;

          // Construct backward compatible LessonBlocks
          const blocks: LessonBlock[] = [
            {
              type: isPrereq ? 'CONTEXT_BRIDGE' : 'OBJECTIVE',
              title: isPrereq ? 'Prerequisite Remediation' : 'Learning Objective',
              content: isPrereq
                ? `Remediating foundation gap for **${concept_title}** before returning to the main concept.`
                : `Mastering the definition, operational examples, and Python implementation of **${concept_title}**.`
            },
            {
              type: 'DEFINITION',
              title: 'Concept Definition',
              content: definition
            },
            {
              type: 'WORKED_EXAMPLE',
              title: 'Step-by-Step Examples',
              content: examples.map(e => `**${e.title}**\n${e.scenario}\nResult: ${e.result}`).join('\n\n')
            },
            {
              type: 'CODE_TRACE',
              title: 'Python Pseudocode & Implementation',
              content: 'Python reference implementation:',
              code_snippet: pseudocodePython
            },
            {
              type: 'RECAP',
              title: 'Key Takeaways',
              content: keyTakeaways.join('\n• ')
            }
          ];

          // First worked example for legacy components
          const legacyWorkedExample: WorkedExample | undefined = examples.length > 0
            ? {
                problem: examples[0].scenario,
                goal: examples[0].title,
                steps: examples[0].steps.map((s, i) => ({
                  step_number: s.step_number || i + 1,
                  action: s.action,
                  reason: s.reason || 'Operational transformation'
                })),
                result: examples[0].result || 'Outcome verified.',
                why_this_works: examples[0].explanation || 'Adheres strictly to core invariants.'
              }
            : undefined;

          return {
            run_id: `tutor_${Date.now()}`,
            concept_id,
            concept_title,
            teaching_context,
            teaching_strategy: strategyDecision.primary_strategy,
            secondary_strategy: strategyDecision.secondary_strategy,
            teaching_mode: isPrereq ? 'targeted_repair' : 'structured_concept_mastery',
            support_level: strategyDecision.support_level,
            objective_summary: objectives.map(o => o.objective).join('; '),
            learning_objectives: objectives,
            lesson_blocks: blocks,
            definition,
            examples,
            pseudocode_python: pseudocodePython,
            pseudocode_language: 'python',
            worked_example: legacyWorkedExample,
            misconception_contrast: parsed.misconception_contrast || (misconception ? {
              correct_model: `Valid execution sequence for ${concept_title}.`,
              mistaken_model: misconception,
              why_mistake_looks_tempting: `Intuitive but misses boundary suspension rules.`,
              key_distinction: `Execution adheres strictly to domain invariants.`
            } : undefined),
            self_explanation_prompt: parsed.self_explanation_prompt || `In your own words, explain how ${concept_title} maintains execution guarantees.`,
            hint_ladder: HintLadder.generateLadder(context),
            review_recommendation: {
              needed: true,
              reason: `Newly introduced concept requires spaced retrieval practice after initial mastery.`,
              suggested_interval: '24 hours'
            },
            explanation: fullExplanation,
            explanation_text: fullExplanation,
            key_takeaways: keyTakeaways,
            code_example: pseudocodePython,
            pedagogy_rationale: parsed.pedagogy_rationale || strategyDecision.reason,
            evidence_ref: crossCheck.relevant ? evidence?.source_id : undefined,
            is_course_grounded: crossCheck.relevant,
            provenance_type: crossCheck.provenance as any,
            quality_status: 'verified',
            teaching_context_for_exercise: {
              taught_concepts: [concept_id],
              learning_objectives: objectives.map(o => o.objective),
              examples_used: [concept_title],
              misconceptions_addressed: misconception ? [misconception] : [],
              difficulty: learner_level === 'beginner' ? 'Foundational' : 'Intermediate',
              scaffold_level: strategyDecision.support_level,
              teaching_strategy: strategyDecision.primary_strategy
            }
          };
        }
      }
    } catch (err) {
      // Fallback below
    }

    // Dynamic Fallback
    return DynamicFallbackGenerator.generate(context);
  }
}
