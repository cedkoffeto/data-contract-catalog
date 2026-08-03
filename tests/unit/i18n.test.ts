import { describe, expect, it } from "vitest";
import { dictionaries, getLocale, t, tWith } from "@/src/lib/i18n";

describe("t", () => {
  it("returns the English string for a known key in the default locale", () => {
    expect(t("catalogTitle")).toBe("Catalog");
    expect(t("noComments")).toBe("No comments yet. Start the discussion.");
  });

  it("returns every dictionary entry as a string", () => {
    for (const [key, value] of Object.entries(dictionaries.en)) {
      expect(value).toBeTypeOf("string");
      expect(key).toBeTruthy();
    }
  });
});

describe("tWith", () => {
  it("substitutes a single placeholder", () => {
    expect(tWith("minutesAgo", { n: "5" })).toBe("5m ago");
    expect(tWith("hoursAgo", { n: "3" })).toBe("3h ago");
  });

  it("substitutes multiple placeholders in one string", () => {
    expect(tWith("scopeFull", { domain: "crm", context: "claims", contract: "orders" })).toBe("crm / claims / orders");
    expect(tWith("pageOf", { page: "2", total: "10" })).toBe("Page 2 of 10");
  });

  it("replaces every occurrence of the same placeholder", () => {
    expect(tWith("saveChanges", { count: "3", s: "s" })).toBe("Save (3 changes)");
  });

  it("substitutes missing values with an empty string", () => {
    expect(tWith("minutesAgo", {})).toBe("m ago");
  });

  it("leaves the string untouched when it has no placeholders", () => {
    expect(tWith("catalogTitle", { n: "5" })).toBe("Catalog");
  });
});

describe("getLocale", () => {
  it("defaults to en when neither localStorage nor navigator is available", () => {
    expect(getLocale()).toBe("en");
  });
});

describe("dictionaries", () => {
  it("keeps French and English key sets in sync", () => {
    const enKeys = Object.keys(dictionaries.en).sort();
    const frKeys = Object.keys(dictionaries.fr).sort();
    expect(frKeys).toEqual(enKeys);
  });

  it("leaves no untranslated English key in French", () => {
    const fr = dictionaries.fr as Record<string, string>;
    for (const key of Object.keys(dictionaries.en)) {
      expect(fr[key]).toBeTypeOf("string");
    }
  });

  it("returns the French value when queried directly", () => {
    expect(dictionaries.fr.catalogTitle).toBe("Catalogue");
    expect(dictionaries.fr.minutesAgo).toBe("il y a {n} min");
  });
});
