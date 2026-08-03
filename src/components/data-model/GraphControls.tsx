"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useReactFlow, useViewport } from "@xyflow/react";
import { ZoomIn, ZoomOut, Maximize2, Eye, LayoutTemplate, LayoutList, AlignEndHorizontal, AlignEndVertical, Layers, Grid3x3, Check, Download, Star } from "lucide-react";
import type { LayoutMode } from "@/src/lib/data-model";
import { useT } from "@/src/lib/use-i18n";

const VIEW_MODES: { mode: "detailed" | "compact"; icon: React.ReactNode; label: string; description: string }[] = [
  { mode: "detailed", icon: <LayoutList size={18} />, label: "Detailed", description: "Shows all fields with types and constraints for each table" },
  { mode: "compact", icon: <LayoutList size={18} className="rotate-90" />, label: "Compact", description: "Shows only connected fields, minimizing visual clutter" },
];

const LAYOUT_MODES: { mode: LayoutMode; icon: React.ReactNode; label: string; description: string }[] = [
  { mode: "LR", icon: <AlignEndHorizontal size={18} />, label: "Left to Right", description: "Organizes tables horizontally from left to right, showing data flow direction" },
  { mode: "TB", icon: <AlignEndVertical size={18} />, label: "Top to Bottom", description: "Organizes tables vertically from top to bottom, emphasizing hierarchy" },
  { mode: "layer", icon: <Layers size={18} />, label: "Layer clustering", description: "Groups tables by maturity layer (Bronze / Silver / Gold) in columns" },
  { mode: "star", icon: <Star size={18} />, label: "Star / Snowflake", description: "Radial layout centered on the most connected tables" },
];

