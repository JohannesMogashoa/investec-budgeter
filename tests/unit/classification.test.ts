import { describe, expect, it } from 'vitest';
import {
  canonicalEnabledRules,
  classificationAuditKey,
  InvalidRuleSetError,
  ruleSetVersion,
  serializeCandidateRuleIds,
  type MerchantCategoryRule,
} from '../../src/domain/merchantCategoryRules';
import { classifyTransactions } from '../../src/application/classifyTransactions';
import { ClassificationAuditRepository } from '../../src/sheets/classificationAuditRepository';
import { RulesRepository } from '../../src/sheets/rulesRepository';
import { TransactionRepository } from '../../src/sheets/transactionRepository';
import { setupWorkbook } from '../../src/application/setupWorkbook';
import { FakeClock, FakeLockProvider, FakeSheetGateway } from '../fakes/platform';

const rule: MerchantCategoryRule = {
  ruleId: 'groceries',
  enabled: true,
  priority: 10,
  descriptionMatch: ' MARKET ',
  descriptionMatchType: 'CONTAINS',
  amountOperator: 'LESS_THAN',
  amountValue: 0,
  merchantDisplay: 'Grocery store',
  category: 'Needs',
  budgetItemId: 'food',
};

const hasher = { sha256: (value: string) => `hash:${value}` };

function setup() {
  const gateway = new FakeSheetGateway();
  setupWorkbook(gateway);
  const rules = new RulesRepository(gateway);
  const transactions = new TransactionRepository(gateway);
  const audits = new ClassificationAuditRepository(gateway);
  rules.upsert([rule]);
  transactions.upsert([
    {
      'Row Key': 'row-1',
      'Description Raw': 'FRESH MARKET',
      'Transaction Type': 'CardPurchases',
      Amount: -125.5,
      Category: 'User category',
      'User Note': 'Keep this note',
    },
  ]);
  return { gateway, rules, transactions, audits };
}

describe('classification audit identity', () => {
  it('AC-3.1: derives a stable version from enabled rules and preserves canonical ordering', () => {
    const disabled: MerchantCategoryRule = { ...rule, ruleId: 'disabled', enabled: false };
    expect(canonicalEnabledRules([disabled, rule])).toBe(
      JSON.stringify([
        'rule-set-v1',
        [
          [
            'groceries',
            10,
            'market',
            'CONTAINS',
            null,
            null,
            'LESS_THAN',
            0,
            null,
            'Grocery store',
            'Needs',
            'food',
          ],
        ],
      ]),
    );
    expect(ruleSetVersion([rule, disabled], hasher)).toBe(
      `hash:${canonicalEnabledRules([rule, disabled])}`,
    );
  });

  it('AC-3.4: uses collision-safe canonical identities and candidate round trips', () => {
    expect(classificationAuditKey('row|1', 'version|1', hasher)).toBe(
      'hash:["classification-audit-v1","row|1","version|1"]',
    );
    const serialized = serializeCandidateRuleIds(['z|rule', 'a,rule']);
    expect(serialized).toBe('["a,rule","z|rule"]');
    expect(JSON.parse(serialized)).toEqual(['a,rule', 'z|rule']);
  });
});

describe('classification application', () => {
  it('AC-3.2, AC-3.5: writes audit suggestions without changing transaction data', () => {
    const context = setup();
    const before = context.transactions.list();
    const result = classifyTransactions({
      ...context,
      locks: new FakeLockProvider(),
      clock: new FakeClock(),
      hasher,
    });

    expect(result).toEqual({ status: 'SUCCEEDED', evaluated: 1, auditRows: 1 });
    expect(context.transactions.list()).toEqual(before);
    expect(context.audits.list()).toEqual([
      expect.objectContaining({
        'Transaction Row Key': 'row-1',
        'Rule Set Version': ruleSetVersion([rule], hasher),
        'Audit Key': classificationAuditKey('row-1', ruleSetVersion([rule], hasher), hasher),
        Outcome: 'APPLIED',
        'Matched Rule ID': 'groceries',
        'Suggested Category': 'Needs',
        'Suggested Budget Item ID': 'food',
        'Merchant Display': 'Grocery store',
      }),
    ]);
  });

  it('AC-3.4: reapplying the same snapshot updates one audit row', () => {
    const context = setup();
    const dependencies = {
      ...context,
      locks: new FakeLockProvider(),
      clock: new FakeClock(),
      hasher,
    };
    classifyTransactions(dependencies);
    classifyTransactions(dependencies);

    expect(context.audits.list()).toHaveLength(1);
  });

  it('AC-3.6: records a new no-match result when a rule is disabled', () => {
    const context = setup();
    const dependencies = {
      ...context,
      locks: new FakeLockProvider(),
      clock: new FakeClock(),
      hasher,
    };
    classifyTransactions(dependencies);
    context.rules.upsert([{ ...rule, enabled: false }]);
    classifyTransactions(dependencies);

    expect(context.audits.list()).toHaveLength(2);
    const auditRows = context.audits.list();
    expect(auditRows[auditRows.length - 1]).toMatchObject({ Outcome: 'NO_MATCH' });
    expect(context.transactions.list()[0]).toMatchObject({ Category: 'User category' });
  });

  it('AC-3.5: skips without writes when the sync lock is held', () => {
    const context = setup();
    const result = classifyTransactions({
      ...context,
      locks: { get: () => ({ tryAcquire: () => false, release: () => undefined }) },
      clock: new FakeClock(),
      hasher,
    });

    expect(result).toEqual({ status: 'SKIPPED_LOCKED', evaluated: 0, auditRows: 0 });
    expect(context.audits.list()).toHaveLength(0);
  });

  it('AC-3.6: rejects invalid rules without writing an audit row', () => {
    const context = setup();
    const invalidRules = {
      list: () => {
        throw new InvalidRuleSetError('invalid');
      },
    };
    const result = classifyTransactions({
      ...context,
      rules: invalidRules,
      locks: new FakeLockProvider(),
      clock: new FakeClock(),
      hasher,
    });

    expect(result.status).toBe('INVALID_RULE_SET');
    expect(context.audits.list()).toHaveLength(0);
  });
});
