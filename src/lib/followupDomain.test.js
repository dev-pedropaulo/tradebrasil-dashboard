import { describe, expect, it } from 'vitest';
import {
  assertPlanInput,
  computeNextRecurringAt,
  hasScheduleCollision,
  normalizePhone,
} from './followupDomain';

describe('follow-up domain', () => {
  it('requires a future first send and a positive cadence', () => {
    expect(() => assertPlanInput({
      leadId: 7,
      templateId: 2,
      firstSendAt: '2026-09-27T09:00:00-03:00',
      recurrenceDays: 0,
    }, new Date('2026-09-28T12:00:00Z'))).toThrow();
  });

  it('keeps recurring dates anchored after a one-off event', () => {
    expect(computeNextRecurringAt(
      '2026-10-01T09:00:00-03:00',
      30,
      '2026-10-21T09:00:00-03:00',
    )).toBe('2026-10-31T09:00:00-03:00');
  });

  it('warns when a one-off event is within 48 hours of recurrence', () => {
    expect(hasScheduleCollision(
      '2026-10-30T09:00:00-03:00',
      '2026-10-31T09:00:00-03:00',
    )).toBe(true);
  });

  it('normalizes Brazilian phone digits', () => {
    expect(normalizePhone('+55 (43) 99999-0000')).toBe('5543999990000');
    expect(normalizePhone('(43) 99999-0000')).toBe('5543999990000');
    expect(normalizePhone('43999990000')).toBe('5543999990000');
  });
});
