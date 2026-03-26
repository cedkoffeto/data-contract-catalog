"use client";

import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";

import type { IChangeEvent } from "@rjsf/core";
import { yaml as yamlLanguage } from "@codemirror/lang-yaml";
import { foldGutter, indentUnit } from "@codemirror/language";
import { RangeSetBuilder, StateField } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { Decoration } from "@codemirror/view";
import Form from "@rjsf/shadcn";
import validator from "@rjsf/validator-ajv8";
import type { RJSFSchema, RJSFValidationError, UiSchema } from "@rjsf/utils";
import CodeMirror from "@uiw/react-codemirror";
import yaml from "js-yaml";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

import { ContractBody } from "@/src/components/contract/ContractBody";
import { ContractHeader } from "@/src/components/contract/ContractHeader";
import type { DataContract, EditorRepositoryFile } from "@/src/lib/types";

const uiSchema: UiSchema = {
  "ui:globalOptions": { copyable: false },
  "ui:order": [
    "asset",
    "contract",
    "quality",
    "security",
    "inputs",
    "output",
    "serving",
    "operations",
    "lineage",
    "extra_properties"
  ],
  asset: {
    "ui:classNames": "editor-form-section",
    "ui:title": "Asset",
    description: { "ui:widget": "textarea" }
  },
  contract: {
    "ui:classNames": "editor-form-section",
    "ui:title": "Contract",
    grain: { "ui:widget": "textarea" },
    schema: {
      "ui:classNames": "editor-form-section",
      fields: {
        items: {
          description: { "ui:widget": "textarea" },
          example: { "ui:widget": "textarea" }
        }
      }
    }
  },
  quality: { "ui:classNames": "editor-form-section", "ui:title": "Quality" },
  security: { "ui:classNames": "editor-form-section", "ui:title": "Security" },
  inputs: { "ui:classNames": "editor-form-section", "ui:title": "Inputs" },
  output: { "ui:classNames": "editor-form-section", "ui:title": "Output" },
  serving: { "ui:classNames": "editor-form-section", "ui:title": "Serving" },
  operations: { "ui:classNames": "editor-form-section", "ui:title": "Operations" },
  lineage: { "ui:classNames": "editor-form-section", "ui:title": "Lineage" },
  extra_properties: { "ui:classNames": "editor-form-section", "ui:title": "Extra properties" }
};

type WorkspaceTab = "yaml" | "form";
type BottomTab = "validation" | "history";
type ExplorerFolder = "workspace" | "schema" | "contracts" | "docs";

type WorkspaceDocument = EditorRepositoryFile & {
  isDirty?: boolean;
  isDraft?: boolean;
  originalContent: string;
  parseError?: string;
};

type HistoryEntry = {
  id: string;
  title: string;
  description: string;
  meta: string;
  author: string;
  ref: string;
};

type HistoryState = {
  items: HistoryEntry[];
  status: "idle" | "loading" | "ready" | "error";
  error: string | null;
};

type RepositoryHistoryResponse = {
  items: Array<{
    id: string;
    shortId: string;
    title: string;
    description: string;
    authoredDate: string;
    authorName: string;
    filePath: string;
  }>;
};

type RepositoryContentResponse = {
  filePath: string;
  ref: string;
  repositoryUrl: string;
  content: string;
};

type FileTreeNode = {
  folders: Map<string, FileTreeNode>;
  files: WorkspaceDocument[];
};

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseValidationPath(path: string) {
  return path
    .replace(/^root/, "")
    .replace(/\[['"]([^'"]+)['"]\]/g, ".$1")
    .replace(/\[(\d+)\]/g, ".$1")
    .replace(/^\./, "")
    .split(".")
    .filter((segment) => segment.length > 0 && !/^\d+$/.test(segment));
}

function findYamlLineForPath(content: string, path: string) {
  const segments = parseValidationPath(path);
  if (segments.length === 0) {
    return null;
  }

  const lines = content.split("\n");
  let searchStart = 0;
  let fallbackLine: number | null = null;

  for (const segment of segments) {
    const matcher = new RegExp(`^\\s*(?:-\\s+)?${escapeForRegExp(segment)}\\s*:`);
    const nextIndex = lines.findIndex((line, index) => index >= searchStart && matcher.test(line));
    if (nextIndex === -1) {
      return fallbackLine;
    }

    fallbackLine = nextIndex + 1;
    searchStart = nextIndex + 1;
  }

  return fallbackLine;
}

function createValidationDecorations(lineNumbers: number[]) {
  const uniqueLineNumbers = Array.from(new Set(lineNumbers.filter((lineNumber) => lineNumber > 0)));

  return EditorView.decorations.of((view) => {
    const builder = new RangeSetBuilder<Decoration>();

    uniqueLineNumbers.forEach((lineNumber) => {
      if (lineNumber > view.state.doc.lines) {
        return;
      }

      const line = view.state.doc.line(lineNumber);
      builder.add(line.from, line.from, Decoration.line({ attributes: { class: "cm-validationLine-error" } }));
    });

    return builder.finish();
  });
}

function createFileTree(files: WorkspaceDocument[], prefixToStrip: string) {
  const root: FileTreeNode = { folders: new Map(), files: [] };

  files.forEach((file) => {
    const relativePath = file.path.startsWith(prefixToStrip) ? file.path.slice(prefixToStrip.length) : file.name;
    const parts = relativePath.split("/").filter(Boolean);
    const folderParts = parts.slice(0, -1);
    let current = root;

    folderParts.forEach((part) => {
      if (!current.folders.has(part)) {
        current.folders.set(part, { folders: new Map(), files: [] });
      }
      current = current.folders.get(part)!;
    });

    current.files.push(file);
  });

  return root;
}

const rawEditorTheme = EditorView.theme({
  "&": { height: "100%", backgroundColor: "#ffffff", color: "#1f2937" },
  ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
  ".cm-content": { padding: "0.9rem 1rem 8rem" },
  ".cm-gutters": { backgroundColor: "#f8fafc", color: "#94a3b8", borderRight: "0" },
  ".cm-foldGutter .cm-gutterElement": {
    padding: "0 4px 0 2px",
    color: "#94a3b8"
  },
  ".cm-foldPlaceholder": {
    border: "0",
    background: "rgba(249, 115, 22, 0.10)",
    color: "#ea580c",
    borderRadius: "6px",
    padding: "0 6px"
  },
  ".cm-line.cm-diffLine-add": {
    backgroundColor: "rgba(22, 163, 74, 0.12)"
  },
  ".cm-line.cm-diffLine-remove": {
    backgroundColor: "rgba(220, 38, 38, 0.12)"
  },
  ".cm-line.cm-validationLine-error": {
    backgroundColor: "rgba(254, 242, 242, 0.92)",
    boxShadow: "inset 2px 0 0 rgba(248, 113, 113, 0.72)"
  },
  ".cm-activeLine": { backgroundColor: "rgba(148, 163, 184, 0.08)" },
  ".cm-cursor": { borderLeftColor: "#f97316" },
  ".cm-selectionBackground, ::selection": { backgroundColor: "rgba(249, 115, 22, 0.12) !important" },
  ".cm-focused": { outline: "none" }
});

