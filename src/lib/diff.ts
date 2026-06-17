import { diffLines as diffLinesLCS, diffWords } from "diff";

export type DiffChange = {
  type: "added" | "removed" | "unchanged";
  value: string;
  lineNumberLeft?: number;
  lineNumberRight?: number;
};

export type SideBySideLine = {
  type: "added" | "removed" | "unchanged" | "empty";
  left: { text: string; lineNumber: number | null } | null;
  right: { text: string; lineNumber: number | null } | null;
};

export type StructuralChange = {
  path: string;
  type: "added" | "removed" | "modified";
  oldValue?: unknown;
  newValue?: unknown;
};

export type DiffResult = {
  unified: DiffChange[];
  sideBySide: SideBySideLine[];
  structural: StructuralChange[];
};

export function createUnifiedDiff(base: string, next: string): DiffChange[] {
  const changes = diffLinesLCS(base, next);
  const result: DiffChange[] = [];

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, "").split("\n");
    if (change.added) {
      for (const line of lines) {
        result.push({ type: "added", value: line });
      }
    } else if (change.removed) {
      for (const line of lines) {
        result.push({ type: "removed", value: line });
      }
    } else {
      for (const line of lines) {
        result.push({ type: "unchanged", value: line });
      }
    }
  }

  return result;
}

export function createUnifiedDiffText(base: string, next: string): string {
  const changes = diffLinesLCS(base, next);
  const lines: string[] = [];

  for (const change of changes) {
    const chunk = change.value.replace(/\n$/, "");
    if (change.added) {
      for (const line of chunk.split("\n")) {
        lines.push(`+ ${line}`);
      }
    } else if (change.removed) {
      for (const line of chunk.split("\n")) {
        lines.push(`- ${line}`);
      }
    } else {
      for (const line of chunk.split("\n")) {
        lines.push(`  ${line}`);
      }
    }
  }

  return lines.join("\n");
}

export function createSideBySideDiff(base: string, next: string): SideBySideLine[] {
  const changes = diffLinesLCS(base, next);
  const result: SideBySideLine[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, "").split("\n");

    if (change.added) {
      for (const line of lines) {
        result.push({
          type: "added",
          left: null,
          right: { text: line, lineNumber: rightLine }
        });
        rightLine += 1;
      }
    } else if (change.removed) {
      for (const line of lines) {
        result.push({
          type: "removed",
          left: { text: line, lineNumber: leftLine },
          right: null
        });
        leftLine += 1;
      }
    } else {
      for (const line of lines) {
        result.push({
          type: "unchanged",
          left: { text: line, lineNumber: leftLine },
          right: { text: line, lineNumber: rightLine }
        });
        leftLine += 1;
        rightLine += 1;
      }
    }
  }

  return result;
}

function getValuePath(value: unknown, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = value;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)?.[key];
      if (Array.isArray(current)) {
        current = current[Number(index)];
      } else {
        return undefined;
      }
    } else if (typeof current === "object" && current !== null) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

function flattenObjectKeys(obj: unknown, prefix = ""): string[] {
  const keys: string[] = [];

  if (typeof obj === "object" && obj !== null) {
    if (Array.isArray(obj)) {
      for (let index = 0; index < obj.length; index += 1) {
        const childKeys = flattenObjectKeys(obj[index], `${prefix}[${index}]`);
        keys.push(...childKeys);
      }
    } else {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        keys.push(fullPath);

        if (typeof value === "object" && value !== null) {
          const childKeys = flattenObjectKeys(value, fullPath);
          keys.push(...childKeys);
        }
      }
    }
  }

  return keys;
}

export function createStructuralDiff(base: Record<string, unknown>, next: Record<string, unknown>): StructuralChange[] {
  const changes: StructuralChange[] = [];
  const baseKeys = new Set(flattenObjectKeys(base));
  const nextKeys = new Set(flattenObjectKeys(next));
  const allKeys = new Set([...baseKeys, ...nextKeys]);

  for (const key of allKeys) {
    const oldVal = getValuePath(base, key);
    const newVal = getValuePath(next, key);

    if (!baseKeys.has(key) && nextKeys.has(key)) {
      changes.push({ path: key, type: "added", newValue: newVal });
    } else if (baseKeys.has(key) && !nextKeys.has(key)) {
      changes.push({ path: key, type: "removed", oldValue: oldVal });
    } else if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({ path: key, type: "modified", oldValue: oldVal, newValue: newVal });
    }
  }

  return changes.sort((a, b) => a.path.localeCompare(b.path));
}

export function computeDiff(base: string, next: string, baseData?: Record<string, unknown>, nextData?: Record<string, unknown>): DiffResult {
  return {
    unified: createUnifiedDiff(base, next),
    sideBySide: createSideBySideDiff(base, next),
    structural: baseData && nextData ? createStructuralDiff(baseData, nextData) : []
  };
}
