import { generateWithGemini } from './gemini';
import { tutorAgent } from './agents/tutorAgent';
import { resourceAgent } from './agents/resourceAgent';
import { LearningPart } from './curriculum/partPlanner';

export interface DAGResult {
  dag: Record<string, string[]>;
  conceptTitles: Record<string, string>;
  targetId: string;
}

export function toId(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export async function buildDAG(subject: string, targetConcept: string): Promise<DAGResult> {
  const normSubject = subject.toLowerCase();
  const normTarget = targetConcept.toLowerCase();

  // Try dynamic generation with Gemini first
  const prompt = `You are a curriculum architect and cognitive knowledge graph engineer.
Subject: "${subject}"
Target Concept: "${targetConcept}"

Construct a targeted prerequisite dependency graph (DAG) for this concept.
The DAG must include 2-3 essential prerequisite concepts that a learner must understand before mastering "${targetConcept}".
Output strictly valid JSON with no markdown formatting:
{
  "target_id": "short_snake_case_id",
  "concept_titles": {
    "short_snake_case_id": "Display Name",
    "prereq_1_id": "Direct Prereq 1 Name",
    "prereq_2_id": "Direct Prereq 2 Name",
    "sub_prereq_id": "Sub Prereq Name"
  },
  "dag": {
    "short_snake_case_id": ["prereq_1_id", "prereq_2_id"],
    "prereq_1_id": [],
    "prereq_2_id": ["sub_prereq_id"],
    "sub_prereq_id": []
  }
}`;

  const aiText = await generateWithGemini(prompt);
  if (aiText) {
    try {
      const cleaned = aiText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.dag && parsed.concept_titles && parsed.target_id) {
        return {
          targetId: parsed.target_id,
          conceptTitles: parsed.concept_titles,
          dag: parsed.dag
        };
      }
    } catch {
      // Fallback below
    }
  }

  // Domain-specific curated fallback DAGs
  if (normTarget.includes('stack')) {
    return {
      targetId: 'stack_data_structure',
      conceptTitles: {
        stack_data_structure: targetConcept || 'Stack Data Structure',
        lifo_ordering_principles: 'LIFO Ordering & Core Mechanics (Push/Pop)',
        array_memory_allocation: 'Array & Dynamic Memory Allocation',
        call_stack_management: 'Call Stack & Execution Frames'
      },
      dag: {
        stack_data_structure: ['lifo_ordering_principles', 'array_memory_allocation'],
        lifo_ordering_principles: ['call_stack_management'],
        array_memory_allocation: [],
        call_stack_management: []
      }
    };
  }

  if (normTarget.includes('queue')) {
    return {
      targetId: 'queue_data_structure',
      conceptTitles: {
        queue_data_structure: targetConcept || 'Queue Data Structure',
        fifo_ordering_principles: 'FIFO Ordering Mechanics (Enqueue/Dequeue)',
        linked_nodes_pointers: 'Pointer & Node References',
        circular_buffer_mechanics: 'Circular Buffer & Bounds Checks'
      },
      dag: {
        queue_data_structure: ['fifo_ordering_principles', 'linked_nodes_pointers'],
        fifo_ordering_principles: ['circular_buffer_mechanics'],
        linked_nodes_pointers: [],
        circular_buffer_mechanics: []
      }
    };
  }

  if (normTarget.includes('inorder') || (normSubject.includes('data structure') && normTarget.includes('tree'))) {
    return {
      targetId: 'binary_tree_inorder_traversal',
      conceptTitles: {
        binary_tree_inorder_traversal: 'Binary Tree Inorder Traversal',
        tree_traversal_order: 'Tree Traversal Ordering Rules',
        recursion: 'Recursion',
        base_case_evaluation: 'Base-Case Evaluation',
        call_stack_reasoning: 'Call Stack Reasoning',
        array_traversal: 'Array Traversal'
      },
      dag: {
        binary_tree_inorder_traversal: ['tree_traversal_order', 'recursion'],
        tree_traversal_order: [],
        recursion: ['base_case_evaluation', 'call_stack_reasoning'],
        base_case_evaluation: [],
        call_stack_reasoning: [],
        array_traversal: []
      }
    };
  }

  // Generic heuristic fallback DAG
  const targetId = toId(targetConcept);
  const p1Id = `${targetId}_foundations`;
  const p2Id = `${targetId}_core_mechanics`;
  const subPId = `${targetId}_basic_principles`;

  return {
    targetId,
    conceptTitles: {
      [targetId]: targetConcept,
      [p1Id]: `${targetConcept} Foundations`,
      [p2Id]: `${targetConcept} Core Mechanics`,
      [subPId]: `${targetConcept} Basic Invariants`
    },
    dag: {
      [targetId]: [p1Id, p2Id],
      [p1Id]: [],
      [p2Id]: [subPId],
      [subPId]: []
    }
  };
}

