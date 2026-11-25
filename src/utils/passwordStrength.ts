/**
 * Password strength evaluation utilities.
 *
 * Provides a single, dependency-free source of truth for scoring a password
 * so the registration UI (strength meter) and any future consumers stay
 * consistent. The scoring model rewards length, character variety and the
 * presence of a special character, and is aligned with `passwordSchema`
 * (min 8 characters, at least one uppercase, one lowercase and one number).
 */

export type PasswordStrengthLevel = 'weak' | 'fair' | 'good' | 'strong';

export interface PasswordChecks {
  /** At least 8 characters (matches `passwordSchema`). */
  minLength: boolean;
  /** Contains a lowercase letter (matches `passwordSchema`). */
  hasLowercase: boolean;
  /** Contains an uppercase letter (matches `passwordSchema`). */
  hasUppercase: boolean;
  /** Contains a number (matches `passwordSchema`). */
  hasNumber: boolean;
  /** Contains a non-alphanumeric character (recommended, goes beyond the schema). */
  hasSpecialChar: boolean;
  /** At least 12 characters (bonus for extra length). */
  hasExtendedLength: boolean;
}

export interface PasswordStrengthResult {
  /** Raw score from 0 to 5 (number of satisfied criteria). */
  score: number;
  /** Coarse level used by the UI to pick colors / filled segments. */
  level: PasswordStrengthLevel;
  /** Human readable label, e.g. "Weak". */
  label: string;
  /** Fill percentage of the meter (0-100). */
  percent: number;
  /** Individual criteria results, useful for rendering a checklist. */
  checks: PasswordChecks;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_EXTENDED_LENGTH = 12;

/** Max possible score, exposed so the UI can render segments consistently. */
export const PASSWORD_STRENGTH_MAX_SCORE = 5;

const LEVEL_LABELS: Record<PasswordStrengthLevel, string> = {
  weak: 'Weak',
  fair: 'Fair',
  good: 'Good',
  strong: 'Strong',
};

const LOWERCASE_REGEX = /[a-z]/;
const UPPERCASE_REGEX = /[A-Z]/;
const NUMBER_REGEX = /\d/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;

/**
 * Evaluate the strength of a password.
 *
 * Returns a stable, serializable result that describes the score, level,
 * meter fill percentage and the individual criteria that were satisfied.
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  const value = password ?? '';

  const checks: PasswordChecks = {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    hasLowercase: LOWERCASE_REGEX.test(value),
    hasUppercase: UPPERCASE_REGEX.test(value),
    hasNumber: NUMBER_REGEX.test(value),
    hasSpecialChar: SPECIAL_CHAR_REGEX.test(value),
    hasExtendedLength: value.length >= PASSWORD_EXTENDED_LENGTH,
  };

  let score = 0;
  if (checks.minLength) score += 1;
  if (checks.hasLowercase && checks.hasUppercase) score += 1;
  if (checks.hasNumber) score += 1;
  if (checks.hasSpecialChar) score += 1;
  if (checks.hasExtendedLength) score += 1;

  let level: PasswordStrengthLevel;
  if (score <= 1) {
    level = 'weak';
  } else if (score === 2) {
    level = 'fair';
  } else if (score === 3) {
    level = 'good';
  } else {
    level = 'strong';
  }

  const percent =
    value.length === 0
      ? 0
      : Math.round((score / PASSWORD_STRENGTH_MAX_SCORE) * 100);

  return {
    score,
    level,
    label: LEVEL_LABELS[level],
    percent,
    checks,
  };
}

/** Convenience helper: evaluate a password and return only its level. */
export function getPasswordStrengthLevel(password: string): PasswordStrengthLevel {
  return getPasswordStrength(password).level;
}
