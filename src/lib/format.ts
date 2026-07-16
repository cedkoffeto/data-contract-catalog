import { clsx as clsxFn, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function clsx(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(" ");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsxFn(inputs));
}

export function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

export function statusColor(status?: string): string {
  const normalized = (status ?? "").toLowerCase();
  if (["active", "published", "production"].includes(normalized)) {
    return "green";
  }
  if (["draft", "staging"].includes(normalized)) {
    return "yellow";
  }
  if (["deprecated", "archived"].includes(normalized)) {
    return "red";
  }
  return "gray";
}
