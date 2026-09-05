/**
 * Utility for formatting employment duration and average experience across the application.
 * Follows the requirement:
 * - If in days (< 30 days): display days (e.g., "15 days" or "15d")
 * - If in months (< 1 year): display months (e.g., "2 months" or "2 mos")
 * - If in years (>= 1 year): display years (e.g., "2 years" or "2 yrs"), with remaining months when applicable
 */

export interface FormatExperienceOptions {
  /** Use short labels: "d", "mo"/"mos", "yr"/"yrs" */
  compact?: boolean;
}

/**
 * Formats a numeric experience value (represented in years, e.g. 0.2, 1.5, 3)
 * into a human-readable day, month, or year string.
 */
export function formatExperience(
  yearsOrValue: number | string | null | undefined,
  options?: FormatExperienceOptions
): string {
  if (yearsOrValue == null || yearsOrValue === '' || Number.isNaN(Number(yearsOrValue))) {
    return '—';
  }

  const yrs = Number(yearsOrValue);
  if (yrs <= 0) return '—';

  const compact = options?.compact ?? false;
  const totalDays = Math.round(yrs * 365.25);

  // 1. Day period: less than 30 days
  if (totalDays < 30) {
    const days = Math.max(1, totalDays);
    return compact ? `${days}d` : `${days} day${days === 1 ? '' : 's'}`;
  }

  // 2. Month period: less than 1 year (or < 365 days)
  const totalMonths = Math.round(yrs * 12);
  if (totalMonths < 12) {
    const months = Math.max(1, totalMonths);
    return compact ? `${months} mo${months === 1 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'}`;
  }

  // 3. Year period: 1 year or more
  const wholeYears = Math.floor(yrs);
  const remMonths = Math.round((yrs - wholeYears) * 12);

  if (remMonths === 0 || remMonths === 12) {
    const finalYears = remMonths === 12 ? wholeYears + 1 : wholeYears;
    return compact ? `${finalYears} yr${finalYears === 1 ? '' : 's'}` : `${finalYears} year${finalYears === 1 ? '' : 's'}`;
  }

  return compact
    ? `${wholeYears} yr${wholeYears === 1 ? '' : 's'} ${remMonths} mo${remMonths === 1 ? '' : 's'}`
    : `${wholeYears} year${wholeYears === 1 ? '' : 's'} ${remMonths} month${remMonths === 1 ? '' : 's'}`;
}

/**
 * Calculates and formats experience duration between a start date and an optional end date (defaults to now).
 */
export function formatExperienceFromDate(
  startDate: string | Date | null | undefined,
  endDate?: string | Date | null | undefined,
  options?: FormatExperienceOptions
): string {
  if (!startDate) return '—';
  const start = new Date(startDate);
  if (Number.isNaN(start.getTime())) return '—';

  const end = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(end.getTime())) return '—';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return options?.compact ? '1d' : '1 day';

  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const compact = options?.compact ?? false;

  // 1. Day period: less than 30 days
  if (totalDays < 30) {
    const days = Math.max(1, totalDays);
    return compact ? `${days}d` : `${days} day${days === 1 ? '' : 's'}`;
  }

  // 2. Month period: less than 12 months
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) {
    months = Math.max(0, months - 1);
  }

  if (months < 1) {
    const days = Math.max(1, totalDays);
    return compact ? `${days}d` : `${days} day${days === 1 ? '' : 's'}`;
  }

  if (months < 12) {
    return compact ? `${months} mo${months === 1 ? '' : 's'}` : `${months} month${months === 1 ? '' : 's'}`;
  }

  // 3. Year period: 1 year or more
  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (remMonths === 0) {
    return compact ? `${years} yr${years === 1 ? '' : 's'}` : `${years} year${years === 1 ? '' : 's'}`;
  }

  return compact
    ? `${years} yr${years === 1 ? '' : 's'} ${remMonths} mo${remMonths === 1 ? '' : 's'}`
    : `${years} year${years === 1 ? '' : 's'} ${remMonths} month${remMonths === 1 ? '' : 's'}`;
}
