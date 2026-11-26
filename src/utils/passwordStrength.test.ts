import { describe, expect, it } from 'vitest';
import {
  getPasswordStrength,
  getPasswordStrengthLevel,
  PASSWORD_STRENGTH_MAX_SCORE,
} from './passwordStrength';

describe('getPasswordStrength', () => {
  it('treats an empty password as weak with an empty meter', () => {
    const result = getPasswordStrength('');

    expect(result.score).toBe(0);
    expect(result.level).toBe('weak');
    expect(result.label).toBe('Weak');
    expect(result.percent).toBe(0);
    expect(result.checks.minLength).toBe(false);
  });

  it('treats a short lowercase-only password as weak', () => {
    const result = getPasswordStrength('abc');

    expect(result.score).toBe(0);
    expect(result.level).toBe('weak');
    expect(result.checks.minLength).toBe(false);
    expect(result.checks.hasLowercase).toBe(true);
  });

  it('flags an 8+ character single-case password without variety as weak', () => {
    const result = getPasswordStrength('aaaaaaaa');

    expect(result.score).toBe(1);
    expect(result.level).toBe('weak');
    expect(result.checks.minLength).toBe(true);
    expect(result.checks.hasUppercase).toBe(false);
    expect(result.checks.hasNumber).toBe(false);
  });

  it('rates a mixed-case password without a number as fair', () => {
    const result = getPasswordStrength('Passwords');

    expect(result.score).toBe(2);
    expect(result.level).toBe('fair');
    expect(result.label).toBe('Fair');
    expect(result.checks.hasLowercase).toBe(true);
    expect(result.checks.hasUppercase).toBe(true);
  });

  it('rates a password meeting the base schema as good', () => {
    const result = getPasswordStrength('Password1');

    expect(result.score).toBe(3);
    expect(result.level).toBe('good');
    expect(result.label).toBe('Good');
    expect(result.checks.minLength).toBe(true);
    expect(result.checks.hasNumber).toBe(true);
    expect(result.checks.hasSpecialChar).toBe(false);
  });

  it('rates a long password with every character class as strong', () => {
    const result = getPasswordStrength('Passw0rd!xyz');

    expect(result.score).toBe(PASSWORD_STRENGTH_MAX_SCORE);
    expect(result.level).toBe('strong');
    expect(result.label).toBe('Strong');
    expect(result.percent).toBe(100);
    expect(result.checks.hasSpecialChar).toBe(true);
    expect(result.checks.hasExtendedLength).toBe(true);
  });

  it('returns a percent proportional to the score for non-empty passwords', () => {
    const result = getPasswordStrength('Password1');

    expect(result.percent).toBe(Math.round((3 / PASSWORD_STRENGTH_MAX_SCORE) * 100));
    expect(result.percent).toBeGreaterThan(0);
    expect(result.percent).toBeLessThan(100);
  });

  it('detects each individual criterion independently', () => {
    const result = getPasswordStrength('Abcdef1!ghij');

    expect(result.checks).toEqual({
      minLength: true,
      hasLowercase: true,
      hasUppercase: true,
      hasNumber: true,
      hasSpecialChar: true,
      hasExtendedLength: true,
    });
  });

  it('is resilient to a null-ish value', () => {
    // Guard against callers passing an uninitialised react-hook-form value.
    const result = getPasswordStrength(undefined as unknown as string);

    expect(result.score).toBe(0);
    expect(result.percent).toBe(0);
  });
});

describe('getPasswordStrengthLevel', () => {
  it('returns just the level for a given password', () => {
    expect(getPasswordStrengthLevel('Passw0rd!xyz')).toBe('strong');
    expect(getPasswordStrengthLevel('abc')).toBe('weak');
  });
});
