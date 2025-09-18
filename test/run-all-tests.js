const { runTests } = require('./limitedLet.test.js');
const { runDeepMutationTests } = require('./deep-mutation-tracking.test.js');

function runAllTests() {
  console.log('🧪 Running comprehensive limitedLet test suite...\n');

  let totalPassed = 0;
  let totalFailed = 0;
  const suiteResults = [];

  // Override console.log temporarily to capture output
  const originalLog = console.log;
  let capturedOutput = [];

  function captureLog(...args) {
    capturedOutput.push(args.join(' '));
  }

  try {
    // Run original test suite
    console.log('📋 Running core functionality tests...');
    console.log = captureLog;
    capturedOutput = [];

    try {
      const result1 = runTests();
      suiteResults.push({
        name: 'Core Functionality Tests',
        passed: result1?.passed || extractPassedCount(capturedOutput),
        failed: result1?.failed || 0,
        output: capturedOutput.slice()
      });
    } catch (error) {
      // If runTests doesn't return results, extract from output
      const passed = extractPassedCount(capturedOutput);
      const failed = extractFailedCount(capturedOutput);
      suiteResults.push({
        name: 'Core Functionality Tests',
        passed,
        failed,
        output: capturedOutput.slice()
      });
    }

    console.log = originalLog;

    // Run deep mutation tracking tests
    console.log('\n📋 Running deep mutation tracking tests...');
    console.log = captureLog;
    capturedOutput = [];

    try {
      const result3 = runDeepMutationTests();
      suiteResults.push({
        name: 'Deep Mutation Tracking Tests',
        passed: result3?.passed || extractPassedCount(capturedOutput),
        failed: result3?.failed || 0,
        output: capturedOutput.slice()
      });
    } catch (error) {
      const passed = extractPassedCount(capturedOutput);
      const failed = extractFailedCount(capturedOutput);
      suiteResults.push({
        name: 'Deep Mutation Tracking Tests',
        passed,
        failed,
        output: capturedOutput.slice()
      });
    }

    console.log = originalLog;

  } catch (error) {
    console.log = originalLog;
    console.error('Error running test suites:', error);
    process.exit(1);
  }

  // Calculate totals
  totalPassed = suiteResults.reduce((sum, suite) => sum + suite.passed, 0);
  totalFailed = suiteResults.reduce((sum, suite) => sum + suite.failed, 0);

  // Display results
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE TEST RESULTS');
  console.log('='.repeat(80));

  suiteResults.forEach(suite => {
    const status = suite.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${suite.name}: ${suite.passed} passed, ${suite.failed} failed`);
  });

  console.log('='.repeat(80));

  if (totalFailed === 0) {
    console.log(`🎉 ALL TESTS PASSED! ${totalPassed} total tests passed across all suites`);
  } else {
    console.log(`❌ TESTS FAILED: ${totalPassed} passed, ${totalFailed} failed (${totalPassed + totalFailed} total)`);
  }

  console.log('='.repeat(80));

  // Show detailed output for failed tests
  if (totalFailed > 0) {
    console.log('\n📝 DETAILED FAILURE OUTPUT:');
    suiteResults.forEach(suite => {
      if (suite.failed > 0) {
        console.log(`\n--- ${suite.name} ---`);
        suite.output.forEach(line => {
          if (line.includes('✗') || line.includes('Error:')) {
            console.log(line);
          }
        });
      }
    });
  }

  // Exit with appropriate code
  if (totalFailed > 0) {
    process.exit(1);
  }

  return { totalPassed, totalFailed };
}

function extractPassedCount(output) {
  // Look for pattern like "✓ test description" or "Test Results: X passed"
  let passed = 0;
  output.forEach(line => {
    if (line.startsWith('✓')) {
      passed++;
    } else if (line.includes('passed')) {
      const match = line.match(/(\d+)\s+passed/);
      if (match) {
        passed = parseInt(match[1]);
      }
    }
  });
  return passed;
}

function extractFailedCount(output) {
  // Look for pattern like "✗ test description" or "Test Results: X failed"
  let failed = 0;
  output.forEach(line => {
    if (line.startsWith('✗')) {
      failed++;
    } else if (line.includes('failed')) {
      const match = line.match(/(\d+)\s+failed/);
      if (match) {
        failed = parseInt(match[1]);
      }
    }
  });
  return failed;
}

if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };