import { CodeSandbox } from '../server/exercise/codeSandbox';

async function runSandboxTests() {
  console.log('============================================================');
  console.log('RUNNING CODE SANDBOX TESTS');
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

  // 1. Correct functional execution
  const correctCode = `
    function add(a, b) {
      return a + b;
    }
  `;
  const res1 = await CodeSandbox.runTests(correctCode, [
    { name: 'Simple add', input: 'add(2, 3)', expected: '5' },
    { name: 'Negative add', input: 'add(-1, 1)', expected: '0' }
  ]);
  assert(res1.all_passed, 'Correct addition code passes all test cases');
  assert(res1.test_results.length === 2, 'Evaluated all 2 test cases');

  // 2. Incorrect functional execution
  const incorrectCode = `
    function add(a, b) {
      return a - b;
    }
  `;
  const res2 = await CodeSandbox.runTests(incorrectCode, [
    { name: 'Simple add', input: 'add(2, 3)', expected: '5' }
  ]);
  assert(!res2.all_passed, 'Incorrect subtraction code fails expected 5');
  assert(res2.test_results[0].passed === false, 'Individual test result marked failed');

  // 3. Syntax error handling
  const brokenCode = `function add(a, b) { return a + ; }`;
  const res3 = await CodeSandbox.runTests(brokenCode, [
    { name: 'Syntax test', input: 'add(1, 2)', expected: '3' }
  ]);
  assert(!res3.all_passed, 'Syntax error gracefully caught without throwing unhandled exception');
  assert(res3.execution_error !== undefined, 'Execution error recorded');

  // 4. Timeout / Infinite loop protection
  const infiniteLoopCode = `
    function loop() {
      while (true) {}
    }
  `;
  const res4 = await CodeSandbox.runTests(infiniteLoopCode, [
    { name: 'Infinite loop test', input: 'loop()', expected: '0' }
  ], 500); // 500ms timeout
  assert(!res4.all_passed, 'Infinite loop timed out and terminated safely');

  console.log(`\nSANDBOX RESULTS: ${passed} / ${total} tests passed\n`);
}

runSandboxTests().catch(console.error);
