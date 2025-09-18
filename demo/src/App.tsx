import { useState, useCallback, useRef } from 'react';
import { limitedLet } from 'limitedlet';
import type {
  LimitedVariableProxy,
  LimitedLetOptions,
  MutationEvent,
  LastMutationEvent,
  ViolationAttempt,
  MutationLimitExceeded
} from 'limitedlet';

// TypeScript interface for useLimitedLet hook return type
interface UseLimitedLetResult<T> {
  value: T;
  remaining: number;
  mutationCount: number;
  violationCount: number;
  maxMutations: number;
  isDepleted: boolean;
  isFrozen: boolean;
  setValue: (newValue: T) => void;
  reset?: () => LimitedVariableProxy<T>;
  freeze: () => LimitedVariableProxy<T>;
}

// Hook for using limitedLet in React with full TypeScript support
function useLimitedLet<T>(
  initialValue: T,
  maxMutations: number,
  options?: LimitedLetOptions<T>
): UseLimitedLetResult<T> {
  const limitedRef = useRef<LimitedVariableProxy<T>>();
  const [, forceUpdate] = useState({});

  if (!limitedRef.current) {
    limitedRef.current = limitedLet(initialValue, maxMutations, {
      ...options,
      onMutate: (event: MutationEvent<T>) => {
        forceUpdate({});
        options?.onMutate?.(event);
      },
      onLastMutation: (event: LastMutationEvent<T>) => {
        forceUpdate({});
        options?.onLastMutation?.(event);
      }
    });
  }

  const setValue = useCallback((newValue: T) => {
    try {
      if (limitedRef.current) {
        limitedRef.current.value = newValue;
      }
    } catch (error) {
      console.error('Mutation failed:', error);
    }
  }, []);

  return {
    value: limitedRef.current?.value,
    remaining: limitedRef.current?.remaining ?? 0,
    mutationCount: limitedRef.current?.mutationCount ?? 0,
    violationCount: limitedRef.current?.violationCount ?? 0,
    maxMutations: limitedRef.current?.maxMutations ?? 0,
    isDepleted: limitedRef.current?.isDepleted() ?? false,
    isFrozen: limitedRef.current?.isFrozen() ?? false,
    setValue,
    reset: limitedRef.current?.reset?.bind(limitedRef.current),
    freeze: limitedRef.current?.freeze?.bind(limitedRef.current)
  };
}


