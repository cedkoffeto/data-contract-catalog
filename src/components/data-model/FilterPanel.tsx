"use client";

import { useState, useMemo, useRef, useCallback, useEffect, memo } from "react";
import { createPortal } from "react-dom";
import { Search, Eye, EyeOff, PanelLeftClose } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import type { ContractTableNodeData } from "@/src/lib/data-model";

const LAYERS = [
  { id: "bronze", label: "Bronze", activeClass: "bg-amber-500 text-white shadow-sm", inactiveClass: "bg-white text-amber-700 hover:bg-amber-50" },
  { id: "silver", label: "Silver", activeClass: "bg-slate-500 text-white shadow-sm", inactiveClass: "bg-white text-slate-600 hover:bg-slate-50" },
  { id: "gold",   label: "Gold",   activeClass: "bg-yellow-500 text-white shadow-sm", inactiveClass: "bg-white text-yellow-700 hover:bg-yellow-50" },
] as const;

const MIN_WIDTH = 160;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 288;

function nodeData(n: Node): ContractTableNodeData {
  return n.data as ContractTableNodeData;
}

type CtxMenuState = { nodeId: string; top: number; left: number } | null;

const TableListItem = memo(function TableListItem({
  node,
  isVisible,
  onCenterTable,
  onToggleTable,
  edges,
  onShowConnected,
  activeCtxMenu,
  onOpenCtxMenu,
}: {
  node: Node;
  isVisible: boolean;
  onCenterTable: (slug: string) => void;
  onToggleTable: (id: string) => void;
  edges: Edge[];
  onShowConnected: (nodeId: string) => void;
  activeCtxMenu: CtxMenuState;
  onOpenCtxMenu: (state: CtxMenuState) => void;
}) {
  const d = nodeData(node);
  const [errHover, setErrHover] = useState(false);
  const [errPos, setErrPos] = useState<{ top: number; left: number } | null>(null);
  const isOpen = activeCtxMenu?.nodeId === node.id;
  const handleCenter = useCallback(() => onCenterTable(node.id), [onCenterTable, node.id]);
  const handleToggle = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleTable(node.id);
  }, [onToggleTable, node.id]);
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenCtxMenu({ nodeId: node.id, top: e.clientY, left: e.clientX });
  }, [onOpenCtxMenu, node.id]);
  const handleShowConnected = useCallback(() => {
    onShowConnected(node.id);
    onOpenCtxMenu(null);
  }, [onShowConnected, node.id, onOpenCtxMenu]);
  const connectedCount = useMemo(() => {
    let count = 0;
    for (const e of edges) {
      if (e.source === node.id || e.target === node.id) count++;
    }
    return count;
  }, [edges, node.id]);
  return (
    <div
      className={`flex items-center gap-2 border-b border-gray-100 px-3 py-1.5 text-xs ${isVisible ? "cursor-pointer hover:bg-gray-50" : "opacity-40"}`}
      onClick={isVisible ? handleCenter : undefined}
      onContextMenu={handleContextMenu}
    >
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: d.color }}
      />
      <span className="flex-1 min-w-0 truncate font-medium text-gray-700 flex items-center gap-1">
        <span className="truncate">{d.slug}</span>
        {d.relationErrors && d.relationErrors.length > 0 && (
          <>
            <span
              className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center cursor-pointer"
              onMouseEnter={(e) => { setErrHover(true); const r = e.currentTarget.getBoundingClientRect(); setErrPos({ top: r.top - 6, left: r.right + 4 }); }}
              onMouseLeave={() => { setErrHover(false); setErrPos(null); }}
            >
              <span className="h-2 w-2 rounded-full bg-red-500" />
            </span>
            {errHover && errPos && createPortal(
              <div className="editor-error-popover fixed" style={{ left: errPos.left, top: errPos.top }}>
                <div className="editor-error-popover-arrow" />
                <div className="editor-error-popover-header">
                  <span>Relation errors</span>
                  <button className="editor-error-popover-close" onClick={() => { setErrHover(false); setErrPos(null); }}>&times;</button>
                </div>
                <div className="editor-error-popover-body">
                  {(d.relationErrors ?? []).map((e, i, arr) => (
                    <div key={i} className={i < arr.length - 1 ? "border-b border-gray-100 pb-2 mb-2" : ""}>
                      <div className="text-[11px] font-semibold text-red-600">{e.message}</div>
                    </div>
                  ))}
                </div>
              </div>,
              document.body,
            )}
          </>
        )}
      </span>
      <button
        onClick={handleToggle}
        className="shrink-0 text-gray-400 hover:text-gray-600"
        title={isVisible ? "Hide" : "Show"}
      >
        {isVisible ? <Eye size={13} /> : <EyeOff size={13} />}
      </button>
      {isOpen && connectedCount > 0 && createPortal(
        <div
          className="fixed z-[9999] min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          style={{ top: activeCtxMenu!.top, left: activeCtxMenu!.left }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            onClick={handleShowConnected}
          >
            <span className="text-gray-400">🔗</span>
            Show connected tables
            <span className="ml-auto text-[10px] text-gray-400">{connectedCount}</span>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
});

