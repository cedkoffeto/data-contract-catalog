import { autocompletion, startCompletion, type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import type { SyntaxNode } from "@lezer/common";

export type SlugIndexEntry = {
  slug: string;
  maturity: string;
  fields: string[];
};

export function buildSlugIndex(
  files: Array<{
    kind?: string;
    contractSlug?: string;
    maturity?: string;
    data?: { contract?: { schema?: { fields?: Array<{ name?: string }> } } };
  }>,
): Map<string, SlugIndexEntry> {
  const index = new Map<string, SlugIndexEntry>();
  for (const file of files) {
    if (file.kind !== "contract" || !file.contractSlug) continue;
    const fields = (file.data?.contract?.schema?.fields ?? [])
      .map((f) => f.name)
      .filter((n): n is string => n != null);
    if (!index.has(file.contractSlug)) {
      index.set(file.contractSlug, {
        slug: file.contractSlug,
        maturity: file.maturity ?? "",
        fields,
      });
    }
  }
  return index;
}

const STRING_NODE_TYPES = new Set(["Literal", "QuotedLiteral", "BlockLiteral"]);

function isInStringValue(context: CompletionContext): boolean {
  try {
    const node = syntaxTree(context.state).resolve(context.pos, -1);
    if (!node) return false;
    let cur: SyntaxNode | null = node;
    while (cur) {
      if (STRING_NODE_TYPES.has(cur.name)) return true;
      cur = cur.parent;
    }
  } catch {
    return false;
  }
  return false;
}

export function refAutocompleteSource(
  slugIndex: Map<string, SlugIndexEntry>,
): (context: CompletionContext) => CompletionResult | null {
  return (context: CompletionContext): CompletionResult | null => {
    const before = context.matchBefore(/@[\w.-]*$/);
    if (!before) return null;

    if (!isInStringValue(context)) return null;

    const text = before.text;
    const atPos = text.indexOf("@");
    if (atPos === -1) return null;

    const firstDotPos = text.indexOf(".", atPos + 1);

    if (firstDotPos === -1) {
      const prefix = text.slice(atPos + 1);

      const options = Array.from(slugIndex.entries())
        .filter(([slug]) => slug.startsWith(prefix))
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([slug]) => ({
          label: slug,
          type: "keyword" as const,
          detail: slugIndex.get(slug)?.maturity ?? "",
          apply: (view: EditorView, _comp: Completion, from: number, to: number) => {
            view.dispatch({
              changes: { from, to, insert: `${slug}.` },
              selection: { anchor: from + slug.length + 1 },
            });
            setTimeout(() => startCompletion(view), 0);
          },
        }));

      if (options.length === 0) return null;
      return { from: before.from + atPos + 1, options, filter: false };
    }

    const slug = text.slice(atPos + 1, firstDotPos);
    const fieldPrefix = text.slice(firstDotPos + 1);
    const entry = slugIndex.get(slug);
    if (!entry) return null;

    const options = entry.fields
      .filter((f) => f.startsWith(fieldPrefix))
      .sort()
      .map((f) => ({
        label: f,
        type: "property" as const,
      }));

    if (options.length === 0) return null;
    return { from: before.from + firstDotPos + 1, options, filter: false };
  };
}

export function createRefAutocomplete(slugIndex: Map<string, SlugIndexEntry>) {
  return autocompletion({ override: [refAutocompleteSource(slugIndex)] });
}
