const STREAK_PREFIX = 'edstreak_';

const fmtDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function load(key: string): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}

function save(key: string, map: Record<string, boolean>) {
  localStorage.setItem(key, JSON.stringify(map));
}

/** Marks "today" as an active day for the user and returns the new streak. */
export function recordStudyDay(userId: string): number {
  const key = STREAK_PREFIX + userId;
  const map = load(key);
  map[fmtDay(new Date())] = true;
  save(key, map);
  return computeStreak(userId);
}

/** Counts consecutive active days ending today (or yesterday if today is not yet active). */
export function computeStreak(userId: string): number {
  const map = load(STREAK_PREFIX + userId);
  let streak = 0;
  const d = new Date();
  while (map[fmtDay(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}