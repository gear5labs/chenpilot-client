import { describe, expect, it } from "vitest";
import { translations } from "./translations";
import { findTranslationKeyMismatches } from "./translationParity";

describe("translation key parity", () => {
  it("keeps every supported locale aligned with English nested keys", () => {
    const mismatches = findTranslationKeyMismatches(translations);
    expect(
      mismatches,
      `Translation key parity failed:\n${JSON.stringify(mismatches, null, 2)}`,
    ).toEqual({});
  });

  it("reports missing and extra nested paths for the affected locale", () => {
    const mismatches = findTranslationKeyMismatches({
      en: { common: { title: "Title" }, nav: { home: "Home" } },
      fr: { common: { title: "Titre" }, nav: { start: "Début" } },
    });

    expect(mismatches.fr).toEqual({
      missing: ["nav.home"],
      extra: ["nav.start"],
    });
  });

  it("reports nested parent/child shape mismatches as precise paths", () => {
    const mismatches = findTranslationKeyMismatches({
      en: { account: { security: { password: "Password" } } },
      ar: { account: { security: "الأمان" } },
    });

    expect(mismatches.ar).toEqual({
      missing: ["account.security.password"],
      extra: ["account.security"],
    });
  });
});
