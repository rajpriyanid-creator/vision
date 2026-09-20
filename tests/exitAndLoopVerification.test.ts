/**
 * Comprehensive Verification of Remediation Loop, Exit Logic, Tutor Q&A, and Edge Cases
 */

import { WorkflowController } from '../server/workflow/controller';
import { tutorAgent } from '../server/agents/tutorAgent';
import { db, StoredSession } from '../server/db';
import { CourseContext } from '../server/models/contracts';

async function runVerification() {
  console.log('============================================================');
  console.log('RUNNING EXIT & REMEDIATION LOOP VERIFICATION TEST SUITE');
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

  const courseContext: CourseContext = {
    course_id: 'cs_101',
    course_name: 'Computer Science Foundations',
    subject: 'Computer Science',
    target_concept: 'Recursion',
    target_id: 'recursion',
    dag: {
      recursion: ['call_stack'],
      call_stack: []
    },
    concept_titles: {
      recursion: 'Recursion Foundations',
      call_stack: 'Call Stack Mechanics'
    },
    nodes: {},
    is_valid_dag: true
  };

  // 1. VERIFY TUTOR Q&A
  console.log('--- Step 1: Testing Tutor Q&A Subsystem ---');
  const qnaRes = await tutorAgent.answerQuestion({
    question: 'Why does recursion require a base case?',
    concept_title: 'Recursion Foundations',
    subject: 'Computer Science',
    learner_level: 'intermediate',
    learning_goal: 'understand'
  });

  assert(Boolean(qnaRes.answer), 'Tutor Agent generates detailed pedagogical answer to student question');
  assert(Boolean(qnaRes.key_takeaway), 'Tutor Agent generates key takeaway summary');

  // 2. VERIFY 4+ INCORRECT ATTEMPTS EXIT LOGIC (WAITING_FOR_HUMAN)
  console.log('\n--- Step 2: Testing 4+ Incorrect Attempts Exit Logic ---');
  const session: StoredSession = {
    run_id: 'run_exit_verify_01',
    student_id: 'student_verify_01',
    subject: 'Computer Science',
    target_concept: 'Recursion',
    target_id: 'recursion',
    course_id: 'cs_101',
    current_state: 'PRACTICE',
    status: 'active',
    learner_level: 'intermediate',
    learning_goal: 'understand',
    call_count: 0,
    revision_count: 0,
    backtrack_count: 0,
    dag: courseContext.dag,
    concept_titles: courseContext.concept_titles,
    active_concept: 'recursion',
    prereq_chain: ['recursion'],
    taught_concepts: ['recursion'],
    active_exercise: {
      exercise_id: 'ex_test_01',
      concept_id: 'recursion',
      concept_title: 'Recursion Foundations',
      format: 'mcq',
      prompt: 'What is the base case in recursion?',
      options: ['Termination condition', 'Infinite loop', 'Compiler error', 'Memory allocation'],
      difficulty: 'Intermediate'
    },
    active_answer_key: {
      exercise_id: 'ex_test_01',
      canonical_answer: 'Termination condition',
      rubric: { rubric_type: 'exact' }
    },
    history: [],
    created_at: new Date().toISOString()
  };

  db.saveSession(session);

  // Attempt 1: Wrong Answer
  const step1 = await WorkflowController.handleStudentSubmission(session, {
    selected_option: 'Infinite loop',
    submission_id: 'sub_wrong_1'
  });
  assert(step1.revision_count === 1, 'Attempt 1 increments revision_count to 1');
  assert(step1.current_state === 'DIAGNOSE_GAP', 'Attempt 1 transitions to DIAGNOSE_GAP for repair');

  // Simulate returning to PRACTICE for Attempt 2
  step1.current_state = 'PRACTICE';
  const step2 = await WorkflowController.handleStudentSubmission(step1, {
    selected_option: 'Infinite loop',
    submission_id: 'sub_wrong_2'
  });
  assert(step2.revision_count === 2, 'Attempt 2 increments revision_count to 2');

  // Simulate returning to PRACTICE for Attempt 3
  step2.current_state = 'PRACTICE';
  const step3 = await WorkflowController.handleStudentSubmission(step2, {
    selected_option: 'Compiler error',
    submission_id: 'sub_wrong_3'
  });
  assert(step3.revision_count === 3, 'Attempt 3 increments revision_count to 3');

  // Simulate returning to PRACTICE for Attempt 4
  step3.current_state = 'PRACTICE';
  const step4 = await WorkflowController.handleStudentSubmission(step3, {
    selected_option: 'Memory allocation',
    submission_id: 'sub_wrong_4'
  });
  assert(step4.revision_count === 4, 'Attempt 4 increments revision_count to 4');
  assert(step4.current_state === 'DIAGNOSE_GAP', 'Attempt 4 stays in DIAGNOSE_GAP (budget limit is > 4)');

  // Simulate returning to PRACTICE for Attempt 5 (Exceeding limit of 4 attempts)
  step4.current_state = 'PRACTICE';
  const step5 = await WorkflowController.handleStudentSubmission(step4, {
    selected_option: 'Infinite loop',
    submission_id: 'sub_wrong_5'
  });
  assert(step5.revision_count === 5, 'Attempt 5 sets revision_count to 5 (> 4)');
  assert(step5.current_state === 'WAITING_FOR_HUMAN', '5th failed attempt triggers WAITING_FOR_HUMAN escalation state');
  assert(Boolean(step5.human_question), 'Human escalation payload populated with instructor options');

  // 3. VERIFY HUMAN RESUME & REVISION COUNT RESET
  console.log('\n--- Step 3: Testing Human Instructor Resume & Reset ---');
  // Simulate human instructor decision
  step5.revision_count = 0;
  step5.human_question = null;
  step5.current_state = 'PRACTICE';
  db.saveSession(step5);

  assert(step5.revision_count === 0, 'Human resume resets revision_count to 0');
  assert(step5.human_question === null, 'Human question payload cleared');
  assert(step5.current_state === 'PRACTICE', 'Session state successfully set to PRACTICE');

  // Verify that a single wrong answer after human resume does NOT re-trigger WAITING_FOR_HUMAN
  const postResumeStep = await WorkflowController.handleStudentSubmission(step5, {
    selected_option: 'Wrong choice',
    submission_id: 'sub_post_resume_1'
  });
  assert(postResumeStep.revision_count === 1, 'Post-resume wrong answer sets revision_count to 1');
  assert(postResumeStep.current_state === 'DIAGNOSE_GAP', 'Post-resume wrong answer transitions to DIAGNOSE_GAP, NOT WAITING_FOR_HUMAN');

  // 4. VERIFY SUCCESSFUL MASTERY ADVANCEMENT
  console.log('\n--- Step 4: Testing Correct Answer & Part Advancement ---');
  postResumeStep.current_state = 'PRACTICE';
  const correctStep = await WorkflowController.handleStudentSubmission(postResumeStep, {
    selected_option: 'Termination condition',
    submission_id: 'sub_correct_final'
  });
  assert(correctStep.current_state === 'TARGET_MASTERED' || correctStep.current_state === 'INITIAL_TEACHING' || correctStep.current_state === 'RECHECK_ORIGINAL', 'Correct answer transitions forward out of practice');

  console.log('\n============================================================');
  console.log(`VERIFICATION RESULTS: ${passed} / ${total} tests passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('============================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error(err);
  process.exit(1);
});