const diffLineDecorations = StateField.define({
  create(state) {
    const builder = new RangeSetBuilder<Decoration>();
    for (let lineNumber = 1; lineNumber <= state.doc.lines; lineNumber += 1) {
      const line = state.doc.line(lineNumber);
      if (line.text.startsWith("+ ")) {
        builder.add(line.from, line.from, Decoration.line({ attributes: { class: "cm-diffLine-add" } }));
      } else if (line.text.startsWith("- ")) {
        builder.add(line.from, line.from, Decoration.line({ attributes: { class: "cm-diffLine-remove" } }));
      }
    }

    return builder.finish();
  },
  update(decorations, transaction) {
    if (!transaction.docChanged) {
      return decorations;
    }

    const builder = new RangeSetBuilder<Decoration>();
    for (let lineNumber = 1; lineNumber <= transaction.state.doc.lines; lineNumber += 1) {
      const line = transaction.state.doc.line(lineNumber);
      if (line.text.startsWith("+ ")) {
        builder.add(line.from, line.from, Decoration.line({ attributes: { class: "cm-diffLine-add" } }));
      } else if (line.text.startsWith("- ")) {
        builder.add(line.from, line.from, Decoration.line({ attributes: { class: "cm-diffLine-remove" } }));
      }
    }
    return builder.finish();
  },
  provide: (field) => EditorView.decorations.from(field)
});