export async function generateInitialTeaching(
  subject: string,
  targetConcept: string,
  learnerLevel = 'intermediate',
  learningGoal = 'understand',
  studentId = 'default_student',
  courseId = 'data_structures',
  learningPart?: LearningPart
): Promise<any> {
  const resource = await resourceAgent.selectResource({
    concept_id: toId(targetConcept),
    concept_title: learningPart ? `${targetConcept} - ${learningPart.title}` : targetConcept,
    query_context: `${subject} ${targetConcept} ${learningPart?.title || ''} ${learningPart?.objective || ''}`
  });

  const teaching = await tutorAgent.teach({
    teaching_context: learningPart ? (`PART_${learningPart.part_number}_TEACHING` as any) : 'INITIAL_TEACHING',
    concept_id: learningPart ? learningPart.id : toId(targetConcept),
    concept_title: learningPart ? `${learningPart.title}` : targetConcept,
    target_concept: targetConcept,
    active_concept: learningPart ? learningPart.id : toId(targetConcept),
    subject,
    student_id: studentId,
    course_id: courseId,
    learner_level: learnerLevel,
    learning_goal: learningGoal,
    evidence: resource.primary_evidence
  });

  return {
    ...teaching,
    learning_part: learningPart,
    explanation_text: teaching.explanation
  };
}

import { exerciseAgent } from './agents/exerciseAgent';

export async function generatePrereqQuiz(prereqId: string, prereqTitle: string, subject: string): Promise<any> {
  return exerciseAgent.generatePrereqDiagnosticQuiz(prereqId, prereqTitle, subject);
}

export async function generateExercise(
  conceptId: string,
  conceptTitle: string,
  subject: string,
  isRecheck = false,
  learnerLevel = 'intermediate',
  learningGoal = 'understand',
  learningPart?: LearningPart
): Promise<any> {
  const outcome = await exerciseAgent.generateAssessment({
    student_id: 'active_student',
    subject,
    target_concept: conceptTitle,
    active_concept: conceptId,
    concept_title: learningPart ? `${learningPart.title} (${conceptTitle})` : conceptTitle,
    phase_intent: isRecheck ? 'PREREQ_RECHECK' : learningPart ? (`PART_${learningPart.part_number}_EXERCISE` as any) : 'INITIAL_TARGET',
    learner_level: learnerLevel,
    learning_goal: learningGoal
  });

  const exercise = {
    ...outcome.exercise,
    learning_part: learningPart
  };

  return {
    exercise,
    answer_key: outcome.answer_key
  };
}

export async function generateReteachLesson(
  prereqId: string,
  prereqTitle: string,
  misconception = 'prerequisite_gap',
  subject = 'Computer Science',
  learnerLevel = 'intermediate',
  learningGoal = 'understand',
  studentId = 'default_student',
  courseId = 'data_structures'
): Promise<any> {
  const resource = await resourceAgent.selectResource({
    concept_id: prereqId,
    concept_title: prereqTitle,
    query_context: `${subject} ${prereqTitle}`
  });

  const teaching = await tutorAgent.teach({
    teaching_context: 'PREREQUISITE_REPAIR',
    concept_id: prereqId,
    concept_title: prereqTitle,
    target_concept: prereqTitle,
    active_concept: prereqId,
    subject,
    student_id: studentId,
    course_id: courseId,
    learner_level: learnerLevel,
    learning_goal: learningGoal,
    evidence: resource.primary_evidence,
    misconception
  });

  return {
    ...teaching,
    explanation_text: teaching.explanation
  };
}
