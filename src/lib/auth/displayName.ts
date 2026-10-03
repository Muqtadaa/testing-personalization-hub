// Best-effort human display name from a work email's local part. work
// emails are commonly first.last@domain (last name sometimes an initial), so we
// split on . _ - separators, drop +tags and stray digits, and title-case:
//   jane.doe@x.com    -> "Jane Doe"
//   jane.d@x.com      -> "Jane D."
//   mary.jane.w@x.com -> "Mary Jane W."
//   jsmith@x.com      -> "Jsmith"   (no separator to split on; best effort)
// Falls back to the raw local part when it can't do better.

export function nameFromEmail(email: string | null | undefined): string {
  if (!email) return "";
  const local = (email.split("@")[0] ?? "").split("+")[0];
  if (!local) return "";

  const tokens = local
    .split(/[._-]+/)
    .map((t) => t.replace(/\d+/g, "").trim()) // names don't contain digits
    .filter(Boolean);

  if (tokens.length === 0) return local;

  const cap = (t: string) =>
    t.length === 1
      ? `${t.toUpperCase()}.` // a lone initial reads better with a period
      : t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();

  return tokens.map(cap).join(" ");
}