function createDownload(filename: string, contents: string, contentType: string) {
  const blob = new Blob([contents], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function normalizeContractFileStem(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "new-contract";
}

function buildContractFileLocation(assetId: string, baseDirectory: string) {
  const segments = assetId
    .split("/")
    .map((segment) => normalizeContractFileStem(segment))
    .filter(Boolean);
  const safeSegments = segments.length > 0 ? segments : ["new-contract"];
  const filename = `${safeSegments[safeSegments.length - 1]}.yaml`;
  const nestedPath = safeSegments.join("/");

  return {
    name: filename,
    path: `${baseDirectory}/${nestedPath}.yaml`
  };
}

function syncDocumentFileMetadata(document: WorkspaceDocument, nextData?: DataContract): Pick<WorkspaceDocument, "name" | "path"> {
  if (document.kind !== "contract") {
    return {
      name: document.name,
      path: document.path
    };
  }

  const assetId = nextData?.asset?.id?.trim();
  const directory = document.maturity ? `contracts/${document.maturity}` : document.isDraft ? "contracts/draft" : "contracts";
  const fallbackId = document.isDraft ? "new-contract" : document.name.replace(/\.(yaml|yml)$/i, "");

  return buildContractFileLocation(assetId || fallbackId, directory);
}

function renderMarkdownInline(value: string): ReactNode[] {
  const matches = Array.from(value.matchAll(/(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`)/g));
  const nodes: ReactNode[] = [];
  let cursor = 0;

  matches.forEach((match, index) => {
    const [fullMatch, , linkLabel, linkHref, inlineCode] = match;
    const start = match.index ?? 0;

    if (start > cursor) {
      nodes.push(value.slice(cursor, start));
    }

    if (linkLabel && linkHref) {
      nodes.push(
        <a key={`link-${index}-${linkHref}`} href={linkHref} target="_blank" rel="noreferrer">
          {linkLabel}
        </a>
      );
    } else if (inlineCode) {
      nodes.push(<code key={`code-${index}-${inlineCode}`}>{inlineCode}</code>);
    }

    cursor = start + fullMatch.length;
  });

  if (cursor < value.length) {
    nodes.push(value.slice(cursor));
  }

  return nodes;
}

function renderMarkdownDocument(content: string) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push(
        <pre key={`code-${blocks.length}`} className="editor-markdown-sheet__code">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const contentNodes = renderMarkdownInline(headingMatch[2]);
      if (level === 1) {
        blocks.push(
          <h1 key={`h1-${blocks.length}`} className="editor-markdown-sheet__h1">
            {contentNodes}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={`h2-${blocks.length}`} className="editor-markdown-sheet__h2">
            {contentNodes}
          </h2>
        );
      } else {
        blocks.push(
          <h3 key={`h3-${blocks.length}`} className="editor-markdown-sheet__h3">
            {contentNodes}
          </h3>
        );
      }
      index += 1;
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2));
        index += 1;
      }
      blocks.push(
        <ul key={`ul-${blocks.length}`} className="editor-markdown-sheet__list">
          {items.map((item, itemIndex) => (
            <li key={`li-${itemIndex}`}>{renderMarkdownInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    const paragraphLines: string[] = [];
    while (index < lines.length && lines[index].trim() && !lines[index].trim().startsWith("```")) {
      if (/^#{1,3}\s+/.test(lines[index].trim()) || lines[index].trim().startsWith("- ")) {
        break;
      }
      paragraphLines.push(lines[index].trim());
      index += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push(
        <p key={`p-${blocks.length}`} className="editor-markdown-sheet__paragraph">
          {renderMarkdownInline(paragraphLines.join(" "))}
        </p>
      );
      continue;
    }

    index += 1;
  }

  return blocks;
}

function buildInitialDocuments(initialData: DataContract, repositoryFiles: EditorRepositoryFile[]): WorkspaceDocument[] {
  const initialDraft = createDraftDocument(initialData, 1);

  return [
    initialDraft,
    ...repositoryFiles.map((file) => ({
      ...file,
      originalContent: file.content
    }))
  ];
}

function createDraftDocument(initialData: DataContract, sequence: number): WorkspaceDocument {
  const baseStem = sequence === 1 ? "new-contract" : `new-contract-${sequence}`;
  const draftData = {
    ...initialData,
    asset: {
      ...(initialData.asset ?? {}),
      id: initialData.asset?.id?.trim() ? initialData.asset.id : baseStem,
      name: initialData.asset?.name?.trim() ? initialData.asset.name : baseStem
    }
  } satisfies DataContract;
  const newContractContent = yaml.dump(draftData, { lineWidth: 120, noRefs: true });
  const draftFileMetadata = syncDocumentFileMetadata(
    {
      id: `draft-contract-${sequence}`,
      name: `${baseStem}.yaml`,
      path: `contracts/draft/${baseStem}.yaml`,
      kind: "contract",
      content: newContractContent,
      contractSlug: `draft-contract-${sequence}`,
      maturity: "draft",
      data: draftData,
      isDraft: true,
      originalContent: newContractContent
    },
    draftData
  );

  return {
    id: `draft-contract-${sequence}`,
    name: draftFileMetadata.name,
    path: draftFileMetadata.path,
    kind: "contract",
    content: newContractContent,
    contractSlug: `draft-contract-${sequence}`,
    maturity: "draft",
    data: draftData,
    isDraft: true,
    originalContent: newContractContent
  };
}

function createUnifiedDiff(base: string, next: string): string {
  const left = base.split("\n");
  const right = next.split("\n");
  const max = Math.max(left.length, right.length);
  const lines: string[] = [];

  for (let index = 0; index < max; index += 1) {
    const before = left[index];
    const after = right[index];

    if (before === after) {
      if (before !== undefined) {
        lines.push(`  ${before}`);
      }
      continue;
    }

    if (before !== undefined) {
      lines.push(`- ${before}`);
    }
    if (after !== undefined) {
      lines.push(`+ ${after}`);
    }
  }

  return lines.join("\n");
}

function formatHistoryMeta(value: string) {
  if (!value) {
    return "Repository";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function FolderIcon() {
  return (
    <span className="repo-tree__folder-icon" aria-hidden="true">
      <svg viewBox="0 0 16 16" fill="none">
        <path
          d="M1.75 4.25A1.25 1.25 0 013 3h3.085c.332 0 .65.132.884.366l.665.665c.234.234.552.366.884.366H13A1.25 1.25 0 0114.25 5.75v5A1.25 1.25 0 0113 12H3a1.25 1.25 0 01-1.25-1.25v-6.5z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function ContractEditorClient({
  initialContractSlug,
  initialData,
  repositoryFiles,
  schema
}: {
  initialContractSlug?: string;
  initialData: DataContract;
  repositoryFiles: EditorRepositoryFile[];
  schema: RJSFSchema;
}) {
  const [documents, setDocuments] = useState<WorkspaceDocument[]>(() => buildInitialDocuments(initialData, repositoryFiles));
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("yaml");
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>("validation");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [explorerQuery, setExplorerQuery] = useState("");
  const [workspaceMessage, setWorkspaceMessage] = useState("Ready");
  const [selectedHistoryEntryId, setSelectedHistoryEntryId] = useState<string | null>(null);
  const [mainViewMode, setMainViewMode] = useState<"current" | "history" | "compare">("current");
  const [historyBySlug, setHistoryBySlug] = useState<Record<string, HistoryState>>({});
  const [historyVersionCache, setHistoryVersionCache] = useState<Record<string, string>>({});
  const [historyReloadToken, setHistoryReloadToken] = useState(0);
  const [historyActionState, setHistoryActionState] = useState<{ entryId: string | null; mode: "history" | "compare" | null }>({
    entryId: null,
    mode: null
  });
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);
  const [isPreviewOpen, setIsPreviewOpen] = useState(true);
  const [isBottomPanelOpen, setIsBottomPanelOpen] = useState(false);
  const [openFolders, setOpenFolders] = useState<Record<ExplorerFolder, boolean>>({
    workspace: true,
    schema: false,
    contracts: true,
    docs: false
  });
  const [openContractGroups, setOpenContractGroups] = useState<Record<string, boolean>>({
    bronze: false,
    silver: true,
    gold: true,
    draft: true
  });
  const [selectedDocumentId, setSelectedDocumentId] = useState(() => {
    if (initialContractSlug && repositoryFiles.some((file) => file.contractSlug === initialContractSlug)) {
      return initialContractSlug;
    }
    return "draft-contract-1";
  });

  const selectedDocument =
    documents.find((document) => document.id === selectedDocumentId) ??
    documents.find((document) => document.id === "draft-contract-1")!;

  const selectedIndex = documents.findIndex((document) => document.id === selectedDocument.id);
  const selectedData = selectedDocument.data ?? initialData;
  const isContractDocument = selectedDocument.kind === "contract";
  const isEditable = isContractDocument;
  const yamlValidationState = useMemo(() => {
    if (!isContractDocument) {
      return {
        data: null as DataContract | null,
        parseError: null as string | null,
        parseLineNumber: null as number | null
      };
    }

    try {
      const parsed = (yaml.load(selectedDocument.content) as DataContract) ?? {};
      return {
        data: parsed,
        parseError: null as string | null,
        parseLineNumber: null as number | null
      };
    } catch (error) {
      const markedError = error as { mark?: { line?: number } };
      return {
        data: null as DataContract | null,
        parseError: error instanceof Error ? error.message : "Invalid YAML",
        parseLineNumber: typeof markedError.mark?.line === "number" ? markedError.mark.line + 1 : null
      };
    }
  }, [isContractDocument, selectedDocument.content]);

  const validationResult = useMemo(() => {
    if (!isContractDocument) {
      return null;
    }
    if (!yamlValidationState.data) {
      return null;
    }

    return validator.validateFormData(yamlValidationState.data, schema);
  }, [isContractDocument, schema, yamlValidationState.data]);

  const validationErrors = (validationResult?.errors ?? []) as RJSFValidationError[];
  const validationIssueCount = yamlValidationState.parseError ? 1 : validationErrors.length;
  const historyEntries = useMemo(() => {
    if (!isContractDocument || selectedDocument.isDraft || !selectedDocument.contractSlug) {
      return [];
    }

    return historyBySlug[selectedDocument.contractSlug]?.items ?? [];
  }, [historyBySlug, isContractDocument, selectedDocument.contractSlug, selectedDocument.isDraft]);
  const selectedHistoryEntry = historyEntries.find((entry) => entry.id === selectedHistoryEntryId) ?? null;
  const selectedHistoryContent = selectedHistoryEntry ? historyVersionCache[`${selectedDocument.contractSlug ?? selectedDocument.id}:${selectedHistoryEntry.ref}`] : null;
  const filename = selectedDocument.name.replace(/\.(yaml|yml|json|md)$/i, "") || "contract";
  const displayedYaml = useMemo(() => {
    if (mainViewMode === "history" && selectedHistoryContent) {
      return selectedHistoryContent;
    }
    if (mainViewMode === "compare" && selectedHistoryContent) {
      return createUnifiedDiff(selectedHistoryContent, selectedDocument.content);
    }
    return selectedDocument.content;
  }, [mainViewMode, selectedDocument.content, selectedHistoryContent]);
  const isHistoryYamlView = mainViewMode === "history" && !!selectedHistoryEntry && !!selectedHistoryContent;
  const isCompareYamlView = mainViewMode === "compare" && !!selectedHistoryEntry && !!selectedHistoryContent;
  const activeHistoryState = selectedDocument.contractSlug ? historyBySlug[selectedDocument.contractSlug] : undefined;
  const activeHistoryStatus = activeHistoryState?.status ?? "idle";
  const validationIssueLines = useMemo(() => {
    if (!isContractDocument || activeTab !== "yaml" || isHistoryYamlView || isCompareYamlView) {
      return [];
    }

    if (yamlValidationState.parseLineNumber) {
      return [yamlValidationState.parseLineNumber];
    }

    return validationErrors
      .map((error) => findYamlLineForPath(selectedDocument.content, error.property ?? ""))
      .filter((lineNumber): lineNumber is number => typeof lineNumber === "number");
  }, [
    activeTab,
    isCompareYamlView,
    isContractDocument,
    isHistoryYamlView,
    selectedDocument.content,
    validationErrors,
    yamlValidationState.parseLineNumber
  ]);
  const normalizedExplorerQuery = explorerQuery.trim().toLowerCase();

  const contractsByMaturity = useMemo(() => {
    const groups = new Map<string, WorkspaceDocument[]>();
    documents
      .filter((document) => document.kind === "contract" && !document.isDraft)
      .forEach((document) => {
        const key = document.maturity ?? "draft";
        groups.set(key, [...(groups.get(key) ?? []), document]);
      });
    return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right));
  }, [documents]);
  const visibleSchemaDocuments = useMemo(
    () =>
      documents.filter((document) => {
        if (!document.path.startsWith("schema/")) {
          return false;
        }

        if (!normalizedExplorerQuery) {
          return true;
        }

        return `${document.name} ${document.path}`.toLowerCase().includes(normalizedExplorerQuery);
      }),
    [documents, normalizedExplorerQuery]
  );
  const visibleDocsDocuments = useMemo(
    () =>
      documents.filter((document) => {
        if (document.path !== "README.md") {
          return false;
        }

        if (!normalizedExplorerQuery) {
          return true;
        }

        return `${document.name} ${document.path}`.toLowerCase().includes(normalizedExplorerQuery);
      }),
    [documents, normalizedExplorerQuery]
  );
  const visibleWorkspaceDocuments = useMemo(
    () =>
      documents.filter((document) => {
        if (!document.isDraft && !document.isDirty) {
          return false;
        }

        if (!normalizedExplorerQuery) {
          return true;
        }

        return `${document.name} ${document.path}`.toLowerCase().includes(normalizedExplorerQuery);
      }),
    [documents, normalizedExplorerQuery]
  );
  const visibleContractsByMaturity = useMemo(() => {
    if (!normalizedExplorerQuery) {
      return contractsByMaturity;
    }

    return contractsByMaturity
      .map(([maturity, files]) => [
        maturity,
        files.filter((document) => `${document.name} ${document.path} ${maturity}`.toLowerCase().includes(normalizedExplorerQuery))
      ] as const)
      .filter(([, files]) => files.length > 0);
  }, [contractsByMaturity, normalizedExplorerQuery]);
  const contractTreesByMaturity = useMemo(
    () =>
      visibleContractsByMaturity.map(([maturity, files]) => [
        maturity,
        createFileTree(files, `contracts/${maturity}/`)
      ] as const),
    [visibleContractsByMaturity]
  );

  useEffect(() => {
    if (!isContractDocument || selectedDocument.isDraft || !selectedDocument.contractSlug) {
      return;
    }

    if (activeHistoryStatus !== "idle") {
      return;
    }

    let isCancelled = false;
    const slug = selectedDocument.contractSlug;

    setHistoryBySlug((current) => ({
      ...current,
      [slug]: {
        items: current[slug]?.items ?? [],
        status: "loading",
        error: null
      }
    }));

    console.info("[editor.history] Fetching contract history", {
      slug,
      selectedDocumentId: selectedDocument.id,
      path: selectedDocument.path
    });

    void fetch(`/api/contracts/${slug}/history`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as RepositoryHistoryResponse | { error?: string };
        console.info("[editor.history] History API response", {
          slug,
          ok: response.ok,
          status: response.status,
          payload
        });

        if (!response.ok) {
          throw new Error("error" in payload && payload.error ? payload.error : "Unable to load repository history");
        }

        if (isCancelled) {
          return;
        }

        const mappedItems = payload.items.map((entry) => ({
          id: entry.id,
          ref: entry.id,
          title: entry.title,
          description: entry.description,
          meta: `${entry.shortId} · ${formatHistoryMeta(entry.authoredDate)}`,
          author: entry.authorName
        }));

        console.info("[editor.history] Mapped history items", {
          slug,
          count: mappedItems.length,
          firstItem: mappedItems[0] ?? null
        });

        setHistoryBySlug((current) => ({
          ...current,
          [slug]: {
            items: mappedItems,
            status: "ready",
            error: null
          }
        }));
      })
      .catch((error: unknown) => {
        if (isCancelled) {
          return;
        }

        console.error("[editor.history] Failed to load history", {
          slug,
          error
        });

        setHistoryBySlug((current) => ({
          ...current,
          [slug]: {
            items: [],
            status: "error",
            error: error instanceof Error ? error.message : "Unable to load repository history"
          }
        }));
      });

    return () => {
      isCancelled = true;
    };
  }, [historyReloadToken, isContractDocument, selectedDocument.contractSlug, selectedDocument.id, selectedDocument.isDraft, selectedDocument.path]);

  useEffect(() => {
    if (!isContractDocument || activeBottomTab !== "history") {
      return;
    }

    console.info("[editor.history] Render state", {
      selectedDocumentId: selectedDocument.id,
      slug: selectedDocument.contractSlug ?? null,
      isDraft: !!selectedDocument.isDraft,
      activeBottomTab,
      isBottomPanelOpen,
      activeHistoryStatus,
      historyEntriesCount: historyEntries.length,
      selectedHistoryEntryId,
      firstEntry: historyEntries[0] ?? null
    });
  }, [
    activeBottomTab,
    activeHistoryStatus,
    historyEntries,
    isBottomPanelOpen,
    isContractDocument,
    selectedDocument.contractSlug,
    selectedDocument.id,
    selectedDocument.isDraft,
    selectedHistoryEntryId
  ]);

  async function loadHistoryVersion(entry: HistoryEntry) {
    if (!selectedDocument.contractSlug) {
      return null;
    }

    const cacheKey = `${selectedDocument.contractSlug}:${entry.ref}`;
    if (historyVersionCache[cacheKey]) {
      return historyVersionCache[cacheKey];
    }

    const response = await fetch(
      `/api/contracts/${selectedDocument.contractSlug}/repository-content?ref=${encodeURIComponent(entry.ref)}`,
      { cache: "no-store" }
    );
    const payload = (await response.json()) as RepositoryContentResponse | { error?: string };

    if (!response.ok) {
      throw new Error("error" in payload && payload.error ? payload.error : "Unable to load repository file");
    }

    setHistoryVersionCache((current) => ({
      ...current,
      [cacheKey]: payload.content
    }));

    return payload.content;
  }

  async function openHistoryEntry(entry: HistoryEntry, mode: "history" | "compare") {
    setHistoryActionState({ entryId: entry.id, mode });

    try {
      await loadHistoryVersion(entry);
      setSelectedHistoryEntryId(entry.id);
      setMainViewMode(mode);
      setActiveTab("yaml");
      setWorkspaceMessage(mode === "compare" ? "Repository diff opened" : "Repository version opened");
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : "Unable to load repository version");
    } finally {
      setHistoryActionState({ entryId: null, mode: null });
    }
  }

  function renderFileNodes(tree: FileTreeNode, keyPrefix: string): ReactNode {
    const folderEntries = Array.from(tree.folders.entries()).sort(([left], [right]) => left.localeCompare(right));
    const fileEntries = [...tree.files].sort((left, right) => left.name.localeCompare(right.name));

    return (
      <>
        {folderEntries.map(([folderName, node]) => (
          <div key={`${keyPrefix}-folder-${folderName}`} className="repo-tree__nested">
            <div className="repo-tree__folder-row">
              <span className="repo-tree__folder-spacer" aria-hidden="true" />
              <FolderIcon />
              <span>{folderName}</span>
            </div>
            <div className="repo-tree__children repo-tree__children--nested">{renderFileNodes(node, `${keyPrefix}-${folderName}`)}</div>
          </div>
        ))}

        {fileEntries.map((document) => (
          <button
            key={document.id}
            className={selectedDocument.id === document.id ? "repo-tree__file is-active" : "repo-tree__file"}
            onClick={() => selectDocument(document.id)}
            type="button"
          >
            <span className="repo-tree__file-main">
              <span
                className={
                  document.kind === "json"
                    ? "repo-tree__file-icon repo-tree__file-icon--json"
                    : document.kind === "markdown"
                      ? "repo-tree__file-icon repo-tree__file-icon--md"
                      : "repo-tree__file-icon repo-tree__file-icon--yaml"
                }
              >
                {document.kind === "json" ? "{}" : document.kind === "markdown" ? "M" : "Y"}
              </span>
              <span>{document.name}</span>
            </span>
            {document.isDraft ? <span>draft</span> : null}
          </button>
        ))}
      </>
    );
  }

  function updateDocument(updater: (document: WorkspaceDocument) => WorkspaceDocument) {
    setDocuments((current) => current.map((document, index) => (index === selectedIndex ? updater(document) : document)));
  }

  function selectDocument(id: string) {
    setSelectedDocumentId(id);
    setSelectedHistoryEntryId(null);
    setMainViewMode("current");
    setWorkspaceMessage("File opened");
  }

  function handleCreateDraft() {
    const nextSequence = documents.filter((document) => document.isDraft).length + 1;
    const nextDraft = createDraftDocument(initialData, nextSequence);

    setDocuments((current) => [nextDraft, ...current]);
    setSelectedDocumentId(nextDraft.id);
    setOpenFolders((current) => ({ ...current, workspace: true }));
    setWorkspaceMessage("New contract draft created");
  }

  function toggleFolder(folder: ExplorerFolder) {
    setOpenFolders((current) => ({ ...current, [folder]: !current[folder] }));
  }

  function toggleContractGroup(group: string) {
    setOpenContractGroups((current) => ({ ...current, [group]: !current[group] }));
  }

  function handleContentChange(value: string) {
    if (!isEditable) {
      return;
    }

    let syncedFileMetadata: Pick<WorkspaceDocument, "name" | "path"> | null = null;
    try {
      const parsed = (yaml.load(value) as DataContract) ?? {};
      syncedFileMetadata = syncDocumentFileMetadata(selectedDocument, parsed);
    } catch {
      syncedFileMetadata = null;
    }

    updateDocument((document) => ({
      ...document,
      content: value,
      ...(syncedFileMetadata ?? {}),
      isDirty: value !== document.originalContent,
      parseError: undefined
    }));
    setWorkspaceMessage("Editing YAML");
  }

  function handleContractNameChange(value: string) {
    if (!isContractDocument) {
      return;
    }

    const nextName = value;
    const nextData = {
      ...selectedData,
      asset: {
        ...(selectedData.asset ?? {}),
        name: nextName
      }
    } satisfies DataContract;
    const nextYaml = yaml.dump(nextData, { lineWidth: 120, noRefs: true });

    updateDocument((document) => ({
      ...document,
      data: nextData,
      content: nextYaml,
      isDirty: nextYaml !== document.originalContent,
      parseError: undefined
    }));
    setWorkspaceMessage("Contract name updated");
  }

  function applyYamlDraft() {
    if (!isContractDocument) {
      return;
    }

    try {
      const next = (yaml.load(selectedDocument.content) as DataContract) ?? {};
      const syncedFileMetadata = syncDocumentFileMetadata(selectedDocument, next);
      updateDocument((document) => ({
        ...document,
        data: next,
        ...syncedFileMetadata,
        parseError: undefined,
        isDirty: document.content !== document.originalContent
      }));
      setWorkspaceMessage("YAML applied to contract preview");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid YAML";
      updateDocument((document) => ({
        ...document,
        parseError: message
      }));
      setWorkspaceMessage(`YAML error: ${message}`);
    }
  }

  function handleFormChange(event: IChangeEvent<DataContract>) {
    const next = (event.formData ?? {}) as DataContract;
    const nextYaml = yaml.dump(next, { lineWidth: 120, noRefs: true });
    const syncedFileMetadata = syncDocumentFileMetadata(selectedDocument, next);
    updateDocument((document) => ({
      ...document,
      data: next,
      ...syncedFileMetadata,
      content: nextYaml,
      isDirty: nextYaml !== document.originalContent,
      parseError: undefined
    }));
    setWorkspaceMessage("Form changes synchronized to YAML");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(selectedDocument.content);
      setCopyState("copied");
      setWorkspaceMessage("File copied to clipboard");
      window.setTimeout(() => setCopyState("idle"), 1600);
    } catch {
      setCopyState("error");
      setWorkspaceMessage("Copy failed");
      window.setTimeout(() => setCopyState("idle"), 1600);
    }
  }

  function handleReset() {
    updateDocument((document) => {
      const restoredData =
        document.kind === "contract" ? (((yaml.load(document.originalContent) as DataContract) ?? {}) as DataContract) : document.data;

      if (!document.isDraft) {
        return {
          ...document,
          content: document.originalContent,
          data: restoredData,
          isDirty: false,
          parseError: undefined
        };
      }

      const nextDraftData = {
        ...initialData,
        asset: {
          ...(initialData.asset ?? {}),
          id: initialData.asset?.id?.trim() ? initialData.asset.id : "new-contract",
          name: initialData.asset?.name?.trim() ? initialData.asset.name : "new-contract"
        }
      } satisfies DataContract;
      const nextContent = yaml.dump(nextDraftData, { lineWidth: 120, noRefs: true });
      const syncedFileMetadata = syncDocumentFileMetadata(document, nextDraftData);
      return {
        ...document,
        ...syncedFileMetadata,
        content: nextContent,
        originalContent: nextContent,
        data: nextDraftData,
        isDirty: false,
        parseError: undefined
      };
    });
    setWorkspaceMessage("Workspace reset");
  }

  function openBottomPanel(tab: BottomTab) {
    if (
      tab === "history" &&
      isContractDocument &&
      !selectedDocument.isDraft &&
      selectedDocument.contractSlug &&
      activeHistoryStatus === "error"
    ) {
      setHistoryBySlug((current) => ({
        ...current,
        [selectedDocument.contractSlug!]: {
          items: current[selectedDocument.contractSlug!]?.items ?? [],
          status: "idle",
          error: null
        }
      }));
      setHistoryReloadToken((current) => current + 1);
    }

    setActiveBottomTab(tab);
    setIsBottomPanelOpen(true);
  }

  function toggleBottomPanel(tab: BottomTab) {
    if (isBottomPanelOpen && activeBottomTab === tab) {
      setIsBottomPanelOpen(false);
      return;
    }

    openBottomPanel(tab);
  }

  return (
    <PanelGroup
      key={`explorer-${isExplorerOpen}-preview-${isPreviewOpen}`}
      className="editor-workbench"
      direction="horizontal"
    >
      {isExplorerOpen ? (
        <>
          <Panel className="editor-panel" defaultSize={18} id="explorer" minSize={12}>
            <aside className="repo-sidebar">
              <div className="repo-sidebar__header">
                <h2>Explorer</h2>
                <button className="repo-sidebar__new" onClick={handleCreateDraft} type="button">
                  New
                </button>
              </div>

              <label className="repo-sidebar__search">
                <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                <input
                  aria-label="Search explorer"
                  onChange={(event) => setExplorerQuery(event.target.value)}
                  placeholder="Search files"
                  type="search"
                  value={explorerQuery}
                />
              </label>

              <div className="repo-tree">
                <div className="repo-tree__section">
                  <button className="repo-tree__folder-toggle" onClick={() => toggleFolder("workspace")} type="button">
                    <span className={openFolders.workspace ? "repo-tree__chevron is-open" : "repo-tree__chevron"}>▾</span>
                    <FolderIcon />
                    <span>workspace</span>
                  </button>
                  {openFolders.workspace ? (
                    <div className="repo-tree__children">
                      {visibleWorkspaceDocuments.map((document) => (
                        <button
                          key={document.id}
                          className={selectedDocument.id === document.id ? "repo-tree__file is-active" : "repo-tree__file"}
                          onClick={() => selectDocument(document.id)}
                          type="button"
                        >
                          <span className="repo-tree__file-main">
                            <span className="repo-tree__file-icon repo-tree__file-icon--yaml">Y</span>
                            <span>{document.isDraft ? document.path.replace(/^contracts\/draft\//, "") : document.path}</span>
                          </span>
                          <span>{document.isDraft ? "draft" : "dirty"}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="repo-tree__section">
                  <button className="repo-tree__folder-toggle" onClick={() => toggleFolder("schema")} type="button">
                    <span className={openFolders.schema ? "repo-tree__chevron is-open" : "repo-tree__chevron"}>▾</span>
                    <FolderIcon />
                    <span>schema</span>
                  </button>
                  {openFolders.schema ? (
                    <div className="repo-tree__children">
                      {visibleSchemaDocuments.map((document) => (
                        <button
                          key={document.id}
                          className={selectedDocument.id === document.id ? "repo-tree__file is-active" : "repo-tree__file"}
                          onClick={() => selectDocument(document.id)}
                          type="button"
                        >
                          <span className="repo-tree__file-main">
                            <span
                              className={
                                document.kind === "json"
                                  ? "repo-tree__file-icon repo-tree__file-icon--json"
                                  : "repo-tree__file-icon repo-tree__file-icon--yaml"
                              }
                            >
                              {document.kind === "json" ? "{}" : "Y"}
                            </span>
                            <span>{document.name}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="repo-tree__section">
                  <button className="repo-tree__folder-toggle" onClick={() => toggleFolder("contracts")} type="button">
                    <span className={openFolders.contracts ? "repo-tree__chevron is-open" : "repo-tree__chevron"}>▾</span>
                    <FolderIcon />
                    <span>contracts</span>
                  </button>
                  {openFolders.contracts ? (
                    <div className="repo-tree__children">
                      {contractTreesByMaturity.map(([maturity, tree]) => (
                        <div key={maturity} className="repo-tree__nested">
                          <button
                            className="repo-tree__folder-toggle repo-tree__folder-toggle--nested"
                            onClick={() => toggleContractGroup(maturity)}
                            type="button"
                          >
                            <span className={openContractGroups[maturity] ? "repo-tree__chevron is-open" : "repo-tree__chevron"}>▾</span>
                            <FolderIcon />
                            <span>{maturity}</span>
                          </button>
                          {openContractGroups[maturity] ? (
                            <div className="repo-tree__children repo-tree__children--nested">{renderFileNodes(tree, `contracts-${maturity}`)}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="repo-tree__section">
                  <button className="repo-tree__folder-toggle" onClick={() => toggleFolder("docs")} type="button">
                    <span className={openFolders.docs ? "repo-tree__chevron is-open" : "repo-tree__chevron"}>▾</span>
                    <FolderIcon />
                    <span>docs</span>
                  </button>
                  {openFolders.docs ? (
                    <div className="repo-tree__children">
                      {visibleDocsDocuments.map((document) => (
                        <button
                          key={document.id}
                          className={selectedDocument.id === document.id ? "repo-tree__file is-active" : "repo-tree__file"}
                          onClick={() => selectDocument(document.id)}
                          type="button"
                        >
                          <span className="repo-tree__file-main">
                            <span className="repo-tree__file-icon repo-tree__file-icon--md">M</span>
                            <span>{document.name}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>
          </Panel>

          <PanelResizeHandle className="editor-resize-handle">
            <span className="editor-resize-handle__grip" />
          </PanelResizeHandle>
        </>
      ) : null}

      <Panel className="editor-panel" id="editor-main" minSize={30}>
        <section className="editor-main-pane">
          <div className="editor-topbar">
            <button
              aria-label={isExplorerOpen ? "Hide explorer" : "Show explorer"}
              className="editor-edge-toggle"
              onClick={() => setIsExplorerOpen((current) => !current)}
              title={isExplorerOpen ? "Hide explorer" : "Show explorer"}
              type="button"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d={isExplorerOpen ? "M11.5 5.5L7 10l4.5 4.5" : "M8.5 5.5L13 10l-4.5 4.5"}
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div className="editor-topbar__title">
              <div className="editor-breadcrumb">{selectedDocument.path}</div>
              <div className="editor-title-row">
                {isContractDocument ? (
                  <input
                    aria-label="Contract name"
                    className="editor-title-input"
                    onChange={(event) => handleContractNameChange(event.target.value)}
                    type="text"
                    value={selectedData.asset?.name ?? ""}
                  />
                ) : (
                  <h1 className="editor-title">{selectedDocument.name}</h1>
                )}
                {selectedDocument.isDirty ? <span className="editor-inline-tag">Unsaved</span> : null}
              </div>
            </div>

            <div className="editor-topbar__actions">
              <button className="editor-soft-button" onClick={handleReset} type="button">
                Reset
              </button>
              <button className="editor-soft-button" onClick={handleCopy} type="button">
                {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy"}
              </button>
              <button
                className="editor-primary-button"
                onClick={() =>
                  createDownload(
                    `${filename}.${selectedDocument.kind === "json" ? "json" : selectedDocument.kind === "markdown" ? "md" : "yaml"}`,
                    selectedDocument.content,
                    "text/plain"
                  )
                }
                type="button"
              >
                Download
              </button>

              <button
                aria-label={isPreviewOpen ? "Hide preview" : "Show preview"}
                className="editor-edge-toggle"
                onClick={() => setIsPreviewOpen((current) => !current)}
                title={isPreviewOpen ? "Hide preview" : "Show preview"}
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path
                    d={isPreviewOpen ? "M8.5 5.5L13 10l-4.5 4.5" : "M11.5 5.5L7 10l4.5 4.5"}
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div className="editor-status-strip">
            {selectedDocument.parseError ? <div className="editor-status-pill is-warning">YAML error</div> : null}
          </div>

          <div className="editor-tabs" role="tablist" aria-label="Workspace tabs">
            {[
              ["yaml", "YAML"],
              ["form", "Form"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={activeTab === value ? "editor-tabs__item is-active" : "editor-tabs__item"}
                onClick={() => setActiveTab(value as WorkspaceTab)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <PanelGroup className="editor-main-stack" direction="vertical">
            <Panel className="editor-panel" defaultSize={72} minSize={35}>
              <div className="editor-surface">
                {activeTab === "yaml" ? (
                  <div className="editor-code-shell">
                    <div className="editor-code-surface">
                      <CodeMirror
                        basicSetup={{
                          foldGutter: true,
                          highlightActiveLine: true,
                          highlightActiveLineGutter: false
                        }}
                        className="editor-codemirror"
                        editable={isEditable && !isHistoryYamlView && !isCompareYamlView}
                        extensions={[
                          indentUnit.of("  "),
                          yamlLanguage(),
                          rawEditorTheme,
                          ...(validationIssueLines.length > 0 ? [createValidationDecorations(validationIssueLines)] : []),
                          ...(isCompareYamlView ? [diffLineDecorations] : [])
                        ]}
                        onChange={handleContentChange}
                        value={displayedYaml}
                      />
                    </div>

                    <div className="editor-footer-bar">
                      <span>
                        {isCompareYamlView
                          ? `Comparing ${selectedHistoryEntry?.title} with current`
                          : isHistoryYamlView
                            ? `Viewing ${selectedHistoryEntry?.title}`
                            : selectedDocument.parseError ?? workspaceMessage}
                      </span>
                    </div>
                  </div>
                ) : null}

                {activeTab === "form" ? (
                  <div className="editor-form-surface">
                    {isContractDocument ? (
                      <Form
                        formData={selectedData}
                        noHtml5Validate
                        omitExtraData={false}
                        schema={schema}
                        showErrorList={false}
                        uiSchema={uiSchema}
                        validator={validator}
                        onChange={handleFormChange}
                      >
                        <div className="editor-submit-row">
                          <button className="editor-primary-button" onClick={() => setWorkspaceMessage("Validation run from form mode")} type="submit">
                            Validate contract
                          </button>
                        </div>
                      </Form>
                    ) : (
                      <div className="editor-placeholder">
                        <h3>Form mode only for contract files.</h3>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </Panel>

            {isBottomPanelOpen ? (
              <>
                <PanelResizeHandle className="editor-resize-handle editor-resize-handle--horizontal">
                  <span className="editor-resize-handle__grip" />
                </PanelResizeHandle>

                <Panel className="editor-panel" defaultSize={28} minSize={16}>
                  <div className="editor-bottom-panel">
                    <div className="editor-bottom-panel__body">
                      {activeBottomTab === "validation" ? (
                        <div className="editor-panel-grid">
                          <article className="editor-info-card editor-info-card--validation">
                            <h3>Validation</h3>
                            {isContractDocument ? (
                              yamlValidationState.parseError ? (
                                <ul className="editor-list editor-list--validation">
                                  <li className="editor-list__item editor-list__item--error">
                                    <strong>yaml</strong>
                                    <span>{yamlValidationState.parseError}</span>
                                  </li>
                                </ul>
                              ) : validationErrors.length === 0 ? (
                                <ul className="editor-list editor-list--validation">
                                  <li className="editor-list__item editor-list__item--success">
                                    <strong>schema</strong>
                                    <span>No blocking issue detected.</span>
                                  </li>
                                </ul>
                              ) : (
                                <ul className="editor-list editor-list--validation">
                                  {validationErrors.map((error) => (
                                    <li key={`${error.property}-${error.stack}`} className="editor-list__item editor-list__item--error">
                                      <strong>{error.property || "schema"}</strong>
                                      <span>{error.message}</span>
                                    </li>
                                  ))}
                                </ul>
                              )
                            ) : (
                              <p>No validation.</p>
                            )}
                          </article>

                          <article className="editor-info-card editor-info-card--checks">
                            <h3>Checks</h3>
                            <ul className="editor-list">
                              <li className="editor-list__item editor-list__item--success">
                                <strong>Format</strong>
                                <span>{isContractDocument ? "Ready" : "Reference only"}</span>
                              </li>
                              <li className="editor-list__item editor-list__item--success">
                                <strong>Preview</strong>
                                <span>{isContractDocument ? "Synced" : "Unavailable"}</span>
                              </li>
                              <li className="editor-list__item editor-list__item--success">
                                <strong>Notify</strong>
                                <span>Ready</span>
                              </li>
                            </ul>
                          </article>
                        </div>
                      ) : null}

                      {activeBottomTab === "history" ? (
                        <div className="editor-panel-grid editor-panel-grid--single">
                          <article className="editor-info-card editor-history-card">
                            <h3>History</h3>
                            <div className="editor-history-debug">
                              <span>Status: {activeHistoryStatus}</span>
                              <span>Items: {historyEntries.length}</span>
                            </div>
                            {selectedDocument.isDraft ? (
                              <div className="editor-placeholder editor-placeholder--history">
                                <h3>No repository history for drafts.</h3>
                                <p>Save this contract into the repository to start tracking commit history.</p>
                              </div>
                            ) : activeHistoryState?.status === "loading" ? (
                              <div className="editor-placeholder editor-placeholder--history">
                                <h3>Loading repository history...</h3>
                              </div>
                            ) : activeHistoryState?.status === "error" ? (
                              <div className="editor-placeholder editor-placeholder--history">
                                <h3>Repository history unavailable.</h3>
                                <p>{activeHistoryState.error}</p>
                              </div>
                            ) : historyEntries.length === 0 ? (
                              <div className="editor-placeholder editor-placeholder--history">
                                <h3>No history for this contract yet.</h3>
                              </div>
                            ) : (
                              <div className="editor-history-list" data-count={historyEntries.length}>
                                {historyEntries.map((entry) => {
                                  const isLoadingEntry = historyActionState.entryId === entry.id;
                                  return (
                                    <article
                                      key={entry.id}
                                      className={
                                        mainViewMode === "history" && selectedHistoryEntryId === entry.id
                                          ? "editor-history-row is-open"
                                          : selectedHistoryEntryId === entry.id
                                            ? "editor-history-row is-selected"
                                            : "editor-history-row"
                                      }
                                      onClick={() => void openHistoryEntry(entry, "history")}
                                      onKeyDown={(event) => {
                                        if (event.key === "Enter" || event.key === " ") {
                                          event.preventDefault();
                                          void openHistoryEntry(entry, "history");
                                        }
                                      }}
                                      role="button"
                                      tabIndex={0}
                                    >
                                      <div className="editor-history-row__main">
                                        <div className="editor-history-row__header">
                                          <strong>{entry.title}</strong>
                                          <em>{entry.meta}</em>
                                        </div>
                                        <span className="editor-history-row__author">{entry.author}</span>
                                        {entry.description ? <p>{entry.description}</p> : null}
                                      </div>

                                      <div className="editor-history-row__actions">
                                        <button
                                          aria-label="Open version"
                                          className="editor-icon-button"
                                          disabled={isLoadingEntry}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void openHistoryEntry(entry, "history");
                                          }}
                                          type="button"
                                        >
                                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path d="M10 3.5c4.08 0 7.47 2.9 8.23 6.75-.76 3.85-4.15 6.75-8.23 6.75s-7.47-2.9-8.23-6.75C2.53 6.4 5.92 3.5 10 3.5zm0 2C7.22 5.5 4.82 7.35 3.9 10c.92 2.65 3.32 4.5 6.1 4.5s5.18-1.85 6.1-4.5c-.92-2.65-3.32-4.5-6.1-4.5zm0 1.75A2.75 2.75 0 1110 12.75 2.75 2.75 0 0110 7.25z" />
                                          </svg>
                                          <span className="editor-icon-tooltip">Open version</span>
                                        </button>
                                        <button
                                          aria-label="Compare with current"
                                          className="editor-icon-button"
                                          disabled={isLoadingEntry}
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void openHistoryEntry(entry, "compare");
                                          }}
                                          type="button"
                                        >
                                          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                            <path d="M6.5 3.75a.75.75 0 01.75.75v8.19l1.97-1.97a.75.75 0 111.06 1.06l-3.25 3.25a.75.75 0 01-1.06 0l-3.25-3.25a.75.75 0 111.06-1.06l1.97 1.97V4.5a.75.75 0 01.75-.75zm7 12.5a.75.75 0 01-.75-.75V7.31l-1.97 1.97a.75.75 0 11-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 11-1.06 1.06l-1.97-1.97v8.19a.75.75 0 01-.75.75z" />
                                          </svg>
                                          <span className="editor-icon-tooltip">Compare with current</span>
                                        </button>
                                      </div>
                                    </article>
                                  );
                                })}
                              </div>
                            )}
                          </article>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Panel>
              </>
            ) : null}
          </PanelGroup>

          <div className="editor-bottom-bar">
            <div className="editor-bottom-bar__group">
              <div className="editor-tabs editor-tabs--bottom" role="tablist" aria-label="Inspector tabs">
                {[
                  ["validation", "Validation"],
                  ["history", "History"]
                ].map(([value, label]) => (
                  <button
                    key={value}
                    className={
                      isBottomPanelOpen && activeBottomTab === value ? "editor-tabs__item is-active" : "editor-tabs__item"
                    }
                    onClick={() => toggleBottomPanel(value as BottomTab)}
                    type="button"
                  >
                    {label}
                    {value === "validation" && isContractDocument ? (
                      <span
                        className={
                          validationIssueCount > 0
                            ? "editor-tab-badge editor-tab-badge--error"
                            : "editor-tab-badge editor-tab-badge--success"
                        }
                      >
                        {validationIssueCount}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {isBottomPanelOpen ? (
                <button className="editor-soft-button editor-soft-button--compact" onClick={() => setIsBottomPanelOpen(false)} type="button">
                  Hide
                </button>
              ) : null}
            </div>

            <div className="editor-bottom-bar__group editor-bottom-bar__group--actions">
              {isEditable && !isHistoryYamlView && !isCompareYamlView ? (
                <>
                  <button className="editor-soft-button" onClick={applyYamlDraft} type="button">
                    Apply YAML
                  </button>
                  <button className="editor-primary-button" onClick={() => setWorkspaceMessage("Submission flow ready")} type="button">
                    Submit contract
                  </button>
                </>
              ) : (
                <button
                  className="editor-soft-button"
                  onClick={() => {
                    setSelectedHistoryEntryId(null);
                    setMainViewMode("current");
                    setWorkspaceMessage("Current workspace restored");
                  }}
                  type="button"
                >
                  Back to current
                </button>
              )}
            </div>
          </div>
        </section>
      </Panel>

      {isPreviewOpen ? (
        <>
          <PanelResizeHandle className="editor-resize-handle">
            <span className="editor-resize-handle__grip" />
          </PanelResizeHandle>

          <Panel className="editor-panel" defaultSize={30} id="preview" minSize={20}>
            <aside className="editor-preview-pane">
              <div className="editor-preview-pane__header">
                <div>
                  <h2>Preview</h2>
                </div>
              </div>

              <div className="editor-preview-pane__body">
                {isContractDocument ? (
                  <div className="editor-preview-sheet">
                    <ContractHeader asset={selectedData.asset ?? {}} showActions={false} yamlRaw={selectedDocument.content} />
                    <ContractBody data={selectedData} />
                  </div>
                ) : (
                  <div className="editor-reference-sheet">
                    <h3>{selectedDocument.name}</h3>
                    <p>{selectedDocument.path}</p>
                    {selectedDocument.kind === "markdown" ? (
                      <div className="editor-markdown-sheet">{renderMarkdownDocument(selectedDocument.content)}</div>
                    ) : (
                      <pre>{selectedDocument.content}</pre>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </Panel>
        </>
      ) : null}
    </PanelGroup>
  );
}
