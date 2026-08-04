import { describe, expect, it } from "vitest";
import { CompletionContext } from "@codemirror/autocomplete";
import { yaml } from "@codemirror/lang-yaml";
import { EditorState } from "@codemirror/state";
import {
  buildSlugIndex,
  createRefAutocomplete,
  refAutocompleteSource,
  type SlugIndexEntry,
} from "@/src/lib/editor-autocomplete";

function index(): Map<string, SlugIndexEntry> {
  return buildSlugIndex([
    {
      kind: "contract",
      contractSlug: "orders",
      maturity: "silver",
      data: { contract: { schema: { fields: [{ name: "customer_id" }, { name: "total" }, {}] } } },
    },
    {
      kind: "contract",
      contractSlug: "customers",
      maturity: "gold",
      data: { contract: { schema: { fields: [{ name: "id" }] } } },
    },
    {
      kind: "draft",
      contractSlug: "ignored",
      data: { contract: { schema: { fields: [{ name: "nope" }] } } },
    },
  ]);
}

function context(doc: string, pos: number): CompletionContext {
  const state = EditorState.create({ doc, extensions: [yaml()] });
  return new CompletionContext(state, pos, false);
}

function labels(result: NonNullable<ReturnType<ReturnType<typeof refAutocompleteSource>>>): string[] {
  return result.options.map((o) => o.label);
}

describe("buildSlugIndex", () => {
  const idx = index();

  it("indexes contract files by slug with maturity and fields", () => {
    expect([...idx.keys()]).toEqual(["orders", "customers"]);
    expect(idx.get("orders")).toEqual({ slug: "orders", maturity: "silver", fields: ["customer_id", "total"] });
    expect(idx.get("customers")?.maturity).toBe("gold");
  });

  it("skips non-contract files and files without a slug", () => {
    const idx2 = buildSlugIndex([
      { kind: "schema", contractSlug: "schema-thing" },
      { kind: "contract" },
    ]);
    expect(idx2.size).toBe(0);
  });

  it("ignores fields without a name and keeps the first occurrence of a slug", () => {
    const idx2 = buildSlugIndex([
      { kind: "contract", contractSlug: "orders", maturity: "silver" },
      { kind: "contract", contractSlug: "orders", maturity: "gold" },
    ]);
    expect(idx2.get("orders")).toEqual({ slug: "orders", maturity: "silver", fields: [] });
  });
});

describe("refAutocompleteSource", () => {
  const idx = index();

  it("returns null when there is no @ prefix before the cursor", () => {
    const ctx = context('ref: "foo"', 9);
    expect(refAutocompleteSource(idx)(ctx)).toBeNull();
  });

  it("returns null when the cursor is not inside a string value", () => {
    const ctx = context("ref: @", 6);
    expect(refAutocompleteSource(idx)(ctx)).toBeNull();
  });

  it("completes a slug when typing @", () => {
    const ctx = context('ref: "@', 7);
    const result = refAutocompleteSource(idx)(ctx);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual(["customers", "orders"]);
    expect(result!.options[0].type).toBe("keyword");
  });

  it("filters slugs by the typed prefix", () => {
    const ctx = context('ref: "@ord', 10);
    expect(labels(refAutocompleteSource(idx)(ctx)!)).toEqual(["orders"]);
  });

  it("completes a field after the slug and dot", () => {
    const ctx = context('ref: "@orders.', 14);
    const result = refAutocompleteSource(idx)(ctx);
    expect(result).not.toBeNull();
    expect(labels(result!)).toEqual(["customer_id", "total"]);
    expect(result!.options[0].type).toBe("property");
  });

  it("filters fields by the typed prefix", () => {
    const ctx = context('ref: "@orders.cust"', 17);
    expect(labels(refAutocompleteSource(idx)(ctx)!)).toEqual(["customer_id"]);
  });

  it("returns null when the referenced slug is not in the index", () => {
    const ctx = context('ref: "@missing.f"', 15);
    expect(refAutocompleteSource(idx)(ctx)).toBeNull();
  });

  it("returns null when the slug has no matching fields", () => {
    const ctx = context('ref: "@customers.zz"', 19);
    expect(refAutocompleteSource(idx)(ctx)).toBeNull();
  });

  it("produces a CodeMirror extension", () => {
    const ext = createRefAutocomplete(idx);
    expect(ext).toBeDefined();
  });
});
