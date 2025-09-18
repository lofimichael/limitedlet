const { limitedLet, MutationLimitExceeded } = require('../index');

console.log('limitedlet Demo Examples\n');
console.log('='.repeat(50));

console.log('\n1. Basic Usage');
console.log('-'.repeat(30));
const counter = limitedLet(0, 3);
console.log('Initial value:', counter.value);
console.log('Remaining mutations:', counter.remaining);

counter.value = 10;
console.log('After 1st mutation:', counter.value);
console.log('Remaining:', counter.remaining);

counter.value = 20;
console.log('After 2nd mutation:', counter.value);
console.log('Remaining:', counter.remaining);

counter.value = 30;
console.log('After 3rd mutation:', counter.value);
console.log('Remaining:', counter.remaining);
console.log('Is depleted?', counter.isDepleted());

try {
  counter.value = 40;
} catch (error) {
  console.log('Error on 4th mutation:', error.message);
}

console.log('\n2. Single Mutation (const-like behavior)');
console.log('-'.repeat(30));
const almostConst = limitedLet('initial');
console.log('Value:', almostConst.value);
almostConst.value = 'changed once';
console.log('Changed to:', almostConst.value);
try {
  almostConst.value = 'try again';
} catch (error) {
  console.log('Cannot change again:', error.message);
}

console.log('\n3. History Tracking');
console.log('-'.repeat(30));
const tracked = limitedLet(100, 2, { trackHistory: true });
tracked.value = 200;
tracked.value = 300;
console.log('History:', JSON.stringify(tracked.history, null, 2));

console.log('\n4. Mutation Callbacks');
console.log('-'.repeat(30));
const withCallbacks = limitedLet('start', 3, {
  onMutate: (event) => {
    console.log(`  Mutated from "${event.oldValue}" to "${event.newValue}" (${event.remaining} left)`);
  },
  onLastMutation: (event) => {
    console.log(`  Last mutation! Final value: "${event.value}"`);
  },
  onViolation: (error) => {
    console.log(`  Violation handler: ${error.message}`);
  }
});

withCallbacks.value = 'first';
withCallbacks.value = 'second';
withCallbacks.value = 'third';
try {
  withCallbacks.value = 'fourth';
} catch (error) {
  // Error already handled by onViolation
}

console.log('\n5. Reset Capability');
console.log('-'.repeat(30));
const resettable = limitedLet(1, 2, { allowReset: true });
resettable.value = 2;
resettable.value = 3;
console.log('Depleted?', resettable.isDepleted());
resettable.reset();
console.log('After reset, remaining:', resettable.remaining);
resettable.value = 4;
console.log('Can mutate again:', resettable.value);

console.log('\n6. Manual Freeze');
console.log('-'.repeat(30));
const freezable = limitedLet('water', 5);
freezable.value = 'ice';
console.log('Before freeze:', freezable.value, '| Remaining:', freezable.remaining);
freezable.freeze();
console.log('Is frozen?', freezable.isFrozen());
try {
  freezable.value = 'steam';
} catch (error) {
  console.log('Cannot mutate frozen variable:', error.message);
}

console.log('\n7. Custom Error Messages');
console.log('-'.repeat(30));
const customError = limitedLet(42, 1, {
  errorMessage: 'Custom error: This variable has reached its mutation limit!'
});
customError.value = 84;
try {
  customError.value = 126;
} catch (error) {
  console.log(error.message);
}

console.log('\n8. Strict Mode');
console.log('-'.repeat(30));
const strict = limitedLet('readable', 1, { strictMode: true });
strict.value = 'modified';
try {
  strict.value = 'violation';
} catch (error) {
  console.log('Mutation blocked');
}
try {
  console.log('Trying to read after violation:', strict.value);
} catch (error) {
  console.log('Cannot even read in strict mode:', error.message);
}

console.log('\n9. Complex Objects');
console.log('-'.repeat(30));
const complexData = limitedLet({ count: 0, items: [] }, 2);
console.log('Initial:', complexData.value);

complexData.value = { count: 1, items: ['first'] };
console.log('After 1st:', complexData.value);

complexData.value = { count: 2, items: ['first', 'second'] };
console.log('After 2nd:', complexData.value);
console.log('Depleted?', complexData.isDepleted());

