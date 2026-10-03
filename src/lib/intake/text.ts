// Shared text utilities (server + client safe).

// Strips emoji / pictographs / regional indicators / skin-tone modifiers /
// variation selectors / ZWJ / combining enclosing keycap. This is a professional
// business tool — no decorative symbols in assistant replies, briefs, or Jira.
const EMOJI =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{1F3FB}-\u{1F3FF}‍️⃣]/gu;

export function stripEmoji(input: string): string {
  if (!input) return input;
  return input
    .replace(EMOJI, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+/gm, "")
    .replace(/[ \t]+$/gm, "");
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** If an ISO date (YYYY-MM-DD) falls before `today`, roll its year forward to
 *  the current year, then to next year if still past. Leaves future dates and
 *  non-ISO strings untouched. Prevents past-year due dates in Jira. */
export function normalizeFutureDate(value: string | null, today = new Date()): string | null {
  if (!value) return value;
  const m = value.trim().match(ISO_DATE);
  if (!m) return value;
  const month = Number(m[2]);
  const day = Number(m[3]);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let year = t.getFullYear();
  let candidate = new Date(year, month - 1, day);
  if (candidate < t) {
    year += 1;
    candidate = new Date(year, month - 1, day);
  }
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
