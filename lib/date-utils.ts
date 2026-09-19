/**
 * ISO 8601 Week Utilities
 * 
 * In standard ISO 8601 (used in financial/trading journals):
 * - Weeks begin on Monday (day 1) and end on Sunday (day 7).
 * - Week 1 of any year is the week containing January 4th (or the year's first Thursday).
 * - Friday, Saturday, and Sunday stay in the trading week that just concluded.
 * - The new week officially starts on Monday.
 */

function parseDateInput(input?: Date | string | number | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return new Date(input.getTime());
  if (typeof input === "number") return new Date(input);
  if (typeof input === "string") {
    // If it's pure YYYY-MM-DD, anchor at noon local time to prevent TZ shifts
    if (/^\d{4}-\d{2}-\d{2}$/.test(input)) {
      const [y, m, d] = input.split("-").map(Number);
      return new Date(y, m - 1, d, 12, 0, 0);
    }
    const parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

/**
 * Returns the ISO 8601 week key in the format "YYYY-WXX" (e.g., "2026-W38").
 * Saturday and Sunday correctly belong to the current week; Monday transitions to the next week.
 */
export function getISOWeekKey(input?: Date | string | number | null): string {
  const d = parseDateInput(input);
  // ISO day: 1 = Monday ... 7 = Sunday
  const day = d.getDay() === 0 ? 7 : d.getDay();
  
  // Thursday of current week determines the ISO year
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + (4 - day));
  const year = thursday.getFullYear();
  
  // First Thursday of the year is always in Week 1
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const firstThursday = new Date(year, 0, 4 + (4 - jan4Day));
  
  const diffMs = thursday.getTime() - firstThursday.getTime();
  const weekNumber = 1 + Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  
  return `${year}-W${String(weekNumber).padStart(2, "0")}`;
}

/**
 * Given a week key (e.g. "2026-W38"), returns Monday (from) and Sunday (to) Date objects.
 */
export function getWeekRange(weekOf?: string): { from: Date; to: Date } {
  const key = weekOf || getISOWeekKey();
  const [yearStr, wStr] = key.split("-W");
  const year = Number(yearStr) || new Date().getFullYear();
  const week = Number(wStr) || 1;
  
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() === 0 ? 7 : jan4.getDay();
  const mondayW1 = new Date(year, 0, 4 - (jan4Day - 1));
  
  const targetMonday = new Date(mondayW1.getFullYear(), mondayW1.getMonth(), mondayW1.getDate() + (week - 1) * 7);
  const targetSunday = new Date(targetMonday.getFullYear(), targetMonday.getMonth(), targetMonday.getDate() + 6);
  
  return { from: targetMonday, to: targetSunday };
}

/**
 * Given a week key (e.g. "2026-W38"), returns an array of 7 "YYYY-MM-DD" strings (Monday through Sunday).
 */
export function getWeekDates(weekOf?: string): string[] {
  const { from } = getWeekRange(weekOf);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  });
}