function Dropdown<T extends string>({
  options,
  value,
  onChange,
  triggerIcon,
  title,
}: {
  options: { mode: T; icon: React.ReactNode; label: string; description: string }[];
  value: T;
  onChange: (v: T) => void;
  triggerIcon: React.ReactNode;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700"
        title={title}
      >
        {triggerIcon}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 z-50 mb-2 w-64 -translate-x-1/2 bottom-full rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="flex flex-col py-1">
              {options.map(({ mode, icon, label, description }) => {
                const active = value === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => { onChange(mode); setOpen(false); }}
                    className={`flex items-start gap-3 px-3 py-2.5 text-left transition-colors ${active ? "bg-blue-50" : "hover:bg-gray-50"}`}
                  >
                    <span className={`mt-0.5 shrink-0 ${active ? "text-blue-700" : "text-gray-500"}`}>
                      {icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-semibold ${active ? "text-blue-700" : "text-gray-900"}`}>
                          {label}
                        </span>
                        {active && <Check size={12} className="shrink-0 text-blue-700" />}
                      </div>
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-500">
                        {description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function GraphControls({
  viewMode,
  onViewModeChange,
  layoutMode,
  onLayoutModeChange,
  showGrid,
  onToggleGrid,
  onFitViewVisible,
  visibleCount,
  totalCount,
  className,
}: {
  viewMode: "detailed" | "compact";
  onViewModeChange: (v: "detailed" | "compact") => void;
  layoutMode: LayoutMode;
  onLayoutModeChange: (d: LayoutMode) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  onFitViewVisible: () => void;
  visibleCount: number;
  totalCount: number;
  className?: string;
}) {
  const { t } = useT();
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState("");
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const { zoomIn, zoomOut, zoomTo, getNodes, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round(zoom * 100);
  const [exportOpen, setExportOpen] = useState(false);
  const [fitToggled, setFitToggled] = useState(false);

  useEffect(() => {
    if (editingZoom) zoomInputRef.current?.select();
  }, [editingZoom]);

  const handleZoomChange = useCallback(() => {
    setEditingZoom(false);
    const val = parseInt(zoomInput, 10);
    if (!isNaN(val) && val > 0) zoomTo(val / 100, { duration: 0 });
  }, [zoomInput, zoomTo]);

  const doExport = useCallback(async (scope: "all" | "visible", format: "png" | "svg" = "png") => {
    const el = document.querySelector(".react-flow") as HTMLElement | null;
    if (!el) return;

    const [{ toPng, toSvg }] = await Promise.all([
      import("html-to-image"),
      (async () => {
        const allNodes = getNodes().map((n) => ({ id: n.id }));
        if (scope === "all") {
          await fitView({ nodes: allNodes, duration: 0, padding: 0.1 });
        } else {
          fitView({ duration: 0 });
        }
        await new Promise((r) => requestAnimationFrame(r));
        await new Promise((r) => requestAnimationFrame(r));
        return null;
      })(),
    ]);

    // Hide ALL panels aggressively — display:none + visibility:hidden + position:absolute
    const panels = el.querySelectorAll<HTMLElement>(".react-flow__panel");
    const hidden: HTMLElement[] = [];
    panels.forEach((p) => {
      hidden.push(p);
      p.dataset._exportPrev = p.style.cssText;
      p.style.cssText = "display:none !important; visibility:hidden !important; position:absolute !important; pointer-events:none !important;";
    });

    try {
      const isSvg = format === "svg";
      const dataUrl = isSvg
        ? await toSvg(el, {
            backgroundColor: "#f8f9fa",
            cacheBust: true,
            filter: (node: Element) => {
              if (node instanceof HTMLElement) {
                if (node.classList?.contains("react-flow__panel")) return false;
                if (node.closest?.(".react-flow__panel")) return false;
              }
              return true;
            },
          })
        : await toPng(el, {
            backgroundColor: "#f8f9fa",
            pixelRatio: 8,
            cacheBust: true,
            filter: (node: Element) => {
              if (node instanceof HTMLElement) {
                if (node.classList?.contains("react-flow__panel")) return false;
                if (node.closest?.(".react-flow__panel")) return false;
              }
              return true;
            },
          });
      const ext = isSvg ? "svg" : "png";
      const a = document.createElement("a");
      a.download = `data-model-graph.${ext}`;
      a.href = dataUrl;
      a.click();
    } catch {}
    hidden.forEach((p) => { p.style.cssText = p.dataset._exportPrev ?? ""; delete p.dataset._exportPrev; });
    setExportOpen(false);
  }, [fitView, getNodes]);

  return (
    <div className={`flex flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 shadow-md ${className ?? ""}`}>
      {/* Zoom */}
      <button onClick={() => zoomOut()} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Zoom out">
        <ZoomOut size={16} />
      </button>
      {editingZoom ? (
        <input
          ref={zoomInputRef}
          type="number"
          min={1}
          value={zoomInput}
          onChange={(e) => setZoomInput(e.target.value)}
          onBlur={handleZoomChange}
          onKeyDown={(e) => { if (e.key === "Enter") handleZoomChange(); if (e.key === "Escape") setEditingZoom(false); }}
          className="h-7 w-14 rounded border border-gray-300 px-1 text-center font-semibold text-gray-700 tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          style={{ fontSize: 12 }}
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setZoomInput(String(zoomPercent)); setEditingZoom(true); }}
          className="flex h-7 items-center rounded px-1 hover:bg-gray-50 hover:text-gray-700"
          title="Click to set zoom percentage"
        >
          <span className="font-semibold text-gray-500 tabular-nums" style={{ fontSize: 10 }}>
            {zoomPercent}%
          </span>
        </button>
      )}
      <button onClick={() => zoomIn()} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Zoom in">
        <ZoomIn size={16} />
      </button>
      <button onClick={() => { setFitToggled(!fitToggled); if (!fitToggled) onFitViewVisible(); else zoomTo(1, { duration: 200 }); }} className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-50 hover:text-gray-700 ${fitToggled ? "bg-gray-100 text-gray-700" : "text-gray-400"}`} title={fitToggled ? "Zoom 100%" : "Fit view"}>
        <Maximize2 size={16} />
      </button>
      <button
        onClick={onToggleGrid}
        className={`flex h-7 w-7 items-center justify-center rounded-md hover:bg-gray-50 hover:text-gray-700 ${showGrid ? "bg-gray-100 text-gray-700" : "text-gray-400"}`}
        title={showGrid ? "Hide grid" : "Show grid"}
      >
        <Grid3x3 size={16} />
      </button>

      {/* View mode — dropdown */}
      <Dropdown
        options={VIEW_MODES}
        value={viewMode}
        onChange={onViewModeChange}
        triggerIcon={<Eye size={16} />}
        title="Change view mode"
      />

      {/* Layout mode — dropdown */}
      <Dropdown
        options={LAYOUT_MODES}
        value={layoutMode}
        onChange={onLayoutModeChange}
        triggerIcon={<LayoutTemplate size={16} />}
        title="Change layout"
      />
      <div className="mx-0.5 h-7 w-px bg-gray-200" />
      <span className="flex h-7 items-center whitespace-nowrap text-[11px] font-medium text-gray-400 select-none">
        {visibleCount} / {totalCount} tables visible
      </span>
      <div className="mx-0.5 h-7 w-px bg-gray-200" />
      <button onClick={() => setExportOpen(true)} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Export as PNG">
        <Download size={16} />
      </button>
      {exportOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setExportOpen(false)} />
          <div className="relative z-10 w-full max-w-xs rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-gray-900">{t("exportPngTitle")}</h3>
            <div className="mt-3 flex flex-col gap-2">
              <button
                onClick={() => doExport("visible")}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                <div className="text-sm">{t("exportVisible")}</div>
                <div className="mt-0.5 text-[11px] font-normal text-gray-500">{t("exportVisibleDesc")}</div>
              </button>
              <button
                onClick={() => doExport("all")}
                className="w-full rounded-lg border border-gray-200 px-4 py-3 text-left text-xs font-semibold text-gray-900 hover:bg-gray-50"
              >
                <div className="text-sm">{t("exportAll")}</div>
                <div className="mt-0.5 text-[11px] font-normal text-gray-500">{t("exportAllDesc")}</div>
              </button>
              <div className="my-1 border-t border-gray-100" />
              <button
                onClick={() => doExport("all", "svg")}
                className="w-full rounded-lg border border-dashed border-blue-200 bg-blue-50/50 px-4 py-3 text-left text-xs font-semibold text-blue-900 hover:bg-blue-50"
              >
                <div className="text-sm">{t("exportSvg")}</div>
                <div className="mt-0.5 text-[11px] font-normal text-blue-600">{t("exportSvgDesc")}</div>
              </button>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                onClick={() => setExportOpen(false)}
                className="rounded-md px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
              >
                {t("close")}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
