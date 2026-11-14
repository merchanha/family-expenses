import { test } from 'node:test';
import assert from 'node:assert/strict';
import { moneyStringSchema, positiveMoneyStringSchema } from './money';

test('accepts valid decimal strings', () => {
  for (const v of ['0', '1', '1234.5', '1234.50', '999999999999.99']) {
    assert.equal(moneyStringSchema.safeParse(v).success, true, v);
  }
});
test('rejects floats-ish / invalid', () => {
  for (const v of ['01', '1.234', '-5', '1e3', 'abc', '', '1,5', '1000000000000']) {
    assert.equal(moneyStringSchema.safeParse(v).success, false, v);
  }
});
test('positive rejects zero', () => {
  assert.equal(positiveMoneyStringSchema.safeParse('0.00').success, false);
  assert.equal(positiveMoneyStringSchema.safeParse('0.01').success, true);
});
