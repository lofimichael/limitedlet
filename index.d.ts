export interface MutationContext {
  maxMutations: number;
  currentMutations: number;
  attemptedValue?: any;
  currentValue?: any;
  history?: HistoryEntry[];
  frozen?: boolean;
  mutationPath?: string;
  mutationType?: 'property' | 'delete' | 'array-method';
}

export class MutationLimitExceeded extends Error {
  name: 'MutationLimitExceeded';
  context: MutationContext;
  constructor(message: string, context: MutationContext);
}

export interface HistoryEntry {
  value: any;
  previousValue?: any;
  timestamp: number;
  mutation: number;
  type: 'initial' | 'mutation' | 'reset' | 'violation' | 'deep-mutation';
  mutationPath?: string;
  mutationType?: 'property' | 'delete' | 'array-method';
}

export interface MutationEvent<T> {
  newValue: T;
  oldValue: T;
  mutationCount: number;
  remaining: number;
  mutationPath?: string;
  mutationType?: 'property' | 'delete' | 'array-method';
}

export interface LastMutationEvent<T> {
  value: T;
  history?: HistoryEntry[];
  mutationPath?: string;
  mutationType?: 'property' | 'delete' | 'array-method';
}

export interface ViolationAttempt<T> {
  attemptNumber: number;
  attemptedValue: T;
  currentValue: T;
  mutationCount: number;
  violationCount: number;
  timestamp: number;
  totalAttempts: number;
  mutationPath?: string;
  mutationType?: 'property' | 'delete' | 'array-method';
}

export interface LimitedLetOptions<T = any> {
  trackHistory?: boolean;
  strictMode?: boolean;
  allowReset?: boolean;
  autoFreeze?: boolean;
  trackDeepMutations?: boolean; // NEW: Enable deep mutation tracking (default: true)
  onMutate?: (event: MutationEvent<T>) => void;
  onViolation?: (error: MutationLimitExceeded) => void;
  onLastMutation?: (event: LastMutationEvent<T>) => void;
  onLimitExceeded?: (attempt: ViolationAttempt<T>) => void;
  errorMessage?: string;
}

export interface LimitedVariableJSON<T> {
  value: T;
  maxMutations: number;
  mutationCount: number;
  violationCount: number;
  remaining: number;
  frozen: boolean;
  history?: HistoryEntry[];
}

export class LimitedVariable<T = any> {
  constructor(initialValue: T, maxMutations?: number, options?: LimitedLetOptions<T>);

  get value(): T;
  set value(newValue: T);

  readonly remaining: number;
  readonly history: HistoryEntry[];
  readonly mutationCount: number;
  readonly violationCount: number;
  readonly maxMutations: number;

  isDepleted(): boolean;
  isFrozen(): boolean;
  freeze(): this;
  reset(): this;
  toString(): string;
  toJSON(): LimitedVariableJSON<T>;
}

export interface LimitedVariableProxy<T> {
  value: T;
  readonly remaining: number;
  readonly history: HistoryEntry[];
  readonly mutationCount: number;
  readonly violationCount: number;
  readonly maxMutations: number;
  isDepleted(): boolean;
  isFrozen(): boolean;
  freeze(): LimitedVariableProxy<T>;
  reset(): LimitedVariableProxy<T>;
  toString(): string;
  toJSON(): LimitedVariableJSON<T>;
  valueOf(): T;
}

export function limitedLet<T = any>(
  initialValue: T,
  maxMutations?: number,
  options?: LimitedLetOptions<T>
): LimitedVariableProxy<T>;

export default limitedLet;