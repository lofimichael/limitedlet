const { limitedLet, LimitedVariable, MutationLimitExceeded } = require('../index');
const assert = require('assert');

function runTests() {
  let passed = 0;
  let failed = 0;

  function test(description, fn) {
    try {
      fn();
      console.log(`✓ ${description}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${description}`);
      console.log(`   Error: ${error.message}`);
      failed++;
    }
  }

  console.log('Running limitedLet tests...\n');

  test('Should create a limited variable with initial value', () => {
    const limited = limitedLet(42);
    assert.strictEqual(limited.value, 42);
  });

  test('Should allow mutations up to the limit', () => {
    const limited = limitedLet(0, 3);
    limited.value = 1;
    limited.value = 2;
    limited.value = 3;
    assert.strictEqual(limited.value, 3);
    assert.strictEqual(limited.mutationCount, 3);
  });

  test('Should throw when exceeding mutation limit', () => {
    const limited = limitedLet(0, 2);
    limited.value = 1;
    limited.value = 2;
    assert.throws(() => {
      limited.value = 3;
    }, MutationLimitExceeded);
  });

  test('Should track remaining mutations correctly', () => {
    const limited = limitedLet('test', 5);
    assert.strictEqual(limited.remaining, 5);
    limited.value = 'changed';
    assert.strictEqual(limited.remaining, 4);
  });

  test('Should track history when enabled', () => {
    const limited = limitedLet(10, 2, { trackHistory: true });
    limited.value = 20;
    limited.value = 30;
    const history = limited.history;
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].type, 'initial');
    assert.strictEqual(history[1].type, 'mutation');
    assert.strictEqual(history[2].value, 30);
  });

  test('Should call onMutate callback', () => {
    let callbackCalled = false;
    let eventData = null;
    const limited = limitedLet('start', 2, {
      onMutate: (event) => {
        callbackCalled = true;
        eventData = event;
      }
    });
    limited.value = 'end';
    assert.strictEqual(callbackCalled, true);
    assert.strictEqual(eventData.oldValue, 'start');
    assert.strictEqual(eventData.newValue, 'end');
  });

  test('Should call onLastMutation callback', () => {
    let lastMutationCalled = false;
    const limited = limitedLet(0, 2, {
      onLastMutation: () => {
        lastMutationCalled = true;
      }
    });
    limited.value = 1;
    assert.strictEqual(lastMutationCalled, false);
    limited.value = 2;
    assert.strictEqual(lastMutationCalled, true);
  });

  test('Should call onViolation callback', () => {
    let violationCalled = false;
    const limited = limitedLet(0, 1, {
      onViolation: () => {
        violationCalled = true;
      }
    });
    limited.value = 1;
    try {
      limited.value = 2;
    } catch (e) {}
    assert.strictEqual(violationCalled, true);
  });

  test('Should auto-freeze after last mutation', () => {
    const limited = limitedLet(0, 1, { autoFreeze: true });
    limited.value = 1;
    assert.strictEqual(limited.isFrozen(), true);
    assert.throws(() => {
      limited.value = 2;
    });
  });

  test('Should not auto-freeze when disabled', () => {
    const limited = limitedLet(0, 1, { autoFreeze: false });
    limited.value = 1;
    assert.strictEqual(limited.isFrozen(), false);
  });

  test('Should manually freeze variable', () => {
    const limited = limitedLet(0, 10);
    limited.value = 1;
    limited.freeze();
    assert.strictEqual(limited.isFrozen(), true);
    assert.throws(() => {
      limited.value = 2;
    });
  });

  test('Should reset when allowed', () => {
    const limited = limitedLet(0, 2, { allowReset: true });
    limited.value = 1;
    limited.value = 2;
    assert.strictEqual(limited.isDepleted(), true);
    limited.reset();
    assert.strictEqual(limited.isDepleted(), false);
    assert.strictEqual(limited.remaining, 2);
    limited.value = 3;
    assert.strictEqual(limited.value, 3);
  });

  test('Should throw when reset not allowed', () => {
    const limited = limitedLet(0, 1, { allowReset: false });
    assert.throws(() => {
      limited.reset();
    });
  });

  test('Should use custom error message', () => {
    const customMessage = 'No more changes allowed!';
    const limited = limitedLet(0, 1, { errorMessage: customMessage });
    limited.value = 1;
    try {
      limited.value = 2;
      assert.fail('Should have thrown');
    } catch (error) {
      assert.strictEqual(error.message, customMessage);
    }
  });

  test('Should work in strict mode', () => {
    const limited = limitedLet(0, 1, { strictMode: true });
    limited.value = 1;
    try {
      limited.value = 2;
    } catch (e) {}
    assert.throws(() => {
      const val = limited.value;
    }, /Cannot read value after mutation limit violation in strict mode/);
  });

  test('Should handle isDepleted correctly', () => {
    const limited = limitedLet(0, 2);
    assert.strictEqual(limited.isDepleted(), false);
    limited.value = 1;
    assert.strictEqual(limited.isDepleted(), false);
    limited.value = 2;
    assert.strictEqual(limited.isDepleted(), true);
  });

  test('Should support type coercion', () => {
    const limited = limitedLet(42, 3);
    assert.strictEqual(limited + 8, 50);
    assert.strictEqual(`Value: ${limited}`, 'Value: 42');
  });

  test('Should serialize to JSON', () => {
    const limited = limitedLet('test', 3);
    limited.value = 'changed';
    const json = limited.toJSON();
    assert.strictEqual(json.value, 'changed');
    assert.strictEqual(json.maxMutations, 3);
    assert.strictEqual(json.mutationCount, 1);
    assert.strictEqual(json.remaining, 2);
  });

  test('Should handle complex objects', () => {
    const obj = { count: 0, items: [] };
    const limited = limitedLet(obj, 2);
    limited.value = { count: 1, items: ['a'] };
    assert.deepStrictEqual(limited.value, { count: 1, items: ['a'] });
  });

  test('Should work with default single mutation', () => {
    const limited = limitedLet('once');
    limited.value = 'changed';
    assert.throws(() => {
      limited.value = 'again';
    });
  });

  test('Should support zero mutations (truly immutable)', () => {
    const immutable = limitedLet('constant', 0);

    // Reading should work before any violation attempts
    assert.strictEqual(immutable.value, 'constant');

    // Setting should throw
    assert.throws(() => {
      immutable.value = 'change';
    });

    // In strict mode, reading after violation is not allowed
    assert.throws(() => {
      immutable.value;
    }, /Cannot read value after mutation limit violation in strict mode/);
  });

  test('Should track mutation count accurately', () => {
    const limited = limitedLet(0, 5);
    assert.strictEqual(limited.mutationCount, 0);
    limited.value = 1;
    assert.strictEqual(limited.mutationCount, 1);
    limited.value = 2;
    assert.strictEqual(limited.mutationCount, 2);
  });

  test('Should provide context in error', () => {
    const limited = limitedLet(10, 1);
    limited.value = 20;
    try {
      limited.value = 30;
      assert.fail('Should have thrown');
    } catch (error) {
      assert.strictEqual(error.context.maxMutations, 1);
      assert.strictEqual(error.context.currentMutations, 1);
      assert.strictEqual(error.context.attemptedValue, 30);
      assert.strictEqual(error.context.currentValue, 20);
    }
  });

  test('Should disable history tracking when requested', () => {
    const limited = limitedLet(1, 2, { trackHistory: false });
    limited.value = 2;
    assert.throws(() => {
      const hist = limited.history;
    }, /History tracking is disabled/);
  });

  test('Should work with boolean values', () => {
    const boolVar = limitedLet(true, 2);
    assert.strictEqual(boolVar.value, true);
    boolVar.value = false;
    assert.strictEqual(boolVar.value, false);
    boolVar.value = true;
    assert.strictEqual(boolVar.value, true);
    assert.throws(() => {
      boolVar.value = false;
    });
  });

  test('Should work with null and undefined', () => {
    const nullVar = limitedLet(null, 1);
    nullVar.value = undefined;
    assert.strictEqual(nullVar.value, undefined);

    const undefinedVar = limitedLet(undefined, 1);
    undefinedVar.value = null;
    assert.strictEqual(undefinedVar.value, null);
  });

  test('Should handle array mutations', () => {
    const arrayVar = limitedLet([1, 2], 2);
    arrayVar.value = [3, 4];
    arrayVar.value = [5, 6, 7];
    assert.deepStrictEqual(arrayVar.value, [5, 6, 7]);
    assert.throws(() => {
      arrayVar.value = [8, 9];
    });
  });

  test('Should track timestamps in history', () => {
    const limited = limitedLet('test', 2, { trackHistory: true });
    const startTime = Date.now();
    limited.value = 'changed';
    const history = limited.history;
    assert.strictEqual(history.length, 2);
    assert(history[1].timestamp >= startTime);
    assert(history[1].timestamp <= Date.now());
  });

  test('Should use strictMode: true by default (enhanced behavior)', () => {
    const limited = limitedLet('test', 1);
    limited.value = 'changed';
    assert.throws(() => {
      limited.value = 'violation';
    });
  });

  test('Should allow violations in non-strict mode', () => {
    const limited = limitedLet('test', 1, { strictMode: false, autoFreeze: false });
    limited.value = 'changed';
    assert.strictEqual(limited.value, 'changed');

    // This should not throw in non-strict mode
    limited.value = 'violation';
    assert.strictEqual(limited.value, 'violation');
    assert.strictEqual(limited.violationCount, 1);
  });

  test('Should call onLimitExceeded callback on each violation attempt', () => {
    let violationAttempts = [];
    const limited = limitedLet('start', 2, {
      strictMode: false,
      autoFreeze: false,
      onLimitExceeded: (attempt) => {
        violationAttempts.push(attempt);
      }
    });

    limited.value = 'first';
    limited.value = 'second';

    // These should trigger onLimitExceeded
    limited.value = 'violation1';
    limited.value = 'violation2';

    assert.strictEqual(violationAttempts.length, 2);
    assert.strictEqual(violationAttempts[0].attemptNumber, 1);
    assert.strictEqual(violationAttempts[1].attemptNumber, 2);
    assert.strictEqual(violationAttempts[0].attemptedValue, 'violation1');
    assert.strictEqual(violationAttempts[1].attemptedValue, 'violation2');
  });

  test('Should track violation count accurately', () => {
    const limited = limitedLet('test', 1, { strictMode: false, autoFreeze: false });
    assert.strictEqual(limited.violationCount, 0);

    limited.value = 'changed';
    assert.strictEqual(limited.violationCount, 0);

    limited.value = 'violation1';
    assert.strictEqual(limited.violationCount, 1);

    limited.value = 'violation2';
    assert.strictEqual(limited.violationCount, 2);
  });

  test('Should include violationCount in toJSON output', () => {
    const limited = limitedLet('test', 1, { strictMode: false, autoFreeze: false });
    limited.value = 'changed';
    limited.value = 'violation';

    const json = limited.toJSON();
    assert.strictEqual(json.violationCount, 1);
    assert.strictEqual(json.mutationCount, 1);
  });

  test('Should reset violationCount when reset is called', () => {
    const limited = limitedLet('test', 1, {
      strictMode: false,
      autoFreeze: false,
      allowReset: true
    });

    limited.value = 'changed';
    limited.value = 'violation';
    assert.strictEqual(limited.violationCount, 1);

    limited.reset();
    assert.strictEqual(limited.violationCount, 0);
    assert.strictEqual(limited.mutationCount, 0);
  });

  test('Should track total attempts in violation callback', () => {
    let lastAttempt = null;
    const limited = limitedLet('start', 2, {
      strictMode: false,
      autoFreeze: false,
      onLimitExceeded: (attempt) => {
        lastAttempt = attempt;
      }
    });

    limited.value = 'first';   // mutation 1
    limited.value = 'second';  // mutation 2
    limited.value = 'third';   // violation 1

    assert.strictEqual(lastAttempt.mutationCount, 2);
    assert.strictEqual(lastAttempt.violationCount, 1);
    assert.strictEqual(lastAttempt.totalAttempts, 3);
  });

  test('Should maintain backward compatibility with existing options', () => {
    const limited = limitedLet('test', 1, {
      trackHistory: true,
      allowReset: true,
      autoFreeze: true,
      onMutate: () => {},
      onViolation: () => {},
      onLastMutation: () => {}
    });

    // Should work exactly as before
    limited.value = 'changed';
    assert.throws(() => {
      limited.value = 'violation';
    });
  });

  test('Should only call onViolation once per limit breach in strict mode', () => {
    let violationCallCount = 0;
    const limited = limitedLet('test', 1, {
      strictMode: true,
      onViolation: () => {
        violationCallCount++;
      }
    });

    limited.value = 'changed';

    // First violation should call onViolation
    try { limited.value = 'violation1'; } catch (e) {}
    assert.strictEqual(violationCallCount, 1);

    // Subsequent violations should not call onViolation again
    try { limited.value = 'violation2'; } catch (e) {}
    assert.strictEqual(violationCallCount, 1);
  });

  console.log('\n' + '='.repeat(50));
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = { runTests };