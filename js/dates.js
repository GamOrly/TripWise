// Date helpers. Dates are stored as 'YYYY-MM-DD' and shown day-month-year: "10 Apr 2026".

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

// Parse 'YYYY-MM-DD' as a UTC calendar date, so day math is not affected by time zones or DST.
function parse(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toISO(date) {
  return date.toISOString().slice(0, 10);
}

export function todayISO() {
  const now = new Date();
  return toISO(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(iso, days) {
  return toISO(new Date(parse(iso).getTime() + days * DAY_MS));
}

export function daysBetween(fromIso, toIso) {
  return Math.round((parse(toIso) - parse(fromIso)) / DAY_MS);
}

// Number of days in a trip, both ends included.
export function dayCount(startIso, endIso) {
  return daysBetween(startIso, endIso) + 1;
}

export function formatDate(iso, { year = true } = {}) {
  const d = parse(iso);
  const text = `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
  return year ? `${text} ${d.getUTCFullYear()}` : text;
}

// "10 Apr – 20 Apr 2026"; the year is repeated only when the range crosses years.
export function formatRange(startIso, endIso) {
  const sameYear = startIso.slice(0, 4) === endIso.slice(0, 4);
  return `${formatDate(startIso, { year: !sameYear })} – ${formatDate(endIso)}`;
}

// 'past' | 'current' | 'upcoming', relative to today.
export function tripTiming(trip, today = todayISO()) {
  if (trip.end_date < today) return 'past';
  if (trip.start_date > today) return 'upcoming';
  return 'current';
}

// Trips as shown on My Trips: upcoming first (soonest first), then past (most recent first).
// The trip happening now counts as upcoming order-wise, so it sorts first.
export function sortTrips(trips, today = todayISO()) {
  const rank = (t) => (tripTiming(t, today) === 'past' ? 1 : 0);
  return [...trips].sort((a, b) => rank(a) - rank(b) || (rank(a) === 0 ? a.start_date.localeCompare(b.start_date) : b.start_date.localeCompare(a.start_date)));
}

// The big card on My Trips: the trip happening now, else the soonest upcoming one, else none.
export function pickFeatured(trips, today = todayISO()) {
  const sorted = sortTrips(trips, today);
  return sorted.find((t) => tripTiming(t, today) === 'current') || sorted.find((t) => tripTiming(t, today) === 'upcoming') || null;
}
