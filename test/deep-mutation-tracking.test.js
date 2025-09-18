const { limitedLet, LimitedVariable, MutationLimitExceeded } = require('../index');
const assert = require('assert');

function runDeepMutationTests() {
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

  console.log('Running deep mutation tracking tests...\n');

  // === ARRAY MUTATION TRACKING TESTS ===

  test('inventory.push() SHOULD now trigger mutation (NEW BEHAVIOR)', () => {
    const inventory = limitedLet(['sword', 'shield'], 3);

    // Initial state
    assert.strictEqual(inventory.mutationCount, 0);
    assert.strictEqual(inventory.remaining, 3);
    assert.deepStrictEqual(inventory.value, ['sword', 'shield']);

    // Modify array using push() - should NOW trigger mutation
    inventory.value.push('potion');

    // Mutation count should now be 1 (NEW BEHAVIOR)
    assert.strictEqual(inventory.mutationCount, 1);
    assert.strictEqual(inventory.remaining, 2);
    assert.deepStrictEqual(inventory.value, ['sword', 'shield', 'potion']);
  });

  test('inventory.push() should count against mutation limit', () => {
    const inventory = limitedLet(['sword'], 1); // Only 1 mutation allowed

    // Use up the mutation with push
    inventory.value.push('shield');
    assert.strictEqual(inventory.mutationCount, 1);
    assert.strictEqual(inventory.remaining, 0);

    // Next push should throw
    assert.throws(() => {
      inventory.value.push('potion');
    }, MutationLimitExceeded);
  });

  test('Multiple array methods should each count as mutations', () => {
    const inventory = limitedLet(['sword'], 5);

    inventory.value.push('shield');     // mutation 1
    assert.strictEqual(inventory.mutationCount, 1);

    inventory.value.push('potion');     // mutation 2
    assert.strictEqual(inventory.mutationCount, 2);

    inventory.value.pop();              // mutation 3
    assert.strictEqual(inventory.mutationCount, 3);

    inventory.value.unshift('bow');     // mutation 4
    assert.strictEqual(inventory.mutationCount, 4);

    inventory.value.splice(1, 1);       // mutation 5
    assert.strictEqual(inventory.mutationCount, 5);

    assert.strictEqual(inventory.remaining, 0);
    assert.strictEqual(inventory.isDepleted(), true);
  });

  test('Array index assignment should count as mutation', () => {
    const inventory = limitedLet(['sword', 'shield'], 2);

    assert.strictEqual(inventory.mutationCount, 0);

    // Modify array by index - should NOW trigger mutation
    inventory.value[0] = 'magic sword';

    assert.strictEqual(inventory.mutationCount, 1);
    assert.strictEqual(inventory.remaining, 1);
    assert.deepStrictEqual(inventory.value, ['magic sword', 'shield']);
  });

  // === OBJECT PROPERTY TRACKING TESTS ===

  test('Object property assignment SHOULD now trigger mutation', () => {
    const player = limitedLet({ name: 'Hero', level: 1, hp: 100 }, 3);

    assert.strictEqual(player.mutationCount, 0);

    // Modify object properties - should NOW trigger mutations
    player.value.level = 5;
    assert.strictEqual(player.mutationCount, 1);

    player.value.hp = 150;
    assert.strictEqual(player.mutationCount, 2);

    player.value.name = 'Super Hero';
    assert.strictEqual(player.mutationCount, 3);

    assert.strictEqual(player.remaining, 0);
    assert.deepStrictEqual(player.value, { name: 'Super Hero', level: 5, hp: 150 });
  });

  test('Adding new object properties should count as mutations', () => {
    const player = limitedLet({ name: 'Hero' }, 3);

    assert.strictEqual(player.mutationCount, 0);

    // Add new properties - should NOW trigger mutations
    player.value.level = 1;
    assert.strictEqual(player.mutationCount, 1);

    player.value.inventory = ['sword'];
    assert.strictEqual(player.mutationCount, 2);

    player.value.stats = { strength: 10, agility: 8 };
    assert.strictEqual(player.mutationCount, 3);

    assert.strictEqual(player.remaining, 0);
  });

  test('Deleting object properties should count as mutations', () => {
    const player = limitedLet({ name: 'Hero', level: 1, temp: 'delete me' }, 2);

    assert.strictEqual(player.mutationCount, 0);

    // Delete property - should NOW trigger mutation
    delete player.value.temp;

    assert.strictEqual(player.mutationCount, 1);
    assert.strictEqual(player.remaining, 1);
    assert.strictEqual(player.value.temp, undefined);
    assert.strictEqual('temp' in player.value, false);
  });

  // === NESTED OBJECT TESTS ===

  test('Nested object modifications should count as mutations', () => {
    const game = limitedLet({
      player: { name: 'Hero', stats: { hp: 100, mp: 50 } },
      world: { level: 1, enemies: ['goblin'] }
    }, 5);

    assert.strictEqual(game.mutationCount, 0);

    // Modify nested properties - should NOW trigger mutations
    game.value.player.name = 'Super Hero';
    assert.strictEqual(game.mutationCount, 1);

    game.value.player.stats.hp = 200;
    assert.strictEqual(game.mutationCount, 2);

    game.value.world.enemies.push('orc');
    assert.strictEqual(game.mutationCount, 3);

    game.value.world.level = 2;
    assert.strictEqual(game.mutationCount, 4);

    assert.strictEqual(game.remaining, 1);
  });

  // === ERROR MESSAGE TESTS ===

  test('Error messages should include mutation path', () => {
    const player = limitedLet({ stats: { hp: 100 } }, 1);

    // Use up the mutation
    player.value.stats.hp = 150;
    assert.strictEqual(player.mutationCount, 1);

    // Next mutation should throw with path info
    try {
      player.value.stats.mp = 50;
      assert.fail('Should have thrown');
    } catch (error) {
      assert(error.message.includes('stats.mp'));
      assert.strictEqual(error.context.mutationPath, 'stats.mp');
      assert.strictEqual(error.context.mutationType, 'property');
    }
  });

  test('Array method errors should include method info', () => {
    const inventory = limitedLet(['sword'], 1);

    // Use up the mutation
    inventory.value.push('shield');
    assert.strictEqual(inventory.mutationCount, 1);

    // Next array method should throw with method info
    try {
      inventory.value.push('potion');
      assert.fail('Should have thrown');
    } catch (error) {
      assert(error.message.includes('push()'));
      assert.strictEqual(error.context.mutationPath, 'push()');
      assert.strictEqual(error.context.mutationType, 'array-method');
    }
  });

  // === COMPARISON WITH FULL VALUE REPLACEMENT ===

  test('Both deep mutations and full replacements count toward limit', () => {
    const data = limitedLet({ count: 0, items: [] }, 3);

    // Deep mutation (should count as 1)
    data.value.count = 5;
    assert.strictEqual(data.mutationCount, 1);

    // Another deep mutation (should count as 2)
    data.value.items.push('item1');
    assert.strictEqual(data.mutationCount, 2);

    // Full replacement (should count as 3)
    data.value = { count: 10, items: ['new1', 'new2'] };
    assert.strictEqual(data.mutationCount, 3);

    assert.strictEqual(data.remaining, 0);
    assert.strictEqual(data.isDepleted(), true);
  });

  // === HISTORY TRACKING TESTS ===

  test('History should track deep mutations with paths', () => {
    const player = limitedLet({ level: 1 }, 2, { trackHistory: true });

    player.value.level = 5;
    const history = player.history;

    assert.strictEqual(history.length, 2); // initial + mutation
    assert.strictEqual(history[1].type, 'deep-mutation');
    assert.strictEqual(history[1].mutationPath, 'level');
    assert.strictEqual(history[1].mutationType, 'property');
    assert.strictEqual(history[1].value, 5);
    assert.strictEqual(history[1].previousValue, 1);
  });

  // === CALLBACK TESTS ===

  test('onMutate callback should receive path information', () => {
    let mutationEvent = null;
    const player = limitedLet({ hp: 100 }, 2, {
      onMutate: (event) => {
        mutationEvent = event;
      }
    });

    player.value.hp = 150;

    assert(mutationEvent !== null);
    assert.strictEqual(mutationEvent.mutationPath, 'hp');
    assert.strictEqual(mutationEvent.mutationType, 'property');
    assert.strictEqual(mutationEvent.newValue, 150);
    assert.strictEqual(mutationEvent.oldValue, 100);
  });

  // === OPT-OUT BEHAVIOR TEST ===

  test('trackDeepMutations: false should restore old behavior', () => {
    const inventory = limitedLet(['sword'], 3, { trackDeepMutations: false });

    // Property modifications should NOT count when disabled
    inventory.value.push('shield');
    inventory.value.push('potion');
    inventory.value[0] = 'magic sword';

    assert.strictEqual(inventory.mutationCount, 0);
    assert.strictEqual(inventory.remaining, 3);

    // Full replacement should still count
    inventory.value = ['completely', 'new', 'array'];
    assert.strictEqual(inventory.mutationCount, 1);
    assert.strictEqual(inventory.remaining, 2);
  });

  // === RESET TESTS ===

  test('Reset should work properly with deep proxies', () => {
    const player = limitedLet({ level: 1 }, 2, { allowReset: true });

    // Make a deep mutation
    player.value.level = 5;
    assert.strictEqual(player.mutationCount, 1);

    // Reset
    player.reset();
    assert.strictEqual(player.mutationCount, 0);
    assert.strictEqual(player.remaining, 2);

    // Should be able to make mutations again
    player.value.level = 10;
    assert.strictEqual(player.mutationCount, 1);
    assert.strictEqual(player.value.level, 10);
  });

  // === EDGE CASE TESTS ===

  test('Special objects should not be wrapped in proxies', () => {
    const date = new Date();
    const regex = /test/;
    const error = new Error('test');

    const container = limitedLet({ date, regex, error }, 5);

    // These should not trigger proxy wrapping errors
    container.value.date = new Date();
    container.value.regex = /new/;
    container.value.error = new Error('new');

    assert.strictEqual(container.mutationCount, 3);
  });

  test('Circular references should be handled safely', () => {
    const obj1 = { name: 'obj1' };
    const obj2 = { name: 'obj2', ref: obj1 };
    obj1.ref = obj2; // Create circular reference

    const container = limitedLet({ data: obj1 }, 3);

    // Should not cause infinite recursion
    container.value.data.name = 'modified';
    assert.strictEqual(container.mutationCount, 1);

    container.value.data.ref.name = 'modified2';
    assert.strictEqual(container.mutationCount, 2);
  });

  console.log('\n' + '='.repeat(70));
  console.log(`Deep Mutation Tracking Test Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }

  return { passed, failed };
}

if (require.main === module) {
  runDeepMutationTests();
}

module.exports = { runDeepMutationTests };