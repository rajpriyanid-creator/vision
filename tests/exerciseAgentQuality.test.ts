/**
 * EXERCISE AGENT QUALITY & ROBUSTNESS TEST SUITE
 * Validates:
 * 1. Strategy & Blueprint Selection across phases, goals, levels, and misconceptions
 * 2. Answer-Key Consistency Validation (MCQ, Fill-in, Writing, Coding, Code Trace)
 * 3. Anti-Leakage Scanning (Catches prompt leakage, starter code leakage, private test leaks)
 * 4. Freshness & Anti-Duplication Signature Generation
 * 5. Quality Gate Evaluation & Bounded Auto-Repairs
 * 6. Public/Private Object Sanitization
 * 7. Assessment Generation End-to-End
 */

import { StrategySelector } from '../server/exercise/strategySelector';
import { AnswerKeyValidator } from '../server/exercise/answerKeyValidator';
import { LeakageGuard } from '../server/exercise/leakageGuard';
import { QuestionFreshness } from '../server/exercise/freshness';
import { ExerciseQualityGate } from '../server/exercise/qualityGate';
import { exerciseAgent } from '../server/agents/exerciseAgent';
import { Exercise, ExerciseAnswerKey } from '../server/models/contracts';

let passed = 0;
let total = 0;

function assert(condition: boolean, desc: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ ${desc}`);
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
  }
}

async function runTests() {
  console.log('--- RUNNING EXERCISE AGENT QUALITY TEST SUITE ---');

  // ==========================================
  // 1. STRATEGY & BLUEPRINT SELECTION TESTS
  // ==========================================
  console.log('\n[Suite 1: Strategy & Blueprint Selection]');

  const bpTieBreaker = StrategySelector.selectBlueprint({
    subject: 'Computer Science',
    target_concept: 'Stack',
    active_concept: 'stack',
    concept_title: 'Stack',
    phase_intent: 'TIE_BREAKER'
  });
  assert(bpTieBreaker.strategy === 'TIE_BREAKER', 'Selects TIE_BREAKER strategy for TIE_BREAKER phase intent');
  assert(bpTieBreaker.cognitive_demand === 'Discrimination', 'Selects Discrimination cognitive demand for tie breaker');

  const bpPrereqRecheck = StrategySelector.selectBlueprint({
    subject: 'Computer Science',
    target_concept: 'Binary Tree Inorder Traversal',
    active_concept: 'recursion',
    concept_title: 'Recursion',
    phase_intent: 'PREREQ_RECHECK',
    learner_level: 'intermediate'
  });
  assert(bpPrereqRecheck.strategy === 'PREREQUISITE_RECHECK', 'Selects PREREQUISITE_RECHECK strategy for PREREQ_RECHECK phase');
  assert(bpPrereqRecheck.difficulty_band === 'Foundational', 'Selects Foundational difficulty for prerequisite recheck');

  const bpMisconception = StrategySelector.selectBlueprint({
    subject: 'Computer Science',
    target_concept: 'Stack',
    active_concept: 'stack',
    concept_title: 'Stack',
    phase_intent: 'INITIAL_TARGET',
    latest_diagnosis: {
      category: 'MISCONCEPTION',
      confirmed_misconception: 'FIFO queue ordering assumed on stack'
    }
  });
  assert(
    bpMisconception.strategy === 'MISCONCEPTION_DISCRIMINATION',
    'Selects MISCONCEPTION_DISCRIMINATION strategy when diagnosis includes misconception'
  );
  assert(
    bpMisconception.target_misconception === 'FIFO queue ordering assumed on stack',
    'Captures target misconception in blueprint'
  );

  const bpRetest = StrategySelector.selectBlueprint({
    subject: 'Computer Science',
    target_concept: 'Binary Tree Inorder Traversal',
    active_concept: 'binary_tree_inorder_traversal',
    concept_title: 'Binary Tree Inorder Traversal',
    phase_intent: 'TARGET_RETEST',
    recent_formats: ['mcq']
  });
  assert(bpRetest.isomorphic_to_previous === true, 'Marks isomorphic_to_previous true on TARGET_RETEST');
  assert(bpRetest.format === 'short_answer', 'Varies format to short_answer when previous was mcq');

  // ==========================================
  // 2. ANSWER-KEY CONSISTENCY VALIDATOR
  // ==========================================
  console.log('\n[Suite 2: Answer-Key Consistency Validation]');

  const validMcqEx: Exercise = {
    exercise_id: 'ex_1',
    concept_id: 'stack',
    concept_title: 'Stack',
    format: 'mcq',
    prompt: 'What value is on top?',
    options: ['10', '20', '30', '40']
  };
  const validMcqKey: ExerciseAnswerKey = {
    exercise_id: 'ex_1',
    concept_id: 'stack',
    correct_option_id: 'A',
    canonical_answer: '10'
  };
  const validCheck = AnswerKeyValidator.validate(validMcqEx, validMcqKey, bpTieBreaker);
  assert(validCheck.is_consistent, 'Valid MCQ with matching canonical option passes consistency check');

  const invalidMcqKey: ExerciseAnswerKey = {
    exercise_id: 'ex_1',
    concept_id: 'stack',
    correct_option_id: 'A',
    canonical_answer: '999_NOT_IN_OPTIONS'
  };
  const invalidCheck = AnswerKeyValidator.validate(validMcqEx, invalidMcqKey, bpTieBreaker);
  assert(!invalidCheck.is_consistent, 'Rejects MCQ where canonical answer does not match any provided option');

  const dupOptionEx: Exercise = {
    exercise_id: 'ex_2',
    concept_id: 'stack',
    format: 'mcq',
    prompt: 'Question?',
    options: ['Option A', 'Option A', 'Option B', 'Option C']
  };
  const dupCheck = AnswerKeyValidator.validate(dupOptionEx, validMcqKey, bpTieBreaker);
  assert(!dupCheck.is_consistent, 'Rejects MCQ with duplicate options');

  // ==========================================
  // 3. LEAKAGE GUARD TESTS
  // ==========================================
  console.log('\n[Suite 3: Anti-Leakage Guard]');

  const cleanEx: Exercise = {
    exercise_id: 'ex_clean',
    concept_id: 'inorder',
    prompt: 'What is the inorder traversal of root 2 with children 1 and 3?',
    options: ['[1, 2, 3]', '[2, 1, 3]', '[3, 2, 1]']
  };
  const cleanKey: ExerciseAnswerKey = {
    exercise_id: 'ex_clean',
    concept_id: 'inorder',
    canonical_answer: '[1, 2, 3]',
    correct_option_id: 'A'
  };
  const cleanLeakage = LeakageGuard.check(cleanEx, cleanKey);
  assert(!cleanLeakage.has_leakage, 'Clean exercise passes leakage guard');

  const leakedPromptEx: Exercise = {
    exercise_id: 'ex_leaked',
    concept_id: 'recursion',
    prompt: 'Since the base case terminates recursion and returns without making further calls, explain what base case does.',
    options: ['A', 'B', 'C']
  };
  const leakedKey: ExerciseAnswerKey = {
    exercise_id: 'ex_leaked',
    concept_id: 'recursion',
    canonical_answer: 'terminates recursion and returns without making further calls'
  };
  const promptLeakCheck = LeakageGuard.check(leakedPromptEx, leakedKey);
  assert(promptLeakCheck.has_leakage, 'Catches verbatim canonical answer leakage inside question prompt');

  const leakedTestEx: Exercise = {
    exercise_id: 'ex_test_leak',
    concept_id: 'code',
    prompt: 'Write reverseList',
    test_cases: [{ name: 'Test 1', input: '[1, 2]', expected: '[2, 1]' }]
  };
  const testLeakCheck = LeakageGuard.check(leakedTestEx, cleanKey);
  assert(testLeakCheck.has_leakage, 'Catches private test expected values leaked into public exercise');

  const sanitized = LeakageGuard.sanitizePublicExercise(leakedTestEx);
  assert(!sanitized.test_cases, 'Sanitization strips test_cases from public object');

  // ==========================================
  // 4. FRESHNESS & SIGNATURE GENERATION
  // ==========================================
  console.log('\n[Suite 4: Question Freshness & Anti-Duplication]');

  const sig1 = QuestionFreshness.generateSignature('Given a tree with root 2, left 1, right 3, find inorder traversal.', 'mcq');
  const sig2 = QuestionFreshness.generateSignature('Given a tree with root 10, left 5, right 15, find inorder traversal.', 'mcq');
  assert(sig1 === sig2, 'Normalizes numeric isomorphic variations to identical structural signature for duplicate tracking');

  const sigDiff = QuestionFreshness.generateSignature('Explain how an electrochemical proton gradient drives ATP synthase.', 'mcq');
  assert(sig1 !== sigDiff, 'Differentiates distinct conceptual questions');

  // ==========================================
  // 5. QUALITY GATE EVALUATION & REPAIR
  // ==========================================
  console.log('\n[Suite 5: Exercise Quality Gate]');

  const qgResult = ExerciseQualityGate.evaluate(validMcqEx, validMcqKey, bpTieBreaker, []);
  assert(qgResult.status === 'PASS', 'Valid exercise and key receives PASS status from Quality Gate');
  assert(!qgResult.leakage_detected, 'Confirms no leakage detected in PASS exercise');

  const repaired = ExerciseQualityGate.repairExercise(
    {
      exercise_id: 'ex_rep',
      concept_id: 'stack',
      format: 'mcq',
      prompt: 'Prompt',
      options: ['Correct Answer', 'Wrong 1', 'Wrong 2', 'Wrong 3'],
      test_cases: [{ name: 't1', input: 'x', expected: 'y' }]
    },
    {
      exercise_id: 'ex_rep',
      concept_id: 'stack',
      canonical_answer: 'Correct Answer',
      correct_option_id: 'A',
      correct_option_index: 0
    }
  );
  assert(!repaired.exercise.test_cases, 'Repair automatically strips leaked test_cases from public exercise');
  assert(repaired.exercise.quality_status === 'REVISED', 'Sets quality_status to REVISED');

  // ==========================================
  // 6. END-TO-END ASSESSMENT GENERATION
  // ==========================================
  console.log('\n[Suite 6: End-to-End Exercise Agent]');

  const outcome = await exerciseAgent.generateAssessment({
    student_id: 'test_student',
    subject: 'Computer Science',
    target_concept: 'Stack',
    active_concept: 'stack',
    concept_title: 'Stack',
    phase_intent: 'INITIAL_TARGET',
    force_replay_mode: true
  });

  assert(Boolean(outcome.exercise), 'Generates public exercise artifact');
  assert(Boolean(outcome.answer_key), 'Generates private evaluator answer key');
  assert(Boolean(outcome.blueprint), 'Attaches exercise blueprint');
  assert(outcome.quality_result.status === 'PASS' || outcome.quality_result.status === 'REVISE', 'Passes Quality Gate review');
  assert(outcome.generation_mode === 'LIVE' || outcome.generation_mode === 'REPLAY', 'Reports valid generation mode');

  const prereqQuiz = await exerciseAgent.generatePrereqDiagnosticQuiz('recursion', 'Recursion', 'Computer Science');
  assert(prereqQuiz.questions.length === 2, 'Generates exactly 2-question prerequisite diagnostic quiz');
  assert(prereqQuiz.questions[0].options.length === 4, 'Quiz questions have 4 multiple choice options');

  console.log(`\n--- EXERCISE AGENT QUALITY TESTS COMPLETE: ${passed}/${total} PASSED ---`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
