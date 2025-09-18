class MutationLimitExceeded extends Error {
  constructor(message, context) {
    super(message);
    this.name = 'MutationLimitExceeded';
    this.context = context;
  }
}

/**
 * Core implementation of limited mutable variables
 *
 * This class provides controlled mutability that sits between const and let:
 * - Tracks mutation attempts with detailed violation information
 * - Supports both strict mode (production) and non-strict mode (tracking/development)
 * - Implements semantic coupling between strictMode and autoFreeze options
 * - Provides comprehensive history tracking and callback system
 * - Uses private fields for true encapsulation and security
 *
 * Key architectural decisions:
 * - strictMode: false automatically disables autoFreeze for continued tracking
 * - Violation tracking works in both modes but behavior differs
 * - History includes both successful mutations and tracked violations
 * - Callbacks provide hooks for monitoring, logging, and behavioral analysis
 */
class LimitedVariable {
  // Core state
  #value;
  #maxMutations;
  #mutationCount = 0;
  #violationCount = 0;
  #history = [];
  #options;

  // Control flags
  #frozen = false;           // Manual or automatic freeze state
  #violated = false;         // Tracks if any violation occurred (for strict mode reading)
  #onViolationCalled = false; // Ensures onViolation callback called only once

  constructor(initialValue, maxMutations = 1, options = {}) {
    this.#value = initialValue;
    this.#maxMutations = maxMutations;
    this.#options = {
      trackHistory: true,
      strictMode: true,
      allowReset: false,
      autoFreeze: true,
      onMutate: null,
      onViolation: null,
      onLastMutation: null,
      onLimitExceeded: null,
      errorMessage: null,
      ...options
    };

    // Semantic coupling: Non-strict mode disables auto-freeze
    // This ensures violation tracking works as expected - when strictMode is false,
    // we want to continue tracking violations rather than freezing the variable
    if (!this.#options.strictMode) {
      this.#options.autoFreeze = false;
    }

    if (this.#options.trackHistory) {
      this.#history.push({
        value: initialValue,
        timestamp: Date.now(),
        mutation: 0,
        type: 'initial'
      });
    }
  }

  get value() {
    // In strict mode, once a violation has occurred, prevent further access
    // This enforces the "fail-fast" principle for production environments
    if (this.#options.strictMode && this.#violated) {
      throw new MutationLimitExceeded(
        'Cannot read value after mutation limit violation in strict mode',
        {
          maxMutations: this.#maxMutations,
          currentMutations: this.#mutationCount,
          frozen: this.#frozen
        }
      );
    }
    return this.#value;
  }

  set value(newValue) {
    if (this.#frozen) {
      this.#violated = true;  // Mark as violated for strict mode reading
      const message = this.#options.errorMessage ||
        `Variable is frozen. No more mutations allowed.`;
      const error = new MutationLimitExceeded(message, {
        maxMutations: this.#maxMutations,
        currentMutations: this.#mutationCount,
        attemptedValue: newValue,
        currentValue: this.#value,
        frozen: true
      });

      if (this.#options.onViolation && !this.#onViolationCalled) {
        this.#onViolationCalled = true;
        this.#options.onViolation(error);
      }

      if (this.#options.strictMode) {
        throw error;
      }
      return;
    }

    // Handle attempts to mutate beyond the allowed limit
    if (this.#mutationCount >= this.#maxMutations) {
      this.#violated = true;
      this.#violationCount++;

      // Create detailed violation attempt record for tracking/debugging
      const violationAttempt = {
        attemptNumber: this.#violationCount,
        attemptedValue: newValue,
        currentValue: this.#value,
        mutationCount: this.#mutationCount,
        violationCount: this.#violationCount,
        timestamp: Date.now(),
        totalAttempts: this.#mutationCount + this.#violationCount
      };

      // Always call onLimitExceeded callback if provided (both strict and non-strict modes)
      if (this.#options.onLimitExceeded) {
        this.#options.onLimitExceeded(violationAttempt);
      }

      // Strict mode: Block the violation and throw an error
      if (this.#options.strictMode) {
        const message = this.#options.errorMessage ||
          `Mutation limit exceeded. Maximum ${this.#maxMutations} mutation(s) allowed, attempted mutation #${this.#mutationCount + this.#violationCount}`;
        const error = new MutationLimitExceeded(message, {
          maxMutations: this.#maxMutations,
          currentMutations: this.#mutationCount,
          attemptedValue: newValue,
          currentValue: this.#value,
          history: this.#options.trackHistory ? this.#history : undefined
        });

        if (this.#options.onViolation && !this.#onViolationCalled) {
          this.#onViolationCalled = true;
          this.#options.onViolation(error);
        }
        throw error;
      }

      // Non-strict mode: Allow the violation but track it for behavioral analysis
      // This enables monitoring user behavior without blocking functionality
      if (!this.#options.strictMode) {
        const oldValue = this.#value;
        this.#value = newValue;

        // Record violation in history for comprehensive tracking
        if (this.#options.trackHistory) {
          this.#history.push({
            value: newValue,
            previousValue: oldValue,
            timestamp: Date.now(),
            mutation: this.#mutationCount,
            type: 'violation'  // Distinguishes from normal mutations
          });
        }
      }
      return;
    }

    const oldValue = this.#value;
    this.#value = newValue;
    this.#mutationCount++;

    if (this.#options.trackHistory) {
      this.#history.push({
        value: newValue,
        previousValue: oldValue,
        timestamp: Date.now(),
        mutation: this.#mutationCount,
        type: 'mutation'
      });
    }

    if (this.#options.onMutate) {
      this.#options.onMutate({
        newValue,
        oldValue,
        mutationCount: this.#mutationCount,
        remaining: this.remaining
      });
    }

    if (this.#mutationCount === this.#maxMutations) {
      if (this.#options.onLastMutation) {
        this.#options.onLastMutation({
          value: newValue,
          history: this.#options.trackHistory ? this.#history : undefined
        });
      }

      if (this.#options.autoFreeze) {
        this.#frozen = true;
      }
    }
  }

  get remaining() {
    return Math.max(0, this.#maxMutations - this.#mutationCount);
  }

  get history() {
    if (!this.#options.trackHistory) {
      throw new Error('History tracking is disabled. Enable it in options.');
    }
    return [...this.#history];
  }

  get mutationCount() {
    return this.#mutationCount;
  }

  get maxMutations() {
    return this.#maxMutations;
  }

  get violationCount() {
    return this.#violationCount;
  }

  isDepleted() {
    return this.#mutationCount >= this.#maxMutations;
  }

  isFrozen() {
    return this.#frozen;
  }

  freeze() {
    this.#frozen = true;
    return this;
  }

  reset() {
    if (!this.#options.allowReset) {
      throw new Error('Reset is disabled. Enable it with { allowReset: true } in options.');
    }

    this.#mutationCount = 0;
    this.#violationCount = 0;
    this.#frozen = false;
    this.#violated = false;
    this.#onViolationCalled = false;

    if (this.#options.trackHistory) {
      this.#history.push({
        value: this.#value,
        timestamp: Date.now(),
        mutation: 0,
        type: 'reset'
      });
    }

    return this;
  }

  toString() {
    return `LimitedVariable(value: ${this.#value}, remaining: ${this.remaining}/${this.#maxMutations})`;
  }

  toJSON() {
    return {
      value: this.#value,
      maxMutations: this.#maxMutations,
      mutationCount: this.#mutationCount,
      violationCount: this.#violationCount,
      remaining: this.remaining,
      frozen: this.#frozen,
      history: this.#options.trackHistory ? this.#history : undefined
    };
  }
}

