/**
 * Comprehensive Multi-Agent Workflow, Adversarial, and State Transition Test Suite
 */

import { WorkflowController } from '../server/workflow/controller';
import { supervisorAgent } from '../server/agents/supervisorAgent';
import { diagnosticAgent } from '../server/agents/diagnosticAgent';
import { resourceAgent } from '../server/agents/resourceAgent';
import { tutorAgent } from '../server/agents/tutorAgent';
import { exerciseAgent } from '../server/agents/exerciseAgent';
import { evaluationAgent } from '../server/agents/evaluationAgent';
import { evidenceRetriever } from '../server/retrieval/evidenceRetriever';
import { db, StoredSession } from '../server/db';
import { CourseContext } from '../server/models/contracts';
import { StrategySelector } from '../server/exercise/strategySelector';
import { ExerciseQualityGate } from '../server/exercise/qualityGate';
import { CodeSandbox } from '../server/exercise/codeSandbox';

async function runTests() {
  console.log('============================================================');
  console.log('RUNNING VISION COMPLETE TEST SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
    }
  }

  // TEST 1: Supervisor planning from START_STUDY
  const courseContext: CourseContext = {
    course_id: 'data_structures',
    course_name: 'Data Structures & Algorithms',
    subject: 'Data Structures',
    target_concept: 'Binary Tree Inorder Traversal',
    target_id: 'binary_tree_inorder_traversal',
    dag: {
      binary_tree_inorder_traversal: ['recursion'],
      recursion: ['call_stack_reasoning'],
      call_stack_reasoning: []
    },
    concept_titles: {
      binary_tree_inorder_traversal: 'Binary Tree Inorder Traversal',
      recursion: 'Recursion',
      call_stack_reasoning: 'Call Stack Reasoning'
    },
    nodes: {},
    is_valid_dag: true
  };

  const decision1 = await supervisorAgent.planNextAction({
    run_id: 'run_test_01',
    current_state: 'START_STUDY',
    target_concept_id: 'binary_tree_inorder_traversal',
    active_concept_id: 'binary_tree_inorder_traversal',
    course_context: courseContext,
    budget: {
      max_llm_calls: 10,
      llm_calls_made: 0,
      max_revisions: 4,
      revisions_made: 0,
      max_backtracks: 2,
      backtracks_made: 0,
      tokens_consumed: 0,
      is_exhausted: false
    }
  });
  assert(decision1.next_state === 'PREREQ_SURVEY', 'Supervisor plans PREREQ_SURVEY when prerequisites exist');

  // TEST 2: Evidence Retriever finds and verifies course notes
  const evidenceRes = evidenceRetriever.findEvidence('recursion', 'Recursion Foundations');
  assert(
    evidenceRes.verification_status === 'verified' && evidenceRes.primary_evidence !== null,
    'Resource Agent retrieves course-approved evidence with verified provenance'
  );
  assert(
    evidenceRes.primary_evidence?.source_id === 'DS-NOTE-02',
    'Resource Agent preserves exact Source ID (DS-NOTE-02)'
  );

  // TEST 3: Exercise Assessment Generation & Separation of Public Exercise vs Private Answer Key
  const assessmentOutcome = await exerciseAgent.generateAssessment({
    student_id: 'student_test_01',
    subject: 'Data Structures',
    target_concept: 'Binary Tree Inorder Traversal',
    active_concept: 'binary_tree_inorder_traversal',
    concept_title: 'Binary Tree Inorder Traversal',
    phase_intent: 'INITIAL_TARGET',
    learner_level: 'intermediate',
    learning_goal: 'understand'
  });

  const exercise = assessmentOutcome.exercise;
  const answerKey = assessmentOutcome.answer_key;

  assert(Boolean(exercise.exercise_id), 'Exercise Agent generates valid Exercise with unique ID');
  assert(Boolean(answerKey.canonical_answer), 'Exercise Agent generates complete private Answer Key');
  assert(exercise.test_cases === undefined, 'Public Exercise payload strips private test cases');
  assert(exercise.options && exercise.options.length >= 3, 'MCQ format has 3-5 distinct options');

  // TEST 4: Quality Gate validation
  const quality = ExerciseQualityGate.evaluate(
    exercise,
    answerKey,
    assessmentOutcome.blueprint,
    []
  );
  assert(quality.status === 'PASS' || quality.status === 'REVISED', 'Quality Gate approves assessment item');
  assert(!quality.leakage_detected, 'Quality Gate verifies NO answer leakage in prompt or starter code');

  // TEST 5: Evaluation Agent evaluates correct answer with private Answer Key
  const evalCorrect = await evaluationAgent.evaluate({
    exercise,
    answer_key: answerKey,
    selected_option: answerKey.canonical_answer
  });
  assert(evalCorrect.status === 'demonstrated', 'Evaluation Agent marks matching expected answer as demonstrated');

  // TEST 6: Evaluation Agent evaluates incorrect choice
  const evalIncorrect = await evaluationAgent.evaluate({
    exercise,
    answer_key: answerKey,
    selected_option: '[2, 1, 3]'
  });
  assert(evalIncorrect.status === 'unresolved', 'Evaluation Agent marks incorrect answer as unresolved');

  // TEST 7: CODING SECURITY: Reject Fake Client-Submitted "passed: true"
  const fakePassedSubmission = {
    exercise: {
      exercise_id: 'ex_sec_01',
      concept_id: 'linked_list_reversal',
      concept_title: 'Linked List Reversal',
      format: 'coding',
      prompt: 'Implement reverseList(head)',
      starter_code: 'function reverseList(head) {}',
      language: 'javascript'
    },
    answer_key: {
      exercise_id: 'ex_sec_01',
      concept_id: 'linked_list_reversal',
      canonical_answer: 'while (curr) { const next = curr.next; curr.next = prev; prev = curr; curr = next; } return prev;',
      accepted_answers: [],
      required_evidence: ['Pointer reversal loop'],
      rubric: { rubric_type: 'coding', criteria: [{ id: 'rev', description: 'Reverses list', required: true }] },
      private_test_cases: [
        { name: 'Standard 5-node list', input: '[1, 2, 3, 4, 5]', expected: '[5, 4, 3, 2, 1]' }
      ]
    },
    code_submission: 'function reverseList(head) { return "wrong"; }',
    client_test_results: [{ passed: true, score: 100 }] // ADVERSARIAL FORGED CLIENT REPORT
  };

  const evalSecurity = await evaluationAgent.evaluate(fakePassedSubmission as any);
  assert(
    evalSecurity.status === 'unresolved',
    'Coding Security Test: Forged client "passed: true" is strictly REJECTED, code evaluated server-side'
  );

  // TEST 8: Dynamic Strategy Selector across domains
  const mathBlueprint = StrategySelector.selectBlueprint({
    student_id: 's1',
    subject: 'Mathematics',
    target_concept: 'Matrix Multiplication',
    active_concept: 'matrix_multiplication',
    concept_title: 'Matrix Multiplication',
    phase_intent: 'PREREQ_RECHECK',
    learner_level: 'beginner',
    learning_goal: 'exam'
  });
  assert(
    mathBlueprint.strategy === 'PREREQUISITE_RECHECK' && mathBlueprint.difficulty_band === 'Foundational',
    'Strategy Selector sets PREREQUISITE_RECHECK with Foundational difficulty for beginner prerequisite'
  );

  // TEST 9: Idempotency Protection
  const testSession: StoredSession = {
    run_id: 'run_idem_01',
    student_id: 'student_test',
    subject: 'Data Structures',
    target_concept: 'Binary Tree Inorder Traversal',
    target_id: 'binary_tree_inorder_traversal',
    course_id: 'data_structures',
    current_state: 'PRACTICE',
    status: 'active',
    learner_level: 'intermediate',
    learning_goal: 'understand',
    call_count: 0,
    revision_count: 0,
    backtrack_count: 0,
    dag: courseContext.dag,
    concept_titles: courseContext.concept_titles,
    active_concept: 'binary_tree_inorder_traversal',
    prereq_chain: ['binary_tree_inorder_traversal'],
    taught_concepts: ['binary_tree_inorder_traversal'],
    active_exercise: exercise,
    active_answer_key: answerKey,
    history: [],
    created_at: new Date().toISOString()
  };

  db.saveSession(testSession);

  // Submit twice with identical submission_id
  const sub1 = await WorkflowController.handleStudentSubmission(testSession, {
    selected_option: answerKey.canonical_answer,
    submission_id: 'sub_unique_123'
  });
  const countAfterFirst = sub1.call_count;

  const sub2 = await WorkflowController.handleStudentSubmission(testSession, {
    selected_option: answerKey.canonical_answer,
    submission_id: 'sub_unique_123'
  });
  assert(sub2.call_count === countAfterFirst, 'Idempotency test: Duplicate submission ID ignored');

  // TEST 10: End-to-End Prerequisite Repair & Retest Loop
  const strugglingSession: StoredSession = {
    run_id: 'run_struggle_01',
    student_id: 'student_test_2',
    subject: 'Data Structures',
    target_concept: 'Binary Tree Inorder Traversal',
    target_id: 'binary_tree_inorder_traversal',
    course_id: 'data_structures',
    current_state: 'PRACTICE',
    status: 'active',
    learner_level: 'intermediate',
    learning_goal: 'understand',
    call_count: 1,
    revision_count: 0,
    backtrack_count: 0,
    dag: courseContext.dag,
    concept_titles: courseContext.concept_titles,
    active_concept: 'binary_tree_inorder_traversal',
    prereq_chain: ['binary_tree_inorder_traversal'],
    taught_concepts: ['binary_tree_inorder_traversal'],
    active_exercise: exercise,
    active_answer_key: answerKey,
    history: [],
    created_at: new Date().toISOString()
  };
  db.saveSession(strugglingSession);

  // Student fails target -> Diagnoses prerequisite
  const stepFail = await WorkflowController.handleStudentSubmission(strugglingSession, {
    selected_option: '[2, 1, 3]',
    submission_id: 'sub_fail_1'
  });
  assert(stepFail.current_state === 'DIAGNOSE_GAP', 'Workflow Controller transitions to DIAGNOSE_GAP on failure');
  assert(stepFail.active_concept === 'recursion', 'Diagnosed and activated foundational prerequisite recursion');
  assert(stepFail.teaching_action !== undefined, 'Tutor Agent generated targeted prerequisite repair lesson');
  assert(stepFail.resource_selection !== undefined, 'Resource Agent linked verified evidence');

  console.log('\n============================================================');
  console.log(`TEST SUITE RESULTS: ${passed} / ${total} tests passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('============================================================\n');
}

runTests().catch(console.error);
