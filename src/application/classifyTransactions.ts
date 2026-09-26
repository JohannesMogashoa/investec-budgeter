import type { Clock, Hasher, LockProvider } from '../platform/ports';
import {
  classificationAuditKey,
  evaluateMerchantCategoryRules,
  InvalidRuleSetError,
  ruleSetVersion,
  serializeCandidateRuleIds,
  type MerchantCategoryRule,
} from '../domain/merchantCategoryRules';
import {
  ClassificationAuditRepository,
  type ClassificationAuditRecord,
} from '../sheets/classificationAuditRepository';
import { RulesRepository } from '../sheets/rulesRepository';
import { TransactionRepository } from '../sheets/transactionRepository';

export type ClassificationRunStatus = 'SUCCEEDED' | 'SKIPPED_LOCKED' | 'INVALID_RULE_SET';

export interface ClassificationRunResult {
  readonly status: ClassificationRunStatus;
  readonly evaluated: number;
  readonly auditRows: number;
}

export interface ClassificationDependencies {
  readonly rules: Pick<RulesRepository, 'list'>;
  readonly transactions: TransactionRepository;
  readonly audits: ClassificationAuditRepository;
  readonly locks: LockProvider;
  readonly clock: Clock;
  readonly hasher: Hasher;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : String(value ?? '');
}

function amount(value: unknown): number {
  const result = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(result)) throw new Error('Transaction amount is not numeric.');
  return result;
}

function auditRecord(
  transaction: Record<string, unknown>,
  rules: readonly MerchantCategoryRule[],
  version: string,
  clock: Clock,
  hasher: Hasher,
): ClassificationAuditRecord {
  const transactionRowKey = text(transaction['Row Key']);
  if (!transactionRowKey) throw new Error('Transaction Row Key cannot be empty.');
  const result = evaluateMerchantCategoryRules(
    {
      descriptionRaw: text(transaction['Description Raw']),
      transactionType: text(transaction['Transaction Type']),
      amount: amount(transaction.Amount),
    },
    rules,
  );
  return {
    'Audit Key': classificationAuditKey(transactionRowKey, version, hasher),
    'Transaction Row Key': transactionRowKey,
    'Rule Set Version': version,
    'Evaluated UTC': clock.now().toISOString(),
    Outcome: result.outcome,
    'Matched Rule ID': result.matchedRuleId ?? null,
    'Candidate Rule IDs': result.candidateRuleIds
      ? serializeCandidateRuleIds(result.candidateRuleIds)
      : null,
    'Suggested Category': result.suggestedCategory ?? null,
    'Suggested Budget Item ID': result.suggestedBudgetItemId ?? null,
    'Merchant Display': result.merchantDisplay,
    Reason: result.outcome === 'REVIEW_REQUIRED' ? 'CONFLICTING_RULES' : null,
  };
}

export function classifyTransactions(
  dependencies: ClassificationDependencies,
): ClassificationRunResult {
  const lock = dependencies.locks.get('investec-bank-sync');
  if (!lock.tryAcquire(5000)) {
    return { status: 'SKIPPED_LOCKED', evaluated: 0, auditRows: 0 };
  }
  try {
    let rules: MerchantCategoryRule[];
    try {
      rules = dependencies.rules.list();
    } catch (error) {
      if (error instanceof InvalidRuleSetError) {
        return { status: 'INVALID_RULE_SET', evaluated: 0, auditRows: 0 };
      }
      throw error;
    }
    const version = ruleSetVersion(rules, dependencies.hasher);
    const transactions = dependencies.transactions.list();
    const records = transactions.map((transaction) =>
      auditRecord(transaction, rules, version, dependencies.clock, dependencies.hasher),
    );
    dependencies.audits.upsert(records);
    return { status: 'SUCCEEDED', evaluated: records.length, auditRows: records.length };
  } finally {
    lock.release();
  }
}
