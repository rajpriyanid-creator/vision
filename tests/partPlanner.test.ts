import { PartPlanner } from '../server/curriculum/partPlanner';

async function runPartPlannerTests() {
  console.log('============================================================');
  console.log('RUNNING VISION N-PART CURRICULUM PLANNER TESTS');
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

  // 1. Stack 4-part roadmap generation
  const stackPlan = await PartPlanner.planCurriculum('Data Structures', 'Stack Operations', 4);
  assert(stackPlan.n_parts === 4, 'Generates exactly 4 parts for Stack');
  assert(stackPlan.parts.length === 4, 'Parts array contains 4 structured milestones');
  assert(Boolean(stackPlan.vision_statement), 'Contains clear overarching vision statement');
  assert(stackPlan.parts[0].status === 'in_progress', 'First part is initialized in_progress');
  assert(stackPlan.parts[1].status === 'upcoming', 'Subsequent parts are upcoming');

  // 2. Queue 3-part roadmap generation
  const queuePlan = await PartPlanner.planCurriculum('Data Structures', 'Queue (FIFO)', 3);
  assert(queuePlan.n_parts === 3, 'Generates requested 3 parts');
  assert(queuePlan.parts[0].title.toLowerCase().includes('fifo') || queuePlan.parts[0].title.toLowerCase().includes('foundation'), 'Part 1 focuses on FIFO foundations');

  // 3. Tree Traversal 5-part roadmap generation
  const treePlan = await PartPlanner.planCurriculum('Data Structures', 'Binary Tree Inorder Traversal', 4);
  assert(treePlan.parts.some(p => p.cognitive_demand.includes('Knowledge') || p.cognitive_demand.includes('Intuition')), 'Includes foundational cognitive demand');
  assert(treePlan.parts.some(p => p.cognitive_demand.includes('Synthesis')), 'Includes synthesis cognitive demand');

  console.log(`\nPART PLANNER RESULTS: ${passed} / ${total} tests passed\n`);
}

runPartPlannerTests().catch(console.error);
