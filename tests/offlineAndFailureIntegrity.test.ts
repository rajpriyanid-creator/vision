import { EvaluationAgent } from '../server/agents/evaluationAgent';
import { WorkflowController } from '../server/workflow/controller';
import { db, StoredSession } from '../server/db';
import { checkGeminiHealth, getGeminiStatus } from '../server/gemini';
import { buildDAG } from '../server/engine';
import { PartPlanner } from '../server/curriculum/partPlanner';

async function runIntegrityTests() {
  console.log('============================================================');
  console.log('RUNNING MODEL FAILURE & OFFLINE COMPLETION INTEGRITY TESTS');
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

  const evalAgent = new EvaluationAgent();

  // -------------------------------------------------------------------------
  // TEST 1: Wrong answer is NEVER evaluated as correct when model is unavailable
  // -------------------------------------------------------------------------
  const mcqExercise = {
    exercise_id: 'ex_test_mcq',
    concept_id: 'binary_tree_inorder_traversal',
    concept_title: 'Binary Tree Inorder Traversal',
    format: 'mcq',
    prompt: 'In what order does an inorder traversal visit nodes?',
    expected_answer: 'Left, Root, Right',
    options: [
      { id: 'A', text: 'Root, Left, Right', is_correct: false },
      { id: 'B', text: 'Left, Root, Right', is_correct: true },
      { id: 'C', text: 'Left, Right, Root', is_correct: false }
    ]
  };

  const mcqAnswerKey = {
    exercise_id: 'ex_test_mcq',
    concept_id: 'binary_tree_inorder_traversal',
    canonical_answer: 'Left, Root, Right',
    correct_option_id: 'B',
    misconception_signals: ['Confusing preorder with inorder traversal']
  };

  // Submit WRONG answer 'A'
  const wrongEval = await evalAgent.evaluate({
    exercise: mcqExercise as any,
    answer_key: mcqAnswerKey as any,
    selected_option: 'A',
    student_answer: 'Root, Left, Right'
  });

  assert(wrongEval.status === 'unresolved', 'Wrong MCQ answer is marked unresolved (NOT false-positive demonstrated)');
  assert(wrongEval.score < 50, 'Score reflects incorrect submission');
  assert(wrongEval.misconceptions.length > 0, 'Identified specific misconception signal');

  // Submit CORRECT answer 'B'
  const correctEval = await evalAgent.evaluate({
    exercise: mcqExercise as any,
    answer_key: mcqAnswerKey as any,
    selected_option: 'B',
    student_answer: 'Left, Root, Right'
  });

  assert(correctEval.status === 'demonstrated', 'Correct MCQ answer is marked demonstrated');
  assert(correctEval.score === 100, 'Correct answer scores 100');

  // -------------------------------------------------------------------------
  // TEST 2: Failing Code is NEVER evaluated as correct
  // -------------------------------------------------------------------------
  const codeExercise = {
    exercise_id: 'ex_test_code',
    concept_id: 'stack_operations',
    concept_title: 'Stack Operations',
    format: 'coding',
    prompt: 'Implement a function isValid(s) checking balanced brackets.',
    language: 'javascript'
  };

  const codeAnswerKey = {
    exercise_id: 'ex_test_code',
    concept_id: 'stack_operations',
    private_test_cases: [
      { name: 'Simple balanced', input: 'isValid("()")', expected: 'true' },
      { name: 'Simple unbalanced', input: 'isValid("([)")', expected: 'false' }
    ]
  };

  const buggyCode = `
    function isValid(s) {
      return true; // Buggy naive return
    }
  `;

  const codeEvalWrong = await evalAgent.evaluate({
    exercise: codeExercise as any,
    answer_key: codeAnswerKey as any,
    code_submission: buggyCode
  });

  assert(codeEvalWrong.status === 'unresolved', 'Failing code is marked unresolved');
  assert(codeEvalWrong.code_execution_result?.passed === false, 'Code execution failure recorded');

  // -------------------------------------------------------------------------
  // TEST 3: Health status reports honestly without key
  // -------------------------------------------------------------------------
  const healthStatus = getGeminiStatus();
  if (!process.env.GEMINI_API_KEY) {
    assert(healthStatus.live === false, 'Health status reports model as offline when GEMINI_API_KEY is not provided');
    assert(healthStatus.status === 'offline', 'Status indicates offline deterministic mode');
  }

  // -------------------------------------------------------------------------
  // TEST 4: Full Session Progresses to TARGET_MASTERED with No Key
  // -------------------------------------------------------------------------
  const runId = `test_offline_${Date.now()}`;
  const dagRes = await buildDAG('Data Structures', 'Stack Operations');
  const roadmap = await PartPlanner.planCurriculum('Data Structures', 'Stack Operations', 3);

  const testSession: StoredSession = {
    run_id: runId,
    student_id: 'offline_student',
    subject: 'Data Structures',
    target_concept: 'Stack Operations',
    target_id: 'stack_operations',
    course_id: 'data_structures',
    current_state: 'PRACTICE',
    status: 'active',
    learner_level: 'intermediate',
    learning_goal: 'mastery',
    call_count: 1,
    revision_count: 0,
    backtrack_count: 0,
    dag: dagRes.dag,
    concept_titles: dagRes.conceptTitles,
    active_concept: 'stack_operations',
    prereq_chain: ['stack_operations'],
    taught_concepts: ['stack_operations'],
    history: [],
    created_at: new Date().toISOString(),
    vision_statement: roadmap.vision_statement,
    n_parts: 3,
    current_part_index: 0,
    learning_parts: roadmap.parts,
    active_exercise: {
      exercise_id: 'ex_part1',
      concept_id: 'stack_operations',
      concept_title: 'Stack Operations - Part 1',
      format: 'mcq',
      prompt: 'What principle does a stack follow?',
      expected_answer: 'LIFO (Last In First Out)',
      options: [
        { id: 'A', text: 'FIFO (First In First Out)', is_correct: false },
        { id: 'B', text: 'LIFO (Last In First Out)', is_correct: true }
      ]
    },
    active_answer_key: {
      exercise_id: 'ex_part1',
      concept_id: 'stack_operations',
      canonical_answer: 'LIFO (Last In First Out)',
      correct_option_id: 'B'
    }
  };

  db.saveSession(testSession);

  // Step 1: Submit correct answer for Part 1 -> Should advance to Part 2
  const resPart1 = await WorkflowController.handleStudentSubmission(testSession, {
    selected_option: 'B',
    student_answer: 'LIFO (Last In First Out)'
  });

  assert(resPart1.current_part_index === 1, 'Correct Part 1 advances current_part_index to 1');
  assert(resPart1.learning_parts?.[0].status === 'mastered', 'Part 1 status set to mastered');
  assert(resPart1.current_state === 'INITIAL_TEACHING', 'Transitions to INITIAL_TEACHING for Part 2');

  // Step 2: Begin practice on Part 2 and answer correctly -> Should advance to Part 3
  resPart1.current_state = 'PRACTICE';
  resPart1.active_exercise = {
    exercise_id: 'ex_part2',
    concept_id: 'stack_operations',
    concept_title: 'Stack Operations - Part 2',
    format: 'mcq',
    prompt: 'Which operation removes an item from the top of the stack?',
    expected_answer: 'pop()',
    options: [
      { id: 'A', text: 'push()', is_correct: false },
      { id: 'B', text: 'pop()', is_correct: true }
    ]
  };
  resPart1.active_answer_key = {
    exercise_id: 'ex_part2',
    concept_id: 'stack_operations',
    canonical_answer: 'pop()',
    correct_option_id: 'B'
  };

  const resPart2 = await WorkflowController.handleStudentSubmission(resPart1, {
    selected_option: 'B',
    student_answer: 'pop()'
  });

  assert(resPart2.current_part_index === 2, 'Correct Part 2 advances current_part_index to 2');
  assert(resPart2.learning_parts?.[1].status === 'mastered', 'Part 2 status set to mastered');

  // Step 3: Begin practice on Part 3 (Final) and answer correctly -> TARGET_MASTERED!
  resPart2.current_state = 'PRACTICE';
  resPart2.active_exercise = {
    exercise_id: 'ex_part3',
    concept_id: 'stack_operations',
    concept_title: 'Stack Operations - Part 3',
    format: 'mcq',
    prompt: 'What happens when popping an empty stack?',
    expected_answer: 'Underflow error',
    options: [
      { id: 'A', text: 'Overflow error', is_correct: false },
      { id: 'B', text: 'Underflow error', is_correct: true }
    ]
  };
  resPart2.active_answer_key = {
    exercise_id: 'ex_part3',
    concept_id: 'stack_operations',
    canonical_answer: 'Underflow error',
    correct_option_id: 'B'
  };

  const resFinal = await WorkflowController.handleStudentSubmission(resPart2, {
    selected_option: 'B',
    student_answer: 'Underflow error'
  });

  assert(resFinal.current_state === 'TARGET_MASTERED', 'Final part completion transitions state to TARGET_MASTERED');
  assert(resFinal.status === 'completed', 'Session status marked completed');
  assert(resFinal.learning_parts?.[2].status === 'mastered', 'Part 3 status set to mastered');

  console.log(`\nINTEGRITY TEST RESULTS: ${passed} / ${total} tests passed\n`);
}

runIntegrityTests().catch(console.error);
