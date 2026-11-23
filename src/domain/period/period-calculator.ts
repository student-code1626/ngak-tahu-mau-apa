/**
 * Calculate the active budget period start and end dates based on user's budget start day (e.g. payday).
 * If today is 2026-11-22 and budgetStartDay is 25:
 *   Current active period is: 2026-10-25 to 2026-11-24 23:59:59.
 * If today is 2026-11-22 and budgetStartDay is 1:
 *   Current active period is: 2026-11-01 to 2026-11-30 23:59:59.
 */
export function calculateBudgetPeriod(budgetStartDay: number, referenceDate = new Date()): {
  startDate: Date;
  endDate: Date;
} {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const todayDate = referenceDate.getDate();

  let startYear = year;
  let startMonth = month;

  if (todayDate < budgetStartDay) {
    // Current period started last month
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  // Get max days in start month to handle day 31 in 30-day months
  const maxDaysInStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
  const actualStartDay = Math.min(budgetStartDay, maxDaysInStartMonth);
  const startDate = new Date(startYear, startMonth, actualStartDay, 0, 0, 0, 0);

  // End date is exactly before next period start day
  let endMonth = startMonth + 1;
  let endYear = startYear;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }

  const maxDaysInEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
  const nextPeriodStartDay = Math.min(budgetStartDay, maxDaysInEndMonth);
  const endDate = new Date(endYear, endMonth, nextPeriodStartDay, 0, 0, 0, 0);
  endDate.setMilliseconds(endDate.getMilliseconds() - 1); // 1 ms before next period starts

  return { startDate, endDate };
}

