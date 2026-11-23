import { describe, it, expect } from 'vitest';
import { calculateBudgetPeriod } from '@/domain/period/period-calculator';

describe('Period Calculator', () => {
  it('correctly calculates period starting on 1st of month', () => {
    // Reference: Nov 22, 2026, startDay: 1
    const refDate = new Date(2026, 10, 22); // Month is 0-indexed: 10 = Nov
    const { startDate, endDate } = calculateBudgetPeriod(1, refDate);

    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(10); // November
    expect(startDate.getDate()).toBe(1);

    expect(endDate.getFullYear()).toBe(2026);
    expect(endDate.getMonth()).toBe(10); // Ends on last day of November
    expect(endDate.getDate()).toBe(30);
  });

  it('correctly calculates period starting on 25th of month (payday) when today is 22nd', () => {
    // Reference: Nov 22, 2026, startDay: 25.
    // Since today (22nd) is BEFORE startDay (25th), current period started on Oct 25.
    const refDate = new Date(2026, 10, 22);
    const { startDate, endDate } = calculateBudgetPeriod(25, refDate);

    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(9); // October
    expect(startDate.getDate()).toBe(25);

    expect(endDate.getFullYear()).toBe(2026);
    expect(endDate.getMonth()).toBe(10); // November
    expect(endDate.getDate()).toBe(24);
  });

  it('correctly calculates period starting on 25th when today is 26th', () => {
    // Reference: Nov 26, 2026, startDay: 25.
    // Since today (26th) is AFTER startDay (25th), current period started on Nov 25.
    const refDate = new Date(2026, 10, 26);
    const { startDate, endDate } = calculateBudgetPeriod(25, refDate);

    expect(startDate.getFullYear()).toBe(2026);
    expect(startDate.getMonth()).toBe(10); // November
    expect(startDate.getDate()).toBe(25);

    expect(endDate.getFullYear()).toBe(2026);
    expect(endDate.getMonth()).toBe(11); // December
    expect(endDate.getDate()).toBe(24);
  });
});

