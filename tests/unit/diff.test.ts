import { describe, expect, it } from "vitest";
import {
  computeDiff,
  computeWordDiff,
  createRawDiff,
  createSideBySideDiff,
  createStructuralDiff,
  createUnifiedDiff,
  createUnifiedDiffText,
} from "@/src/lib/diff";

describe("createUnifiedDiff", () => {
  it("returns only unchanged lines for identical texts", () => {
    const result = createUnifiedDiff("a\nb\n", "a\nb\n");
    expect(result).toEqual([
      { type: "unchanged", value: "a" },
      { type: "unchanged", value: "b" },
    ]);
  });

  it("marks pure insertions as added", () => {
    const result = createUnifiedDiff("a\n", "a\nb\n");
    expect(result).toEqual([
      { type: "unchanged", value: "a" },
      { type: "added", value: "b" },
    ]);
  });

  it("marks pure deletions as removed", () => {
    const result = createUnifiedDiff("a\nb\n", "a\n");
    expect(result).toEqual([
      { type: "unchanged", value: "a" },
      { type: "removed", value: "b" },
    ]);
  });

  it("pairs a replaced line as modified", () => {
    const result = createUnifiedDiff("a\nb\n", "a\nc\n");
    expect(result).toEqual([
      { type: "unchanged", value: "a" },
      { type: "modified", oldValue: "b", newValue: "c" },
    ]);
  });

  it("splits uneven replacement blocks into paired + extra lines", () => {
    const result = createUnifiedDiff("a\nb\nc\n", "a\nx\nc\nd\n");
    expect(result).toEqual([
      { type: "unchanged", value: "a" },
      { type: "modified", oldValue: "b", newValue: "x" },
      { type: "unchanged", value: "c" },
      { type: "added", value: "d" },
    ]);
  });
});

describe("createUnifiedDiffText", () => {
  it("prefixes lines with space, - and +", () => {
    const text = createUnifiedDiffText("a\nb\n", "a\nc\n");
    expect(text).toBe("  a\n- b\n+ c");
  });
});

describe("createSideBySideDiff", () => {
  it("produces unchanged rows with aligned line numbers", () => {
    const result = createSideBySideDiff("a\nb\n", "a\nb\n");
    expect(result).toEqual([
      { type: "unchanged", left: { text: "a", lineNumber: 1 }, right: { text: "a", lineNumber: 1 } },
      { type: "unchanged", left: { text: "b", lineNumber: 2 }, right: { text: "b", lineNumber: 2 } },
    ]);
  });

  it("pairs replaced lines as modified rows", () => {
    const result = createSideBySideDiff("a\nb\n", "a\nc\n");
    expect(result[1]).toEqual({
      type: "modified",
      left: { text: "b", lineNumber: 2 },
      right: { text: "c", lineNumber: 2 },
    });
  });

  it("leaves the opposite side null for pure additions/removals", () => {
    const result = createSideBySideDiff("a\nb\n", "a\nb\nc\n");
    expect(result[2]).toEqual({
      type: "added",
      left: null,
      right: { text: "c", lineNumber: 3 },
    });

    const removed = createSideBySideDiff("a\nb\n", "a\n");
    expect(removed[1]).toEqual({
      type: "removed",
      left: { text: "b", lineNumber: 2 },
      right: null,
    });
  });
});

describe("computeWordDiff", () => {
  it("keeps everything as same for identical texts", () => {
    const [oldSegs, newSegs] = computeWordDiff("foo bar", "foo bar");
    expect(oldSegs).toEqual([{ text: "foo bar", type: "same" }]);
    expect(newSegs).toEqual([{ text: "foo bar", type: "same" }]);
  });

  it("marks the replaced word as removed/added", () => {
    const [oldSegs, newSegs] = computeWordDiff("foo bar", "foo baz");
    expect(oldSegs).toEqual([
      { text: "foo ", type: "same" },
      { text: "bar", type: "removed" },
    ]);
    expect(newSegs).toEqual([
      { text: "foo ", type: "same" },
      { text: "baz", type: "added" },
    ]);
  });
});

describe("createRawDiff", () => {
  it("returns sign-prefixed entries", () => {
    const result = createRawDiff("a\nb\n", "a\nc\n");
    expect(result).toEqual([
      { sign: " ", text: "a" },
      { sign: "-", text: "b" },
      { sign: "+", text: "c" },
    ]);
  });
});

describe("createStructuralDiff", () => {
  it("detects added, removed and modified leaves", () => {
    const base = { a: 1, b: { c: 2 }, d: 3 };
    const next = { a: 1, b: { c: 4 }, e: 5 };
    const result = createStructuralDiff(base, next);
    expect(result).toEqual([
      { path: "b", type: "modified", oldValue: { c: 2 }, newValue: { c: 4 } },
      { path: "d", type: "removed", oldValue: 3 },
      { path: "e", type: "added", newValue: 5 },
    ]);
  });

  it("reports an array whose element changed, using the parent path", () => {
    const result = createStructuralDiff(
      { items: [{ id: 1, name: "a" }] },
      { items: [{ id: 1, name: "b" }] },
    );
    expect(result).toEqual([
      { path: "items", type: "modified", oldValue: [{ id: 1, name: "a" }], newValue: [{ id: 1, name: "b" }] },
    ]);
  });

  it("drops child changes when the parent itself changed", () => {
    const result = createStructuralDiff(
      { a: { x: 1 } },
      { a: 2 },
    );
    expect(result).toEqual([
      { path: "a", type: "modified", oldValue: { x: 1 }, newValue: 2 },
    ]);
  });
});

describe("computeDiff", () => {
  it("returns unified + side-by-side results", () => {
    const result = computeDiff("a\nb\n", "a\nc\n");
    expect(result.unified[1]).toEqual({ type: "modified", oldValue: "b", newValue: "c" });
    expect(result.sideBySide[1].type).toBe("modified");
    expect(result.structural).toEqual([]);
  });

  it("includes structural changes when both datasets are provided", () => {
    const result = computeDiff("a\n", "a\n", { k: 1 }, { k: 2 });
    expect(result.structural).toEqual([
      { path: "k", type: "modified", oldValue: 1, newValue: 2 },
    ]);
  });
});