console.log('\n10. Type Coercion');
console.log('-'.repeat(30));
const coercible = limitedLet(100, 3);
console.log('String concat: "Value is " + coercible =', "Value is " + coercible);
console.log('Math operation: coercible * 2 =', coercible * 2);
console.log('toString():', coercible.toString());
console.log('toJSON():', JSON.stringify(coercible.toJSON(), null, 2));

console.log('\n11. Zero Mutations (Truly Immutable)');
console.log('-'.repeat(30));
const immutable = limitedLet('constant', 0);
console.log('Value:', immutable.value);
try {
  immutable.value = 'attempt change';
} catch (error) {
  console.log('Cannot mutate:', error.message);
}

console.log('\n12. Error Context Information');
console.log('-'.repeat(30));
const contextDemo = limitedLet('start', 1);
contextDemo.value = 'end';
try {
  contextDemo.value = 'violation';
} catch (error) {
  console.log('Error context:', JSON.stringify(error.context, null, 2));
}

console.log('\n13. Enhanced Strict Mode (Default Behavior)');
console.log('-'.repeat(30));
const strictVar = limitedLet('production', 2);  // strictMode: true by default
strictVar.value = 'v1.0';
strictVar.value = 'v1.1';
console.log('Final value:', strictVar.value);
console.log('Violations:', strictVar.violationCount);
try {
  strictVar.value = 'v1.2';  // This will throw
} catch (error) {
  console.log('Strict mode blocks violation:', error.message);
}

console.log('\n14. Non-Strict Mode (Tracking)');
console.log('-'.repeat(30));
const trackingVar = limitedLet('config', 2, {
  strictMode: false,  // Allow violations for tracking (autoFreeze automatically disabled)
  onLimitExceeded: (attempt) => {
    console.log(`  Tracking: Violation #${attempt.attemptNumber} - tried to set "${attempt.attemptedValue}"`);
    console.log(`  Total attempts: ${attempt.totalAttempts} (${attempt.mutationCount} successful, ${attempt.violationCount} violations)`);
  }
});

trackingVar.value = 'setting1';
trackingVar.value = 'setting2';
console.log('Value after limit reached:', trackingVar.value);

// These violations are tracked but don't throw errors
trackingVar.value = 'violation1';
trackingVar.value = 'violation2';
console.log('Final value after violations:', trackingVar.value);
console.log('Violation count:', trackingVar.violationCount);

console.log('\n15. Granular Violation Tracking');
console.log('-'.repeat(30));
let violationLog = [];
const granularTracked = limitedLet('data', 1, {
  strictMode: false,
  autoFreeze: false,
  trackHistory: true,
  onMutate: (event) => {
    console.log(`  Valid mutation: ${event.oldValue} → ${event.newValue}`);
  },
  onLimitExceeded: (attempt) => {
    violationLog.push({
      attempt: attempt.attemptNumber,
      value: attempt.attemptedValue,
      timestamp: new Date(attempt.timestamp).toISOString()
    });
    console.log(`  Violation tracked: attempt #${attempt.attemptNumber}`);
  }
});

granularTracked.value = 'legitimate';  // This is within limit
granularTracked.value = 'overflow1';   // This and below are violations
granularTracked.value = 'overflow2';
granularTracked.value = 'overflow3';

console.log('Violation log:', JSON.stringify(violationLog, null, 2));
console.log('History includes violations:', granularTracked.history.map(h => ({ value: h.value, type: h.type })));

console.log('\n16. Production vs Development Modes');
console.log('-'.repeat(30));

// Production mode: strict enforcement
const prodVar = limitedLet('feature', 1, {
  strictMode: true,  // Recommended for production
  onViolation: (error) => {
    console.log('  Production error logged:', error.message.substring(0, 50) + '...');
  }
});

// Development/Tracking mode: monitoring without errors
const devVar = limitedLet('feature', 1, {
  strictMode: false,  // For development/tracking (autoFreeze automatically disabled)
  onLimitExceeded: (attempt) => {
    console.log(`  Dev tracking: exceeded limit ${attempt.attemptNumber} times`);
  }
});

prodVar.value = 'enabled';
devVar.value = 'enabled';

console.log('Production mode:');
try {
  prodVar.value = 'changed';
} catch (e) {
  console.log('  Blocked in production');
}

console.log('Development mode:');
devVar.value = 'changed';  // Allowed for tracking
console.log('  Allowed in development, violation count:', devVar.violationCount);

console.log('\n' + '='.repeat(50));
console.log('Demo complete. limitedlet provides controlled mutability for JavaScript.');
console.log('='.repeat(50));