// Configuration object example demonstrating object mutations and callbacks
function ConfigurationExample() {
  const [lockMessage, setLockMessage] = useState('');

  const config = useLimitedLet(
    { theme: 'light', language: 'en', notifications: true },
    2,
    {
      trackHistory: true,
      onMutate: (event: MutationEvent<{theme: string, language: string, notifications: boolean}>) => {
        setLockMessage(`Configuration updated. ${event.remaining} changes remaining.`);
      },
      onLastMutation: () => {
        setLockMessage('🔒 Configuration locked - no more changes allowed');
      }
    }
  );

  const updateTheme = () => {
    config.setValue({
      ...config.value,
      theme: config.value.theme === 'light' ? 'dark' : 'light'
    });
  };

  const updateLanguage = () => {
    config.setValue({
      ...config.value,
      language: config.value.language === 'en' ? 'es' : 'en'
    });
  };

  const toggleNotifications = () => {
    config.setValue({
      ...config.value,
      notifications: !config.value.notifications
    });
  };

  const getStatusBadge = () => {
    if (config.isDepleted) {
      return <span className="status-badge status-locked">🔒 Locked</span>;
    } else if (config.remaining === 1) {
      return <span className="status-badge status-active">⚠️ Final Change</span>;
    } else {
      return <span className="status-badge status-ready">✅ {config.remaining} Changes Left</span>;
    }
  };

  return (
    <div className="example-section">
      <h3>Application Settings - Limited Configuration Changes</h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span><strong>Configuration State</strong></span>
        {getStatusBadge()}
      </div>

      <div className="config-display">
        <div className="config-item">
          <div className="config-item-label">Theme</div>
          <div className="config-item-value">
            {config.value.theme === 'light' ? '☀️ Light' : '🌙 Dark'}
          </div>
        </div>
        <div className="config-item">
          <div className="config-item-label">Language</div>
          <div className="config-item-value">
            {config.value.language === 'en' ? '🇺🇸 English' : '🇪🇸 Español'}
          </div>
        </div>
        <div className="config-item">
          <div className="config-item-label">Notifications</div>
          <div className="config-item-value">
            {config.value.notifications ? '🔔 Enabled' : '🔕 Disabled'}
          </div>
        </div>
      </div>

      {lockMessage && (
        <div style={{
          margin: '12px 0',
          padding: '8px 12px',
          backgroundColor: config.isDepleted ? '#fff3cd' : '#e7f3ff',
          borderRadius: '4px',
          fontSize: '14px',
          border: `1px solid ${config.isDepleted ? '#ffeaa7' : '#b3d9ff'}`
        }}>
          {lockMessage}
        </div>
      )}

      <div className="button-group">
        <button
          onClick={updateTheme}
          disabled={config.isDepleted}
          className={config.isDepleted ? 'button-disabled' : 'button-secondary'}
        >
          Switch to {config.value.theme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
        <button
          onClick={updateLanguage}
          disabled={config.isDepleted}
          className={config.isDepleted ? 'button-disabled' : 'button-secondary'}
        >
          Change to {config.value.language === 'en' ? 'Spanish' : 'English'}
        </button>
        <button
          onClick={toggleNotifications}
          disabled={config.isDepleted}
          className={config.isDepleted ? 'button-disabled' : 'button-secondary'}
        >
          {config.value.notifications ? 'Disable' : 'Enable'} Notifications
        </button>
      </div>

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <strong>Demonstrates:</strong> Object mutations with limited changes and onLastMutation callback.
        Real-world use case: Limiting configuration changes in production environments.
      </div>
    </div>
  );
}

// API rate limiting example demonstrating practical mutation limits
function ApiRateLimitExample() {
  const [apiResponses, setApiResponses] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState('');

  const apiLimiter = useLimitedLet<string>('idle', 3, {
    allowReset: false,
    autoFreeze: true,
    onMutate: (event: MutationEvent<string>) => {
      setLastAction(`API call: ${event.newValue}`);
    },
    onLastMutation: () => {
      setLastAction('🚫 Rate limit reached - API access blocked');
      setApiResponses(prev => [...prev, '⚠️ Rate limit exceeded - requests blocked for this session']);
    }
  });

  const makeApiCall = (endpoint: string, description: string) => {
    if (!apiLimiter.isDepleted) {
      apiLimiter.setValue(endpoint);
      // Simulate API response
      const responses = [
        `✅ ${description} successful`,
        `✅ ${description} completed`,
        `✅ Data retrieved from ${endpoint}`
      ];
      setApiResponses(prev => [...prev, responses[Math.floor(Math.random() * responses.length)]]);
    }
  };

  const getStatusBadge = () => {
    if (apiLimiter.isDepleted) {
      return <span className="status-badge status-locked">🚫 Rate Limited</span>;
    } else if (apiLimiter.remaining === 1) {
      return <span className="status-badge status-active">⚠️ Final Request</span>;
    } else {
      return <span className="status-badge status-ready">✅ API Available</span>;
    }
  };

  return (
    <div className="example-section">
      <h3>API Rate Limiting - Practical Usage Control</h3>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span><strong>API Status</strong></span>
        {getStatusBadge()}
      </div>

      <div className="progress-display">
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
          <span>Requests Made: {apiLimiter.mutationCount}/3</span>
          <span>Remaining: {apiLimiter.remaining}</span>
        </div>

        {lastAction && (
          <div style={{
            padding: '8px',
            backgroundColor: apiLimiter.isDepleted ? '#fff2f2' : '#f0f9ff',
            borderRadius: '4px',
            fontSize: '13px',
            border: `1px solid ${apiLimiter.isDepleted ? '#fecaca' : '#bae6fd'}`
          }}>
            <strong>Last Action:</strong> {lastAction}
          </div>
        )}
      </div>

      <div className="button-group">
        <button
          onClick={() => makeApiCall('/users', 'Fetch user data')}
          disabled={apiLimiter.isDepleted}
          className={apiLimiter.isDepleted ? 'button-disabled' : 'button-primary'}
        >
          GET /users
        </button>
        <button
          onClick={() => makeApiCall('/posts', 'Load posts')}
          disabled={apiLimiter.isDepleted}
          className={apiLimiter.isDepleted ? 'button-disabled' : 'button-secondary'}
        >
          GET /posts
        </button>
        <button
          onClick={() => makeApiCall('/analytics', 'Fetch analytics')}
          disabled={apiLimiter.isDepleted}
          className={apiLimiter.isDepleted ? 'button-disabled' : 'button-accent'}
        >
          GET /analytics
        </button>
      </div>

      {apiResponses.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '8px' }}>API Responses:</h4>
          <div style={{
            maxHeight: '120px',
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '8px',
            backgroundColor: '#f9f9f9',
            fontSize: '12px'
          }}>
            {apiResponses.map((response, index) => (
              <div key={index} style={{ marginBottom: '4px', padding: '2px 0' }}>
                {response}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <strong>Demonstrates:</strong> Practical rate limiting for API calls, auto-freeze behavior, and real-world usage patterns.
        Common use case: Preventing API abuse and managing request quotas.
      </div>
    </div>
  );
}

// Enhanced counter example demonstrating mutation limits and auto-freeze
function CounterExample() {
  const [statusMessage, setStatusMessage] = useState('');

  const counter = useLimitedLet<number>(0, 5, {
    trackHistory: true,
    onMutate: (event: MutationEvent<number>) => {
      if (event.remaining === 0) {
        setStatusMessage('Final mutation completed - variable is now locked!');
      } else {
        setStatusMessage(`Changed from ${event.oldValue} to ${event.newValue}`);
      }
    },
    onLastMutation: () => {
      setStatusMessage('🔒 Variable automatically locked after final mutation');
    }
  });

  const getStatusBadge = () => {
    if (counter.isDepleted) {
      return <span className="status-badge status-locked">🔒 Locked</span>;
    } else if (counter.remaining === 1) {
      return <span className="status-badge status-active">⚠️ Final Change</span>;
    } else {
      return <span className="status-badge status-ready">✅ Ready</span>;
    }
  };

  const progressPercentage = (counter.mutationCount / counter.maxMutations) * 100;

  return (
    <div className="example-section">
      <h3>Limited Counter - Basic Mutation Limits</h3>

      <div className="progress-display">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span><strong>Current Value: {counter.value}</strong></span>
          {getStatusBadge()}
        </div>

        <div className="progress-bar">
          <div
            className={`progress-fill ${counter.isDepleted ? 'depleted' : ''}`}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#6c757d' }}>
          <span>Mutations: {counter.mutationCount}/{counter.maxMutations}</span>
          <span>Remaining: {counter.remaining}</span>
        </div>

        {statusMessage && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#e7f3ff', borderRadius: '4px', fontSize: '13px' }}>
            {statusMessage}
          </div>
        )}
      </div>

      <div className="button-group">
        <button
          onClick={() => counter.setValue(counter.value + 1)}
          disabled={counter.isDepleted}
          className={counter.isDepleted ? 'button-disabled' : 'button-primary'}
        >
          Increment (+1)
        </button>
        <button
          onClick={() => counter.setValue(counter.value - 1)}
          disabled={counter.isDepleted}
          className={counter.isDepleted ? 'button-disabled' : 'button-primary'}
        >
          Decrement (-1)
        </button>
        <button
          onClick={() => counter.setValue(0)}
          disabled={counter.isDepleted}
          className={counter.isDepleted ? 'button-disabled' : 'button-secondary'}
        >
          Reset to 0
        </button>
      </div>

      <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
        <strong>Demonstrates:</strong> Basic mutation limits, auto-freeze behavior, and progress tracking.
        This follows the test pattern: "Should allow mutations up to the limit" + "Should auto-freeze after last mutation".
      </div>
    </div>
  );
}

// Tracking example demonstrating non-strict mode
function TrackingExample() {
  const [trackingLog, setTrackingLog] = useState<Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>>([]);

  const addToLog = (type: string, message: string) => {
    setTrackingLog(prev => [...prev, { type, message, timestamp: new Date() }]);
  };

  const userActions = useLimitedLet<number>(0, 3, {
    strictMode: false,  // Non-strict mode - don't block users
    onMutate: (event: MutationEvent<number>) => {
      addToLog('success', `Action ${event.mutationCount}: ${event.oldValue} → ${event.newValue}`);
    },
    onLimitExceeded: (attempt: ViolationAttempt<number>) => {
      addToLog('violation',
        `Violation #${attempt.attemptNumber}: Attempted "${attempt.attemptedValue}" ` +
        `(Total attempts: ${attempt.totalAttempts})`
      );
    }
  });

  const performAction = (action: string) => {
    userActions.setValue(userActions.value + 1);
    addToLog('action', `User clicked: ${action}`);
  };

  const clearLog = () => setTrackingLog([]);

  return (
    <div className="example-section">
      <h3>Behavior Tracking (Non-Strict Mode)</h3>
      <div className="status">
        Actions performed: {userActions.value} | Violations: {userActions.violationCount}
        <br />
        Mode: Non-Strict (violations tracked, not blocked)
      </div>

      <div className="button-group">
        <button
          onClick={() => performAction('Purchase')}
          className="button-primary"
        >
          Purchase Item
        </button>
        <button
          onClick={() => performAction('Subscribe')}
          className="button-secondary"
        >
          Subscribe
        </button>
        <button
          onClick={() => performAction('Upgrade')}
          className="button-accent"
        >
          Upgrade Account
        </button>
        <button onClick={clearLog} className="button-secondary">
          Clear Log
        </button>
      </div>

      <div style={{ marginTop: '15px' }}>
        <h4>Tracking Log:</h4>
        <div style={{
          maxHeight: '200px',
          overflowY: 'auto',
          border: '1px solid #ddd',
          borderRadius: '4px',
          padding: '10px',
          backgroundColor: '#f9f9f9',
          fontSize: '12px'
        }}>
          {trackingLog.length === 0 ? (
            <div style={{ color: '#666' }}>No events logged yet...</div>
          ) : (
            trackingLog.map((entry, index) => (
              <div key={index} style={{
                marginBottom: '5px',
                color: entry.type === 'violation' ? '#e74c3c' :
                      entry.type === 'success' ? '#27ae60' : '#333'
              }}>
                <strong>[{entry.timestamp.toLocaleTimeString()}]</strong> {entry.message}
              </div>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
        <strong>Key insight:</strong> In non-strict mode, users aren't blocked after the limit,
        but all attempts are tracked for behavioral analysis.
      </div>
    </div>
  );
}


function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>a limited demo of limitedlet</h1>
        <p>Demonstrating practical usage patterns of limited mutable variables in React applications.</p>
      </header>

      <main className="app-main">
        <CounterExample />
        <ConfigurationExample />
        <ApiRateLimitExample />
        <TrackingExample />
      </main>

      <footer className="app-footer">
        <p>
          Built with <a href="https://github.com/username/limitedlet">limitedlet</a> -
          Limited mutable variables for JavaScript & TypeScript
        </p>
      </footer>
    </div>
  );
}

export default App;