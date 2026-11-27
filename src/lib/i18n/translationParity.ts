export interface TranslationKeyMismatch {
  missing: string[];
  extra: string[];
}

type TranslationTree = Record<string, unknown>;

function collectLeafPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as TranslationTree).flatMap(([key, child]) =>
    collectLeafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

/**
 * Compare every locale against the English source and report missing or extra
 * leaf paths. Paths are dot-separated so failures identify the exact key.
 */
export function findTranslationKeyMismatches(
  localeTranslations: Record<string, unknown>,
  sourceLanguage = "en",
): Record<string, TranslationKeyMismatch> {
  const source = localeTranslations[sourceLanguage];
  if (!source || typeof source !== "object" || Array.isArray(source)) {
    throw new Error(`Translation source locale "${sourceLanguage}" is missing or invalid`);
  }

  const expected = new Set(collectLeafPaths(source));
  const mismatches: Record<string, TranslationKeyMismatch> = {};

  for (const [language, translation] of Object.entries(localeTranslations)) {
    if (language === sourceLanguage) continue;
    const actual = new Set(collectLeafPaths(translation));
    const missing = [...expected].filter((path) => !actual.has(path)).sort();
    const extra = [...actual].filter((path) => !expected.has(path)).sort();

    if (missing.length || extra.length) {
      mismatches[language] = { missing, extra };
    }
  }

  return mismatches;
}
