import {
  TeachingAction,
  LessonBlock,
  LearningObjective,
  WorkedExample,
  FadedExample,
  MisconceptionContrast,
  HintLadderStep,
  ReviewRecommendation,
  ExerciseHandoffContext
} from '../models/contracts';
import { generateWithGemini } from '../gemini';
import { StrategySelector } from './strategySelector';
import { ObjectiveDecomposer } from './objectiveDecomposer';
import { LessonPlanner } from './lessonPlanner';
import { WorkedExampleGenerator } from './workedExampleGenerator';
import { HintLadder } from './hintLadder';
import { GroundingValidator } from './groundingValidator';
import { LessonCritic } from './lessonCritic';
import { TutorContext } from './schemas';

export class LessonSynthesizer {
  /**
   * Synthesizes a structured, highly adaptive, grounded lesson.
   * Employs the multi-step Tutor internal pipeline:
   * Analysis -> Strategy Selection -> Objective Decomposition -> Planning -> Generation -> Self-Critic -> Bounded Revision.
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
      misconception,
      hidden_expected_answer
    } = context;

    // 1. Evidence Verification & Grounding Cross-Check
    const crossCheck = GroundingValidator.crossCheck(concept_id, concept_title, subject, evidence);

    // 2. Strategy Selection
    const strategyDecision = StrategySelector.selectStrategy(context);

    // 3. Learning Objective Decomposition
    const objectives = ObjectiveDecomposer.decompose(context);

    // 4. Lesson Sequence Blueprint Planning
    const plannedBlockTypes = LessonPlanner.planBlockSequence(context, strategyDecision);

    // 5. Generate structured scaffolds
    const workedExample = WorkedExampleGenerator.generateWorkedExample(context);
    const fadedExample = WorkedExampleGenerator.generateFadedExample(context);
    const hintLadder = HintLadder.generateLadder(context);

    // 6. Build prompt for structured generation
    const isPrereq = teaching_context === 'PREREQUISITE_REPAIR';

    const systemPrompt = `You are the TUTOR AGENT for VISION, an adaptive cognitive study engine.
Deliver a rigorous, grounded, highly pedagogically tailored lesson for:
- Concept: "${concept_title}" (${concept_id}) in Subject: "${subject}"
- Teaching Context: ${teaching_context}
- Learner Level: ${learner_level}
- Learning Goal: ${learning_goal}
- Primary Strategy: ${strategyDecision.primary_strategy}
- Support Level: ${strategyDecision.support_level}
- Target Objectives: ${objectives.map(o => o.objective).join(' | ')}
${misconception ? `- Diagnosed Misconception to Unlearn: "${misconception}"` : ''}
${evidence && crossCheck.relevant ? `- Grounding Course Notes: "${evidence.excerpt}" [Source: ${evidence.source_id}]` : ''}

PEDAGOGICAL DIRECTIVES:
1. Ground all explanations strictly in verified domain invariants.
2. DO NOT reveal the question or exact answer of any upcoming quiz or exercise.
3. ${isPrereq ? 'Focus strictly on repairing the prerequisite without solving the downstream target.' : 'Establish the structural invariant and intuition before code syntax.'}
4. Tailor tone and depth to level (${learner_level}) and goal (${learning_goal}).
5. Structure output strictly as valid JSON matching this schema:

{
  "explanation": "2-3 paragraphs of clear pedagogical instruction matching the chosen strategy.",
  "key_takeaways": ["Concise point 1", "Concise point 2", "Concise point 3"],
  "code_example": "// Optional clean code snippet demonstrating the invariant",
  "self_explanation_prompt": "Targeted active-recall question prompting student to explain why or predict outcome",
  "retrieval_prompt": "Quick check for understanding",
  "transfer_prompt": "How this concept extends to wider applications",
  "misconception_contrast": {
    "correct_model": "Accurate conceptual understanding",
    "mistaken_model": "The tempting flawed mental model",
    "why_mistake_looks_tempting": "Why learners stumble here",
    "key_distinction": "The definitive rule that separates the two"
  },
  "pedagogy_rationale": "${strategyDecision.reason}"
}`;

    let candidateLesson: TeachingAction | null = null;
    const aiText = await generateWithGemini(systemPrompt);

    if (aiText) {
      try {
        const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.explanation) {
          const blocks: LessonBlock[] = [];

          // Synthesize structured blocks from planned types
          blocks.push({
            type: isPrereq ? 'CONTEXT_BRIDGE' : 'OBJECTIVE',
            title: isPrereq ? 'Prerequisite Remediation' : 'Learning Objective',
            content: isPrereq
              ? `Let's pause and isolate the underlying prerequisite: **${concept_title}** before returning to the main concept.`
              : `Master the core invariants, execution flow, and application boundaries of **${concept_title}**.`
          });

          blocks.push({
            type: 'CORE_IDEA',
            title: 'Core Conceptual Invariant',
            content: parsed.explanation
          });

          if (parsed.misconception_contrast || misconception) {
            blocks.push({
              type: 'CONTRASTIVE_EXAMPLE',
              title: 'Misconception Contrast',
              content: parsed.misconception_contrast
                ? `**Correct Model:** ${parsed.misconception_contrast.correct_model}\n**Common Trap:** ${parsed.misconception_contrast.mistaken_model}\n**Distinction:** ${parsed.misconception_contrast.key_distinction}`
                : `Ensure you distinguish between synchronous local execution and suspended recursive call frames.`
            });
          }

          if (parsed.code_example) {
            blocks.push({
              type: 'CODE_TRACE',
              title: 'Execution Trace & Invariants',
              content: 'Inspect how boundary conditions and call order govern the state transition:',
              code_snippet: parsed.code_example
            });
          }

          if (parsed.self_explanation_prompt) {
            blocks.push({
              type: 'SELF_EXPLANATION',
              title: 'Reflect & Explain',
              content: parsed.self_explanation_prompt
            });
          }

          blocks.push({
            type: 'RECAP',
            title: 'Key Takeaways',
            content: (parsed.key_takeaways || []).join('\n• ')
          });

          candidateLesson = {
            run_id: `tutor_${Date.now()}`,
            concept_id,
            concept_title,
            teaching_context,
            teaching_strategy: strategyDecision.primary_strategy,
            secondary_strategy: strategyDecision.secondary_strategy,
            teaching_mode: isPrereq ? 'targeted_repair' : 'grounded_analogy',
            support_level: strategyDecision.support_level,
            objective_summary: objectives.map(o => o.objective).join('; '),
            learning_objectives: objectives,
            lesson_blocks: blocks,
            worked_example: workedExample,
            faded_example: fadedExample,
            misconception_contrast: parsed.misconception_contrast || (misconception ? {
              correct_model: `Valid execution sequence for ${concept_title}.`,
              mistaken_model: misconception,
              why_mistake_looks_tempting: `Intuitive but misses boundary suspension rules.`,
              key_distinction: `Call stack preserves parent state until child returns.`
            } : undefined),
            self_explanation_prompt: parsed.self_explanation_prompt || `In your own words, explain why the base condition is mandatory in ${concept_title}.`,
            retrieval_prompt: parsed.retrieval_prompt || `What happens immediately before and after the central processing step?`,
            transfer_prompt: parsed.transfer_prompt || `Where else in system architecture do we apply this suspension/stack model?`,
            hint_ladder: hintLadder,
            review_recommendation: {
              needed: true,
              reason: `Newly introduced concept requires spaced retrieval practice after initial mastery.`,
              suggested_interval: '24 hours'
            },
            explanation: parsed.explanation,
            explanation_text: parsed.explanation,
            key_takeaways: parsed.key_takeaways || [
              `Verify base conditions before dispatching sub-operations.`,
              `Trace state preservation across all intermediate steps.`,
              `Recognize when boundaries signal termination.`
            ],
            code_example: parsed.code_example,
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
              difficulty: learner_level === 'beginner' ? 'Foundational' : learner_level === 'expert' ? 'Advanced' : 'Intermediate',
              scaffold_level: strategyDecision.support_level,
              teaching_strategy: strategyDecision.primary_strategy
            }
          };
        }
      } catch (err) {
        // Fall through to critic/fallback
      }
    }

    // 7. Quality Gate Evaluation
    if (candidateLesson) {
      const criticResult = LessonCritic.evaluate(candidateLesson, context);
      if (criticResult.status === 'PASS') {
        candidateLesson.quality_status = 'verified';
        return candidateLesson;
      }

      if (criticResult.status === 'REVISE') {
        // ONE Bounded Revision with Gemini
        const revisionPrompt = `You previously generated a lesson that needs a targeted pedagogical revision.
Issue detected: ${criticResult.reasons.join('; ')}
Guidance: ${criticResult.actionable_revision_guidance}

Concept: "${concept_title}" in "${subject}" (${learner_level} level, ${learning_goal} goal).
Ensure strictly no answer leakage for "${hidden_expected_answer || ''}".
Output corrected JSON with:
{
  "explanation": "Refined 2-3 paragraph pedagogical explanation.",
  "key_takeaways": ["Point 1", "Point 2", "Point 3"],
  "code_example": "// Clean illustrative code",
  "pedagogy_rationale": "Revised to ensure concise cognitive alignment."
}`;
        const revText = await generateWithGemini(revisionPrompt);
        if (revText) {
          try {
            const cleanedRev = revText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsedRev = JSON.parse(cleanedRev);
            if (parsedRev.explanation) {
              candidateLesson.explanation = parsedRev.explanation;
              candidateLesson.explanation_text = parsedRev.explanation;
              candidateLesson.key_takeaways = parsedRev.key_takeaways || candidateLesson.key_takeaways;
              candidateLesson.code_example = parsedRev.code_example || candidateLesson.code_example;
              candidateLesson.quality_status = 'revised';
              return candidateLesson;
            }
          } catch {}
        }
      }
    }

    // 8. Deterministic High-Fidelity Synthesis Fallback
    return this.buildDeterministicSynthesis(context, strategyDecision, objectives, crossCheck, workedExample, fadedExample, hintLadder);
  }

  /**
   * Deterministic, grounded structured synthesis for offline, replay, or fallback states.
   */
  private static buildDeterministicSynthesis(
    context: TutorContext,
    strategy: any,
    objectives: LearningObjective[],
    crossCheck: any,
    workedExample: WorkedExample,
    fadedExample: FadedExample,
    hintLadder: HintLadderStep[]
  ): TeachingAction {
    const { concept_title, concept_id, subject, teaching_context, learner_level, learning_goal, misconception, evidence } = context;
    const isPrereq = teaching_context === 'PREREQUISITE_REPAIR';

    let explanation = '';
    let keyTakeaways: string[] = [];
    let codeExample: string | undefined;

    const normTitle = (concept_title || '').toLowerCase();
    const normId = (concept_id || '').toLowerCase();

    if (normTitle.includes('stack') || normTitle.includes('lifo') || normId.includes('stack') || normId.includes('lifo')) {
      explanation = `A **Stack** is a foundational linear data structure governed by the **Last-In, First-Out (LIFO)** access principle.\n\nIn a stack, elements are added and removed strictly from a single designated location known as the **top**:\n• **push(item)**: Inserts an element onto the top ($O(1)$ time complexity).\n• **pop()**: Removes and returns the element currently at the top ($O(1)$ time complexity).\n• **peek() / top()**: Reads the top element without removing it ($O(1)$ time complexity).\n\nBecause elements are retrieved in reverse arrival order, stacks are universally utilized for execution call stacks, balanced delimiter parsing \`{[()]}\`, and recursive backtracking.`;
      keyTakeaways = [
        `LIFO Discipline: The most recently pushed element is always the first one popped.`,
        `Constant Time Operations: Push, pop, and peek execute in deterministic O(1) time.`,
        `Core Applications: Function call frames, expression evaluation, bracket validation, and undo buffers.`
      ];
      codeExample = `class Stack<T> {\n  private items: T[] = [];\n  push(element: T): void { this.items.push(element); }\n  pop(): T | undefined { return this.items.pop(); }\n  peek(): T | undefined { return this.items[this.items.length - 1]; }\n  isEmpty(): boolean { return this.items.length === 0; }\n}`;
    } else if (normTitle.includes('queue') || normTitle.includes('fifo') || normId.includes('queue') || normId.includes('fifo')) {
      explanation = `A **Queue** is a foundational linear data structure operating under the **First-In, First-Out (FIFO)** discipline.\n\nIn a queue, elements enter at the rear (tail) and depart from the front (head):\n• **enqueue(item)**: Appends an element to the rear ($O(1)$ time complexity).\n• **dequeue()**: Removes and returns the front element ($O(1)$ time complexity).\n• **peek() / front()**: Reads the front element without mutation ($O(1)$ time complexity).\n\nQueues are essential for breadth-first search (BFS), job scheduling, and streaming data pipelines.`;
      keyTakeaways = [
        `FIFO Discipline: Elements exit in the exact chronological order of their arrival.`,
        `Double-Ended Invariant: Insertions occur strictly at the rear; deletions occur strictly at the front.`,
        `Core Applications: Breadth-First Search (BFS), asynchronous task queues, and print spoolers.`
      ];
      codeExample = `class Queue<T> {\n  private items: T[] = [];\n  enqueue(element: T): void { this.items.push(element); }\n  dequeue(): T | undefined { return this.items.shift(); }\n  peek(): T | undefined { return this.items[0]; }\n  isEmpty(): boolean { return this.items.length === 0; }\n}`;
    } else if (normTitle.includes('tree') || normTitle.includes('inorder') || normTitle.includes('traversal')) {
      explanation = `**${concept_title}** in ${subject} operates by enforcing a deterministic traversal sequence: Left Subtree → Current Node → Right Subtree.\n\nImagine navigating a structured directory tree: before you process the contents of any folder, you must completely finish exploring its left child directory. Once the left branch is exhausted, you record the current node's value, and then systematically proceed to the right child directory. This recursive ordering guarantees that hierarchical nodes are processed in exact structural sequence.`;
      keyTakeaways = [
        `Deterministic traversal sequence: Left branch -> Node value -> Right branch (L-N-R).`,
        `Base case termination: Null references immediately halt descent and trigger call stack return.`,
        `Hierarchical ordering: Recursion ensures every subtree is processed with identical invariants.`
      ];
      codeExample = `function inorder(root: TreeNode | null, result: number[] = []): number[] {\n  if (!root) return result;\n  inorder(root.left, result);  // 1. Traverse Left Subtree\n  result.push(root.val);       // 2. Visit Current Node\n  inorder(root.right, result); // 3. Traverse Right Subtree\n  return result;\n}`;
    } else if (evidence && evidence.excerpt) {
      explanation = `**${concept_title}** in ${subject}:\n\n${evidence.excerpt}\n\nUnderstanding these foundational invariants provides the necessary conceptual clarity to analyze, evaluate, and implement solutions involving ${concept_title}.`;
      keyTakeaways = [
        `Grounded invariant: Grounded in verified course notes [${evidence.source_id}].`,
        `Core mechanism: Satisfies primary operational rules for ${concept_title}.`,
        `Boundary discipline: Invariants are preserved across all state transitions.`
      ];
    } else if (isPrereq) {
      explanation = `Let's pause and isolate the foundational prerequisite: **${concept_title}**.\n\nA cognitive breakdown often occurs when downstream tasks assume this prerequisite operates automatically. When a complex sub-routine or recursive call executes, the caller state is preserved until the nested operation resolves. Understanding this boundary and unwinding guarantee prevents errors when evaluating state.`;
      keyTakeaways = [
        `State suspension: Invocations preserve outer state until inner operations finish.`,
        `Boundary conditions: Base cases and preconditions are mandatory to prevent invalid execution loops.`,
        `Sequential resumption: Returns unwind in deterministic order.`
      ];
      codeExample = `// Prerequisite Invariant Pattern:\nfunction executeStep(state) {\n  if (isTerminal(state)) return baseResult(state);\n  const intermediate = executeSubTask(state);\n  return finalize(intermediate);\n}`;
    } else {
      explanation = `**${concept_title}** is a core concept in ${subject}.\n\nTo master ${concept_title}, it is crucial to understand its foundational principles, operational guarantees, and boundary constraints. When evaluating problems involving ${concept_title}, systematically trace state changes, verify preconditions, and ensure invariants are maintained at every step.`;
      keyTakeaways = [
        `Core definition: Establishes the primary guarantees of ${concept_title}.`,
        `Stepwise evaluation: Always verify preconditions before executing state changes.`,
        `Boundary handling: Explicitly account for edge cases and termination conditions.`
      ];
      codeExample = `// Demonstration of ${concept_title}:\nfunction evaluate(input) {\n  // 1. Validate preconditions\n  if (!input) return null;\n  // 2. Execute transformation\n  return process(input);\n}`;
    }

    const blocks: LessonBlock[] = [
      {
        type: isPrereq ? 'CONTEXT_BRIDGE' : 'OBJECTIVE',
        title: isPrereq ? 'Prerequisite Remediation' : 'Learning Objective',
        content: isPrereq
          ? `Remediating foundation gap for **${concept_title}** before returning to the target problem.`
          : `Mastering the operational invariants of **${concept_title}**.`
      },
      {
        type: 'CORE_IDEA',
        title: 'Core Conceptual Invariant',
        content: explanation
      },
      {
        type: 'WORKED_EXAMPLE',
        title: 'Step-by-Step Worked Walkthrough',
        content: `**Problem:** ${workedExample.problem}\n**Resolution:** ${workedExample.result}\n**Why it works:** ${workedExample.why_this_works}`
      },
      {
        type: 'RECAP',
        title: 'Key Takeaways',
        content: keyTakeaways.join('\n• ')
      }
    ];

    return {
      run_id: `tutor_fallback_${Date.now()}`,
      concept_id,
      concept_title,
      teaching_context,
      teaching_strategy: strategy.primary_strategy,
      secondary_strategy: strategy.secondary_strategy,
      teaching_mode: isPrereq ? 'targeted_repair' : 'grounded_analogy',
      support_level: strategy.support_level,
      objective_summary: objectives.map(o => o.objective).join('; '),
      learning_objectives: objectives,
      lesson_blocks: blocks,
      worked_example: workedExample,
      faded_example: fadedExample,
      misconception_contrast: isPrereq ? {
        correct_model: `Call stack pauses caller until sub-routine finishes.`,
        mistaken_model: misconception || `Assuming visits occur immediately before sub-calls return.`,
        why_mistake_looks_tempting: `Code is read top-to-bottom without considering stack suspension.`,
        key_distinction: `Execution order is governed by return sequence, not line appearance.`
      } : undefined,
      self_explanation_prompt: `In your own words, explain how ${concept_title} maintains execution guarantees.`,
      retrieval_prompt: `What is the first step executed when evaluating ${concept_title}?`,
      transfer_prompt: `How does this mechanism generalize to deeper problem spaces?`,
      hint_ladder: hintLadder,
      review_recommendation: {
        needed: true,
        reason: `Foundational learning requires active reinforcement.`,
        suggested_interval: '24 hours'
      },
      explanation,
      explanation_text: explanation,
      key_takeaways: keyTakeaways,
      code_example: codeExample,
      pedagogy_rationale: strategy.reason,
      evidence_ref: crossCheck.relevant ? evidence?.source_id : undefined,
      is_course_grounded: crossCheck.relevant,
      provenance_type: crossCheck.provenance as any,
      quality_status: 'safe_fallback',
      teaching_context_for_exercise: {
        taught_concepts: [concept_id],
        learning_objectives: objectives.map(o => o.objective),
        examples_used: [concept_title],
        misconceptions_addressed: misconception ? [misconception] : [],
        difficulty: learner_level === 'beginner' ? 'Foundational' : 'Intermediate',
        scaffold_level: strategy.support_level,
        teaching_strategy: strategy.primary_strategy
      }
    };
  }
}
