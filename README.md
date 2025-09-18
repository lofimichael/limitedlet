# 🔒 limitedlet

> **Limited mutable variables for JavaScript and TypeScript** — because sometimes you need more safety than `let` but less than `const`

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-zero-green.svg)](package.json)
[![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![ES6+](https://img.shields.io/badge/ES-6%2B-orange.svg)](https://kangax.github.io/compat-table/es6/)

## 🚀 Quick Start

```bash
npm install limitedlet
```

```javascript
import { limitedLet } from 'limitedlet';

// Create a variable that can only be changed 3 times
const apiCalls = limitedLet(0, 3);

apiCalls.value = 1;   // ✅ First mutation
apiCalls.value = 2;   // ✅ Second mutation
apiCalls.value = 3;   // ✅ Third mutation
apiCalls.value = 4;   // ❌ Throws MutationLimitExceeded
```

## 📖 Table of Contents

- [🎯 Concept](#-concept)
- [💡 At a Glance](#-at-a-glance)
- [📚 API Reference](#-api-reference)
- [🔧 TypeScript Support](#-typescript-support)
- [🌟 Real-World Examples](#-real-world-examples)
  - [🔗 URL Redirects](#-url-redirects)
  - [💬 Modal Dialogs](#-modal-dialogs)
  - [🎮 Game Mechanics](#-game-mechanics)
  - [🚦 API Rate Limiting](#-api-rate-limiting)
- [⏰ Variable History & Time Travel](#-variable-history--time-travel)
- [⚙️ Configuration](#%EF%B8%8F-configuration)
- [🏗️ Advanced Patterns](#%EF%B8%8F-advanced-patterns)
- [🧪 Testing Patterns](#-testing-patterns)
- [⚡ Performance](#-performance)

## 🎯 Concept

Think of `limitedlet` as the missing piece between `const` and `let`:

| Type | Mutations Allowed | Use Case |
|------|-------------------|----------|
| `const` | 0 | Truly immutable values |
| `limitedlet` | **n** | Controlled mutability |
| `let` | ∞ | Unrestricted changes |

Perfect for scenarios where you need:
- **Controlled state changes** (configuration updates)
- **Usage quotas** (API calls, retries, power-ups)
- **Behavioral tracking** (user interaction patterns)
- **Gradual migrations** (feature rollouts with safety nets)

## 💡 At a Glance

```javascript
import { limitedLet } from 'limitedlet';

// 🎯 Basic usage - single mutation allowed (default)
const setting = limitedLet('initial');
setting.value = 'updated';     // ✅
setting.value = 'again';       // ❌ Error

// 🔢 Multiple mutations with tracking
const counter = limitedLet(0, 5, {
  onMutate: ({ oldValue, newValue, remaining }) => {
    console.log(`${oldValue} → ${newValue}, ${remaining} left`);
  }
});

// 📊 Non-strict mode for behavioral analysis
const tracker = limitedLet('data', 2, {
  strictMode: false,  // Don't throw errors, just track
  onLimitExceeded: (attempt) => {
    analytics.track('quota_exceeded', {
      value: attempt.attemptedValue,
      attempt: attempt.attemptNumber
    });
  }
});

// 🎮 Complex objects and arrays
const gameState = limitedLet({ level: 1, lives: 3 }, 10);
const inventory = limitedLet(['sword'], 5);
```

## 📚 API Reference

### `limitedLet(initialValue, maxMutations?, options?)`

Creates a limited mutable variable with powerful tracking and control features.

#### Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `initialValue` | `T` | - | Initial value of any type |
| `maxMutations` | `number` | `1` | Maximum allowed mutations |
| `options` | `LimitedLetOptions<T>` | `{}` | Configuration object |

#### Options

```typescript
interface LimitedLetOptions<T> {
  trackHistory?: boolean;         // Track all mutations (default: true)
  strictMode?: boolean;           // Throw errors on violations (default: true)
  allowReset?: boolean;           // Allow resetting mutation count (default: false)
  autoFreeze?: boolean;           // Auto-freeze after last mutation (default: true)
  onMutate?: (event: MutationEvent<T>) => void;      // Called on each mutation
  onLastMutation?: (event: LastMutationEvent<T>) => void;  // Called on final mutation
  onViolation?: (error: MutationLimitExceeded) => void;    // Called on first violation
  onLimitExceeded?: (attempt: ViolationAttempt<T>) => void; // Called on each violation attempt
  errorMessage?: string;          // Custom error message
}
```

#### Properties & Methods

```javascript
// Properties (read-only)
variable.value           // Current value (get/set)
variable.remaining       // Mutations remaining
variable.mutationCount   // Successful mutations made
variable.violationCount  // Violation attempts (non-strict mode)
variable.maxMutations    // Maximum allowed mutations
variable.history         // Array of all changes (if tracking enabled)

// Methods
variable.isDepleted()    // true if all mutations used
variable.isFrozen()      // true if manually or auto-frozen
variable.freeze()        // Manually freeze variable
variable.reset()         // Reset mutation counter (if allowed)
variable.toString()      // String representation
variable.toJSON()        // JSON serialization
```

## 🔧 TypeScript Support

First-class TypeScript support with full generic inference:

```typescript
// ✨ Basic typed variables
const count = limitedLet<number>(0, 5);
const message = limitedLet<string>('hello', 3);
const flag = limitedLet<boolean>(true, 2);

// 🏗️ Complex interfaces
interface UserConfig {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
}

const config = limitedLet<UserConfig>({
  theme: 'light',
  language: 'en',
  notifications: true
}, 3);

// 🎯 Type-safe callbacks
const tracker = limitedLet<number>(0, 5, {
  onMutate: (event: MutationEvent<number>) => {
    // event.oldValue and event.newValue are typed as number
    console.log(`Changed from ${event.oldValue} to ${event.newValue}`);
  },
  onLimitExceeded: (attempt: ViolationAttempt<number>) => {
    // attempt.attemptedValue is typed as number
    logAnalytics('limit_exceeded', attempt.attemptedValue);
  }
});

// 🔄 Union types
type Status = 'idle' | 'loading' | 'success' | 'error';
const status = limitedLet<Status>('idle', 3);

// 📦 Array types
const items = limitedLet<string[]>(['initial'], 10);
items.value = ['updated', 'array'];

// 🎛️ React integration
import { useState, useRef } from 'react';

function useLimitedState<T>(
  initialValue: T,
  maxMutations: number,
  options?: LimitedLetOptions<T>
) {
  const limitedRef = useRef<LimitedVariableProxy<T>>();
  const [, forceUpdate] = useState({});

  if (!limitedRef.current) {
    limitedRef.current = limitedLet(initialValue, maxMutations, {
      ...options,
      onMutate: () => forceUpdate({})
    });
  }

  return limitedRef.current;
}
```

## 🌟 Real-World Examples

### 🔗 URL Redirects

Limit login attempts, then redirect to help:

```javascript
const loginAttempts = limitedLet(0, 3, {
  onLastMutation: () => {
    showMessage('Final login attempt - please be careful!');
  },
  onLimitExceeded: () => {
    // Redirect to help after 3 failed attempts
    window.location.href = '/forgot-password';
  }
});

async function handleLogin(credentials) {
  try {
    await authenticateUser(credentials);
    window.location.href = '/dashboard';
  } catch (error) {
    loginAttempts.value += 1;
    showError(`Login failed. ${loginAttempts.remaining} attempts remaining.`);
  }
}
```

### 💬 Modal Dialogs

Show helpful hints, then disable after overuse:

```javascript
const hintDialogs = limitedLet(0, 3, {
  onMutate: ({ newValue, remaining }) => {
    showHintDialog(`Tip #${newValue}: ${getTip(newValue)}`);
    if (remaining === 0) {
      showMessage('No more hints available. Check our documentation!');
    }
  },
  onLimitExceeded: () => {
    // Open documentation in new tab
    window.open('/docs/getting-started', '_blank');
  }
});

function showHint() {
  if (hintDialogs.isDepleted()) {
    showMessage('All hints used. Opening documentation...');
    window.open('/docs', '_blank');
  } else {
    hintDialogs.value += 1;
  }
}
```

### 🎮 Game Mechanics

Power-ups with limited uses per level:

```javascript
const powerUps = limitedLet({ shields: 3, bombs: 2, speed: 1 }, 5, {
  onMutate: ({ newValue, remaining }) => {
    updateUI(newValue);
    if (remaining === 1) {
      showWarning('One power-up modification remaining!');
    }
  },
  onLastMutation: () => {
    achievement.unlock('POWER_MANAGER');
    showMessage('Power-up configuration locked for this level!');
  }
});

function upgradePowerUp(type) {
  if (!powerUps.isDepleted()) {
    powerUps.value = {
      ...powerUps.value,
      [type]: powerUps.value[type] + 1
    };
  } else {
    showMessage('Power-up upgrades locked! Complete level to reset.');
  }
}
```

### 🚦 API Rate Limiting

Smart API throttling with automatic fallbacks:

```javascript
const apiLimiter = limitedLet('ready', 10, {
  strictMode: false,  // Don't break the app
  onLimitExceeded: (attempt) => {
    // Switch to cached data after limit
    if (attempt.attemptNumber === 1) {
      showWarning('API limit reached. Using cached data.');
      enableCacheMode();
    }

    // Open docs after multiple violations
    if (attempt.attemptNumber >= 3) {
      window.open('/docs/api-limits', '_blank');
    }

    analytics.track('api_limit_exceeded', {
      endpoint: attempt.attemptedValue,
      total_attempts: attempt.totalAttempts
    });
  }
});

async function apiCall(endpoint) {
  if (!apiLimiter.isDepleted()) {
    apiLimiter.value = endpoint;
    return await fetch(endpoint);
  } else {
    // Use cached data or alternative approach
    return getCachedData(endpoint);
  }
}
```

## ⏰ Variable History & Time Travel

**If you're familiar with Redux time-traveling, this should suit you nicely!**

`limitedlet` provides comprehensive history tracking that captures every mutation, violation, and reset with timestamps and metadata. Perfect for debugging, analytics, undo/redo systems, and behavioral analysis.

### 🎯 Basic History Tracking

```javascript
const tracked = limitedLet('initial', 3, {
  trackHistory: true  // enabled by default
});

tracked.value = 'first';
tracked.value = 'second';
tracked.value = 'third';

console.log(tracked.history);
// [
//   { value: 'initial', timestamp: 1640995200000, mutation: 0, type: 'initial' },
//   { value: 'first', previousValue: 'initial', timestamp: 1640995201000, mutation: 1, type: 'mutation' },
//   { value: 'second', previousValue: 'first', timestamp: 1640995202000, mutation: 2, type: 'mutation' },
//   { value: 'third', previousValue: 'second', timestamp: 1640995203000, mutation: 3, type: 'mutation' }
// ]
```

### 🔄 Advanced History with Violations & Resets

```javascript
const complex = limitedLet('start', 2, {
  strictMode: false,  // Track violations without throwing
  allowReset: true,   // Enable reset capability
  trackHistory: true
});

complex.value = 'mutation1';
complex.value = 'mutation2';
complex.value = 'violation1';  // Tracked, not blocked
complex.reset();
complex.value = 'after-reset';

console.log(complex.history);
// [
//   { value: 'start', timestamp: ..., mutation: 0, type: 'initial' },
//   { value: 'mutation1', previousValue: 'start', mutation: 1, type: 'mutation' },
//   { value: 'mutation2', previousValue: 'mutation1', mutation: 2, type: 'mutation' },
//   { value: 'violation1', previousValue: 'mutation2', mutation: 2, type: 'violation' },
//   { value: 'violation1', timestamp: ..., mutation: 0, type: 'reset' },
//   { value: 'after-reset', previousValue: 'violation1', mutation: 1, type: 'mutation' }
// ]
```

### 🛠️ Practical Applications

#### Time-Travel Debugging
```javascript
const debugVar = limitedLet({ user: 'john', role: 'admin' }, 10, {
  trackHistory: true,
  onMutate: ({ newValue }) => {
    console.log('📝 State changed:', newValue);
    saveToDevTools(debugVar.history);
  }
});

// Later in development...
function timeTravel(stepBack = 1) {
  const history = debugVar.history;
  const targetState = history[history.length - 1 - stepBack];
  console.log('⏪ Time traveling to:', targetState);
  return targetState.value;
}
```

#### Undo/Redo System
```javascript
class UndoRedoManager {
  constructor(variable) {
    this.variable = variable;
    this.currentIndex = variable.history.length - 1;
  }

  undo() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      const prevState = this.variable.history[this.currentIndex];
      return prevState.value;
    }
    return null;
  }

  redo() {
    if (this.currentIndex < this.variable.history.length - 1) {
      this.currentIndex++;
      const nextState = this.variable.history[this.currentIndex];
      return nextState.value;
    }
    return null;
  }

  getTimeline() {
    return this.variable.history.map((entry, index) => ({
      ...entry,
      isCurrent: index === this.currentIndex,
      relativeTime: new Date(entry.timestamp).toLocaleTimeString()
    }));
  }
}

const document = limitedLet('Hello', 10, { trackHistory: true });
const undoRedo = new UndoRedoManager(document);

document.value = 'Hello World';
document.value = 'Hello World!';

console.log(undoRedo.undo());        // "Hello World"
console.log(undoRedo.undo());        // "Hello"
console.log(undoRedo.redo());        // "Hello World"
console.log(undoRedo.getTimeline()); // Full timeline with timestamps
```

#### User Behavior Analytics
```javascript
const userActions = limitedLet(0, 5, {
  strictMode: false,
  trackHistory: true,
  onLimitExceeded: (attempt) => {
    // Analyze user patterns from history
    const patterns = analyzeUserBehavior(userActions.history);

    analytics.track('user_behavior_analysis', {
      session_id: getSessionId(),
      total_attempts: attempt.totalAttempts,
      violation_frequency: patterns.violationFrequency,
      time_between_actions: patterns.averageTimeBetween,
      action_sequence: patterns.actionSequence
    });
  }
});

function analyzeUserBehavior(history) {
  const mutations = history.filter(h => h.type === 'mutation');
  const violations = history.filter(h => h.type === 'violation');

  return {
    violationFrequency: violations.length / mutations.length,
    averageTimeBetween: calculateAverageTimeBetween(history),
    actionSequence: history.map(h => ({ type: h.type, value: h.value })),
    peakUsageTime: findPeakUsageHours(history)
  };
}
```

#### React DevTools Integration
```javascript
// Custom React hook with history integration
function useTrackedState(initialValue, maxMutations = 5) {
  const [variable] = useState(() =>
    limitedLet(initialValue, maxMutations, {
      trackHistory: true,
      onMutate: (event) => {
        // Send to React DevTools
        if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
          window.__REACT_DEVTOOLS_GLOBAL_HOOK__.onCommitFiberRoot(
            null,
            { memoizedState: event.newValue, history: variable.history }
          );
        }
      }
    })
  );

  return {
    value: variable.value,
    setValue: (newValue) => variable.value = newValue,
    history: variable.history,
    timeTravel: (index) => variable.history[index]?.value
  };
}

// Usage in component
function MyComponent() {
  const state = useTrackedState({ count: 0, name: 'demo' }, 8);

  return (
    <div>
      <button onClick={() => state.setValue({...state.value, count: state.value.count + 1})}>
        Increment ({state.value.count})
      </button>

      {/* Show history in development */}
      {process.env.NODE_ENV === 'development' && (
        <details>
          <summary>History ({state.history.length} entries)</summary>
          <pre>{JSON.stringify(state.history, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}
```

### 📊 History Entry Types

Each history entry contains:

```typescript
interface HistoryEntry {
  value: any;                    // The value at this point
  previousValue?: any;           // Previous value (for mutations/violations)
  timestamp: number;             // When this change occurred
  mutation: number;              // Current mutation count at this point
  type: 'initial' | 'mutation' | 'reset' | 'violation';
}
```

- **`initial`**: The starting state when variable was created
- **`mutation`**: A valid change within the mutation limit
- **`reset`**: When the variable was reset (if `allowReset: true`)
- **`violation`**: An attempted change beyond the limit (if `strictMode: false`)

### ⚡ Performance Considerations

```javascript
// For production: disable history if not needed
const production = limitedLet(value, 10, {
  trackHistory: false  // Saves memory and improves performance
});

// For development: full tracking
const development = limitedLet(value, 10, {
  trackHistory: true,
  onMutate: (event) => console.log('🔄 Mutation:', event)
});
```

## ⚙️ Configuration

### Strict Mode vs Non-Strict Mode

Choose the right mode for your use case:

```javascript
// 🔒 Strict Mode (Production) - Default
const production = limitedLet('config', 3, {
  strictMode: true,           // Throws errors on violations
  onViolation: (error) => {
    logger.error('Config violation', error);
    alertAdmin(error.context);
  }
});

// 📊 Non-Strict Mode (Tracking/Development)
const development = limitedLet('feature', 3, {
  strictMode: false,          // Track violations without throwing
  onLimitExceeded: (attempt) => {
    analytics.track('feature_overuse', {
      value: attempt.attemptedValue,
      user_id: getCurrentUser().id,
      timestamp: attempt.timestamp
    });
  }
});
```

### Semantic Coupling

`limitedlet` automatically handles option conflicts:

```javascript
// When strictMode: false, autoFreeze is automatically disabled
const tracker = limitedLet('value', 2, {
  strictMode: false,    // autoFreeze becomes false automatically
  onLimitExceeded: (attempt) => {
    // This will continue to fire even after limit exceeded
    console.log(`Violation ${attempt.attemptNumber} tracked`);
  }
});

// Manual control (advanced usage)
const manual = limitedLet('value', 2, {
  strictMode: true,
  autoFreeze: false,    // Manually disable auto-freeze
});
```

## 🏗️ Advanced Patterns

### Immutable State (Zero Mutations)

Create truly immutable variables:

```javascript
const constant = limitedLet('IMMUTABLE', 0);
console.log(constant.value);  // "IMMUTABLE"
constant.value = 'change';    // ❌ Throws immediately

// Perfect for configuration that should never change
const API_KEY = limitedLet(process.env.API_KEY, 0);
```

### Complex Object Mutations

Handle nested objects and arrays:

```javascript
// Object mutations
const settings = limitedLet({ theme: 'dark', lang: 'en' }, 5);
settings.value = { ...settings.value, theme: 'light' };

// Array mutations
const tags = limitedLet(['javascript'], 3);
tags.value = [...tags.value, 'typescript'];
tags.value = tags.value.filter(tag => tag !== 'javascript');

// Nested structures
const user = limitedLet({
  profile: { name: 'John', age: 30 },
  preferences: { notifications: true }
}, 10);

user.value = {
  ...user.value,
  profile: { ...user.value.profile, age: 31 }
};
```

### Type Coercion Support

Works seamlessly with JavaScript's type system:

```javascript
const num = limitedLet(42, 3);

// Arithmetic operations
console.log(num + 8);           // 50
console.log(num * 2);           // 84

// String coercion
console.log(`Value: ${num}`);   // "Value: 42"
console.log(String(num));       // "42"

// Boolean coercion
console.log(!!num);             // true

// Comparison
console.log(num == 42);         // true
console.log(num === 42);        // false (proxy object)
console.log(num.valueOf());     // 42
```

### Resettable Variables

Enable reset capability for testing or special scenarios:

```javascript
const resettable = limitedLet(0, 3, {
  allowReset: true,
  trackHistory: true
});

resettable.value = 1;
resettable.value = 2;
resettable.value = 3;
console.log(resettable.isDepleted());    // true

// Reset and continue
resettable.reset();
console.log(resettable.remaining);       // 3
console.log(resettable.history.length);  // 4 (includes reset entry)

resettable.value = 10;  // ✅ Works again
```

## 🧪 Testing Patterns

Examples derived from our comprehensive test suite:

### Basic Functionality Tests

```javascript
// Test mutation limits
const counter = limitedLet(0, 3);
assert.equal(counter.remaining, 3);

counter.value = 1;
assert.equal(counter.mutationCount, 1);
assert.equal(counter.remaining, 2);

// Test error throwing
assert.throws(() => {
  counter.value = 2;
  counter.value = 3;
  counter.value = 4;  // Should throw
}, MutationLimitExceeded);

// Test callback execution
let callbackFired = false;
const tracked = limitedLet('start', 1, {
  onLastMutation: () => { callbackFired = true; }
});
tracked.value = 'end';
assert.equal(callbackFired, true);
```

### Data Type Testing

```javascript
// Boolean values
const bool = limitedLet(true, 2);
bool.value = false;
bool.value = true;
assert.throws(() => bool.value = false);

// Null and undefined
const nullVar = limitedLet(null, 1);
nullVar.value = undefined;
assert.equal(nullVar.value, undefined);

// Arrays
const arr = limitedLet([1, 2], 2);
arr.value = [3, 4];
arr.value = [5, 6, 7];
assert.deepEqual(arr.value, [5, 6, 7]);
```

### History and Serialization

```javascript
const historical = limitedLet(10, 2, { trackHistory: true });
historical.value = 20;
historical.value = 30;

const history = historical.history;
assert.equal(history.length, 3);
assert.equal(history[0].type, 'initial');
assert.equal(history[1].type, 'mutation');
assert.equal(history[2].value, 30);

// JSON serialization
const json = historical.toJSON();
assert.equal(json.value, 30);
assert.equal(json.mutationCount, 2);
assert.equal(json.remaining, 0);
```

## ⚡ Performance

### Benchmarks

`limitedlet` is designed for minimal overhead:

- **Memory**: ~2KB gzipped, zero dependencies
- **CPU**: Proxy overhead ~0.1ms per access
- **History**: Optional tracking, disabled for production if needed

### Optimization Tips

```javascript
// Disable history tracking for better performance
const fast = limitedLet(value, 10, {
  trackHistory: false
});

// Use frozen variables to prevent further mutations
const optimized = limitedLet(data, 5);
// ... perform mutations ...
optimized.freeze();  // No more mutation checking needed

// Batch operations for better performance
const batch = limitedLet([], 1);
batch.value = items.map(transform).filter(validate);  // Single mutation
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
git clone https://github.com/lofimichael/limitedlet.git
cd limitedlet
npm install
npm test           # Run tests
npm run demo       # Run examples
```

### Interactive Demo

Try our comprehensive React demo:

```bash
cd demo
npm install
npm run dev        # Opens at http://localhost:9002
```

The demo showcases real-world usage patterns including:
- 🎯 Counter with visual progress tracking
- ⚙️ Configuration management with clean UI
- 🚦 API rate limiting simulation
- 📊 Behavioral tracking in non-strict mode

## 📄 License

MIT © [limitedlet contributors](LICENSE)

---

<div align="center">

**[⭐ Star us on GitHub](https://github.com/lofimichael/limitedlet)** • **[📚 View Docs](https://docs.limitedlet.dev)** • **[💬 Join Discussion](https://github.com/lofimichael/limitedlet/discussions)**

Made with ❤️ for developers who need **controlled mutability**

</div>