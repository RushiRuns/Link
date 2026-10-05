/**
 * Utility functions for chat timeline date formatting and day boundary detection.
 */

/**
 * Checks whether two timestamps fall on the same local calendar day.
 */
export function isSameDay(timestamp1: number, timestamp2: number): boolean {
  const d1 = new Date(timestamp1);
  const d2 = new Date(timestamp2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Formats a timestamp into a timeline date label:
 * - "Today" if on the current calendar day
 * - "Yesterday" if 1 calendar day prior
 * - "Jan 1, 2026" (Month Day, Year) for older dates
 */
export function formatTimelineDate(timestamp: number): string {
  const target = new Date(timestamp);
  const now = new Date();

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffDays = Math.round((todayMidnight - targetMidnight) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  }
  if (diffDays === 1) {
    return 'Yesterday';
  }

  return target.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
