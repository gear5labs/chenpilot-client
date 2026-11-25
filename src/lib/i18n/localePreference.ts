/**
 * Regional format preference store.
 *
 * Account-level control over the locale used for date, time, and number
 * formatting, independent of the UI language. Each category may be set
 * separately; unset categories follow the app language's locale.
 *
 * - `localStorage["locale_preferences"]`: device preference, used while signed out.
 * - `localStorage["locale_preferences_by_user"]`: `{ [userId]: preferences }`,
 *   written when a signed-in user changes a preference, mirroring the
 *   per-user language store (#291) so one user's choice never leaks to another.
 */
import { getLocaleForLanguage } from "./translations";
import { readActiveUserId, readLanguagePreference } from "./languagePreference";

export type LocaleKind = "date" | "time" | "number";

export interface LocalePreferences {
  date: string;
  time: string;
  number: string;
}

export const LOCALE_KINDS: readonly LocaleKind[] = ["date", "time", "number"];

/** BCP 47 tags offered in settings. "en-US" style tags only; validated on read. */
export const SUPPORTED_FORMAT_LOCALES: ReadonlyArray<{ code: string; name: string }> = [
  { code: "en-US", name: "English (United States)" },
  { code: "en-GB", name: "English (United Kingdom)" },
  { code: "ar-SA", name: "العربية (Saudi Arabia)" },
  { code: "es-ES", name: "Español (España)" },
  { code: "fr-FR", name: "Français (France)" },
  { code: "de-DE", name: "Deutsch (Deutschland)" },
  { code: "it-IT", name: "Italiano (Italia)" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "nl-NL", name: "Nederlands (Nederland)" },
  { code: "hi-IN", name: "हिन्दी (भारत)" },
  { code: "ja-JP", name: "Japanese (Japan)" },
  { code: "zh-CN", name: "Chinese (Simplified, China)" },
];

const LOCALE_CODE_PATTERN = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;
const STORAGE_KEY = "locale_preferences";
const USER_STORAGE_KEY = "locale_preferences_by_user";

export function isValidLocaleCode(value: unknown): value is string {
  return typeof value === "string" && value.length <= 35 && LOCALE_CODE_PATTERN.test(value);
}

function parsePreferences(value: unknown): Partial<LocalePreferences> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const prefs: Partial<LocalePreferences> = {};
  for (const kind of LOCALE_KINDS) {
    if (isValidLocaleCode(raw[kind])) prefs[kind] = raw[kind] as string;
  }
  return prefs;
}

function readUserMap(): Record<string, Partial<LocalePreferences>> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(USER_STORAGE_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Explicitly saved preferences only; categories the user never set are absent. */
export function readExplicitLocalePreference(
  userId: string | null = readActiveUserId(),
): Partial<LocalePreferences> {
  if (typeof window === "undefined") return {};
  const fromUser = userId ? parsePreferences(readUserMap()[userId]) : {};
  if (Object.keys(fromUser).length > 0) return fromUser;
  try {
    return parsePreferences(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return {};
  }
}

/** Effective preferences: saved values, falling back to the app language's locale. */
export function readLocalePreference(
  userId: string | null = readActiveUserId(),
): LocalePreferences {
  const explicit = readExplicitLocalePreference(userId);
  const fallback = getLocaleForLanguage(readLanguagePreference(userId));
  return {
    date: explicit.date ?? fallback,
    time: explicit.time ?? fallback,
    number: explicit.number ?? fallback,
  };
}

/** Save a partial update for the signed-in user, or as the device preference when signed out. */
export function saveLocalePreference(
  prefs: Partial<LocalePreferences>,
  userId: string | null = readActiveUserId(),
): void {
  const clean = parsePreferences(prefs);
  if (Object.keys(clean).length === 0) return;
  try {
    if (userId) {
      const map = readUserMap();
      map[userId] = { ...parsePreferences(map[userId]), ...clean };
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(map));
    } else {
      const merged = { ...readExplicitLocalePreference(null), ...clean };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }
  } catch {
    // Storage denied: keep the in-memory preference only
  }
}

/**
 * Locale to use for a formatting category outside React (format utils, direct
 * `toLocale*` calls): the explicit preference when set, else the app language's.
 */
export function getFormattingLocale(kind: LocaleKind): string {
  const explicit = readExplicitLocalePreference();
  if (explicit[kind]) return explicit[kind] as string;
  return getLocaleForLanguage(readLanguagePreference(readActiveUserId()));
}
