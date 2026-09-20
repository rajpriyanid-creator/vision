import { GraphValidator } from '../server/validation/graphValidator';

async function runGraphTests() {
  console.log('============================================================');
  console.log('RUNNING GRAPH VALIDATOR TESTS');
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

  // 1. Valid DAG test
  const validDag = {
    c: ['b'],
    b: ['a'],
    a: []
  };
  const validRes = GraphValidator.validateDAG(validDag, 'c');
  assert(validRes.is_valid, 'Linear dependency graph is valid DAG');
  assert(!validRes.has_cycle, 'No cycle detected in valid DAG');

  // 2. Cycle Detection test
  const cyclicDag = {
    c: ['b'],
    b: ['a'],
    a: ['c'] // cycle: c -> b -> a -> c
  };
  const cyclicRes = GraphValidator.validateDAG(cyclicDag, 'c');
  assert(!cyclicRes.is_valid, 'Cyclic graph identified as invalid');
  assert(cyclicRes.has_cycle, 'Cycle detected in cyclic graph');
  assert(cyclicRes.cycle_nodes !== undefined && cyclicRes.cycle_nodes.length > 0, 'Returns cycle nodes');

  // 3. Reachability test
  const disconnectedDag = {
    target: ['prereq_1'],
    prereq_1: [],
    unrelated_node: []
  };
  const reachable = GraphValidator.getReachableAncestors(disconnectedDag, 'target');
  assert(reachable.has('prereq_1'), 'Direct prereq is reachable');
  assert(!reachable.has('unrelated_node'), 'Unrelated node is not in target ancestor subgraph');

  // 4. Hypothesis Edge Validation test
  const isValidEdge = GraphValidator.isValidPrerequisiteEdge(
    disconnectedDag,
    'target',
    'prereq_1'
  );
  assert(isValidEdge, 'Direct ancestor is a valid prerequisite edge');

  const isInvalidEdge = GraphValidator.isValidPrerequisiteEdge(
    disconnectedDag,
    'target',
    'unrelated_node'
  );
  assert(!isInvalidEdge, 'Unconnected node is rejected as a prerequisite edge');

  // 5. Self-loop Detection
  const selfLoopDag = {
    node_a: ['node_a']
  };
  const selfLoopRes = GraphValidator.validateDAG(selfLoopDag, 'node_a');
  assert(!selfLoopRes.is_valid && selfLoopRes.has_cycle, 'Self-loop detected and rejected');

  console.log(`\nGRAPH VALIDATOR RESULTS: ${passed} / ${total} tests passed\n`);
}

runGraphTests().catch(console.error);
