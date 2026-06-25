/**
 * Shared validation rules for discount codes — applied in both
 * the admin discount CRUD and the affiliate code-change action.
 */

// Terms that must not appear anywhere in a discount code (case-insensitive).
// Primarily blocks brand-name abuse and internal-sounding codes that could
// mislead buyers or be used to impersonate the store.
const BLOCKED_SUBSTRINGS = [
  'merit',
  'meritsciences',
  'sciences',
];

/**
 * Validate the format and content of a discount code.
 * Returns an error string, or null if the code passes all checks.
 *
 * Does NOT check DB uniqueness — callers must do that separately.
 * Input is treated as case-insensitive; pass raw user input.
 */
export function validateCodeFormat(rawCode: string): string | null {
  const code = rawCode.trim();
  if (!code) return 'Code is required.';
  if (code.length < 3) return 'Code must be at least 3 characters.';
  if (code.length > 40) return 'Code must be 40 characters or less.';

  if (!/^[a-z0-9][a-z0-9_-]*[a-z0-9]$/i.test(code) && !/^[a-z0-9]{2}$/i.test(code)) {
    return 'Code can only contain letters, numbers, hyphens, and underscores, and must start and end with a letter or number.';
  }

  const lower = code.toLowerCase();
  for (const term of BLOCKED_SUBSTRINGS) {
    if (lower.includes(term)) {
      return `Code cannot contain "${term}".`;
    }
  }

  return null;
}