export function FilterPanel({
  nodes,
  visibleTables,
  onToggleTable,
  onToggleAll,
  allVisible,
  onCenterTable,
  layerFilter,
  onLayerFilter,
  query,
  onQueryChange,
  edges,
  onShowConnected,
}: {
  nodes: Node[];
  visibleTables: Set<string>;
  onToggleTable: (id: string) => void;
  onToggleAll: () => void;
  allVisible: boolean;
  onCenterTable: (slug: string) => void;
  layerFilter: string | null;
  onLayerFilter: (layer: string | null) => void;
  query: string;
  onQueryChange: (q: string) => void;
  edges: Edge[];
  onShowConnected: (nodeId: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [resizing, setResizing] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  // Close context menu on any click/contextmenu outside
  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [ctxMenu]);

  // Close context menu on Escape key
  useEffect(() => {
    if (!ctxMenu) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtxMenu(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [ctxMenu]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setWidth(newWidth);
    };
    const onUp = () => setResizing(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [resizing]);

  // Filter and sort nodes alphabetically
  const filteredNodes = useMemo(() => {
    const filtered = nodes.filter((n) => {
      const d = nodeData(n);
      const layer = d.maturity || "bronze";
      if (layerFilter && layer !== layerFilter) return false;
      if (query) {
        const q = query.toLowerCase();
        if (!d.label?.toLowerCase().includes(q) && !d.slug?.toLowerCase().includes(q))
          return false;
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const da = nodeData(a);
      const db = nodeData(b);
      return (da.slug || da.label || a.id).localeCompare(db.slug || db.label || b.id);
    });
  }, [nodes, layerFilter, query]);

  // Split into visible + hidden
  const { visibleNodes, hiddenNodes } = useMemo(() => {
    const v: Node[] = [];
    const h: Node[] = [];
    for (const n of filteredNodes) {
      if (visibleTables.has(n.id)) v.push(n);
      else h.push(n);
    }
    return { visibleNodes: v, hiddenNodes: h };
  }, [filteredNodes, visibleTables]);

  const renderNodeList = useCallback((nodeList: Node[]) => {
    return nodeList.map((n) => (
      <TableListItem
        key={n.id}
        node={n}
        isVisible={visibleTables.has(n.id)}
        onCenterTable={onCenterTable}
        onToggleTable={onToggleTable}
        edges={edges}
        onShowConnected={onShowConnected}
        activeCtxMenu={ctxMenu}
        onOpenCtxMenu={setCtxMenu}
      />
    ));
  }, [visibleTables, onCenterTable, onToggleTable, edges, onShowConnected, ctxMenu]);

  return (
    <div
      className={`data-model-filter-panel relative flex h-full min-h-0 flex-col border-r border-gray-200 bg-white shrink-0 ${
        open ? "" : "w-auto"
      }`}
      style={{ width: open ? width : undefined }}
    >
      {open ? (
        <div className="flex items-center border-b border-gray-200 pl-2.5 pr-3 py-2">
          <span className="flex-1 text-center text-sm font-bold text-gray-900">
            Data Model Editor
          </span>
          <button
            onClick={() => setOpen(false)}
            className="ml-auto shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-50 hover:text-gray-700"
            title="Close panel"
          >
            <PanelLeftClose size={18} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="m-1.5 flex shrink-0 flex-col items-center rounded-lg border border-gray-200 bg-white px-2 py-2 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-700"
          title="Open panel"
        >
          <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>
            <PanelLeftClose size={18} />
          </span>
          <span className="mt-1 flex flex-col items-center text-[10px] font-semibold leading-tight text-gray-400">
            <span>{visibleTables.size}</span>
            <span className="text-gray-300">/</span>
            <span>{nodes.length}</span>
          </span>
        </button>
      )}

      {open && (
        <>

          {/* Layer filter — pill toggle like Discussion */}
          <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 py-2.5">
            <div className="inline-flex flex-wrap gap-0.5 rounded-lg p-0.5" style={{ backgroundColor: "rgba(0,0,0,0.06)" }}>
                {(["all", ...LAYERS] as const).map((item) => {
                  const isActive = item === "all" ? !layerFilter : layerFilter === item.id;
                  return (
                    <button
                      key={item === "all" ? "all" : item.id}
                      type="button"
                      onClick={() => onLayerFilter(item === "all" ? null : item.id)}
                    className="inline-flex items-center rounded px-2.5 py-1 text-xs font-bold transition-colors"
                    style={{
                      backgroundColor: isActive ? "#1f2937" : "transparent",
                      color: isActive ? "#fff" : "#374151",
                    }}
                  >
                    {item === "all" ? "All" : item.label}
                  </button>
                );
              })}
            </div>
            <span
              className="ml-auto inline-flex items-center self-center text-[10px] font-semibold text-gray-500 shrink-0"
              title={`${filteredNodes.filter((n) => visibleTables.has(n.id)).length} visible / ${filteredNodes.length} total`}
            >{filteredNodes.filter((n) => visibleTables.has(n.id)).length}/{filteredNodes.length}</span>
          </div>

          {/* Search + toggle all row */}
          <div className="flex items-center gap-2 border-b border-gray-200 px-3 py-1.5">
            <Search size={13} className="shrink-0 text-gray-400" />
            <input
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Filter tables..."
              className="min-w-0 flex-1 text-xs text-gray-700 outline-none placeholder:text-gray-400"
            />
            <button
              onClick={onToggleAll}
              className="shrink-0 text-gray-400 hover:text-gray-600"
              title={allVisible ? "Hide all" : "Show all"}
            >
              {allVisible ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>
          </div>

          {/* Table list — visible first, then hidden */}
          <div className="flex-1 overflow-y-auto">
            {visibleNodes.length === 0 && hiddenNodes.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-gray-400">
                No tables match the filter
              </div>
            )}
            {visibleNodes.length > 0 && (
              <>
                <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Visible ({visibleNodes.length})
                </div>
                {renderNodeList(visibleNodes)}
              </>
            )}
            {hiddenNodes.length > 0 && (
              <>
                <div className="sticky top-0 z-10 border-b border-gray-100 bg-gray-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Hidden ({hiddenNodes.length})
                </div>
                {renderNodeList(hiddenNodes)}
              </>
            )}
          </div>
        </>
      )}

      {/* Resize handle */}
      {open && (
        <div
          className="absolute right-0 top-0 z-10 h-full w-1 cursor-col-resize hover:w-1.5 hover:bg-blue-400 active:bg-blue-500"
          style={{ right: -1 }}
          onMouseDown={handleMouseDown}
        />
      )}
    </div>
  );
}
