// Password rules with no Node dependencies, so browser components can import them.

export const MIN_PASSWORD_LENGTH = 10;

export function validateNewPassword(next: string, confirm: string, current: string): string | null {
  if (next.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (next !== confirm) return "The two new passwords don’t match.";
  if (next === current) return "Choose a password different from the current one.";
  return null;
}