/**
 * Creates a limited mutable variable with proxy-based interface
 *
 * The proxy handler creates a seamless variable-like interface that:
 * - Supports direct property access (obj.value, obj.remaining, etc.)
 * - Enables type coercion for arithmetic and string operations
 * - Maintains method binding for proper 'this' context
 * - Provides controlled access to all LimitedVariable functionality
 */
function limitedLet(initialValue, maxMutations = 1, options = {}) {
  const limitedVar = new LimitedVariable(initialValue, maxMutations, options);

  // Proxy handler to create natural variable-like interface
  const handler = {
    get(target, prop) {
      // Direct value access - most common operation
      if (prop === 'value') {
        return target.value;
      }
      // Enable type coercion: +variable, variable + 5, etc.
      if (prop === Symbol.toPrimitive || prop === 'valueOf') {
        return () => target.value;
      }
      // Enable string coercion: String(variable), `${variable}`, etc.
      if (prop === 'toString') {
        return () => String(target.value);
      }
      // Bind methods to maintain proper 'this' context
      if (typeof target[prop] === 'function') {
        return target[prop].bind(target);
      }
      // Direct property access: obj.remaining, obj.mutationCount, etc.
      return target[prop];
    },
    set(target, prop, value) {
      if (prop === 'value') {
        target.value = value;
        return true;
      }
      return false;
    },
    has(target, prop) {
      return prop in target;
    },
    ownKeys(target) {
      return ['value', 'remaining', 'history', 'mutationCount', 'violationCount', 'maxMutations',
              'isDepleted', 'isFrozen', 'freeze', 'reset', 'toString', 'toJSON'];
    },
    getOwnPropertyDescriptor(target, prop) {
      if (prop === 'value') {
        return {
          enumerable: true,
          configurable: true,
          get: () => target.value,
          set: (v) => target.value = v
        };
      }
      if (prop in target) {
        return {
          enumerable: true,
          configurable: true,
          value: target[prop]
        };
      }
    }
  };

  return new Proxy(limitedVar, handler);
}

module.exports = { limitedLet, LimitedVariable, MutationLimitExceeded };
module.exports.default = limitedLet;