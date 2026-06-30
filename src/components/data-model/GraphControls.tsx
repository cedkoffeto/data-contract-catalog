"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useReactFlow, useViewport } from "@xyflow/react";
import { ZoomIn, ZoomOut, Maximize2, Eye, LayoutTemplate, LayoutList, AlignEndHorizontal, AlignEndVertical, Layers, LayoutGrid, Grid3x3, Check, Download } from "lucide-react";
import type { LayoutMode } from "@/src/lib/data-model";

const VIEW_MODES: { mode: "detailed" | "compact"; icon: React.ReactNode; label: string; description: string }[] = [
  { mode: "detailed", icon: <LayoutList size={18} />, label: "Detailed", description: "Shows all fields with types and constraints for each table" },
  { mode: "compact", icon: <LayoutList size={18} className="rotate-90" />, label: "Compact", description: "Shows only connected fields, minimizing visual clutter" },
];

const LAYOUT_MODES: { mode: LayoutMode; icon: React.ReactNode; label: string; description: string }[] = [
  { mode: "LR", icon: <AlignEndHorizontal size={18} />, label: "Left to Right", description: "Organizes tables horizontally from left to right, showing data flow direction" },
  { mode: "TB", icon: <AlignEndVertical size={18} />, label: "Top to Bottom", description: "Organizes tables vertically from top to bottom, emphasizing hierarchy" },
  { mode: "layer", icon: <Layers size={18} />, label: "Layer clustering", description: "Groups tables by maturity layer (Bronze / Silver / Gold) in columns" },
  { mode: "domain", icon: <LayoutGrid size={18} />, label: "Domain clustering", description: "Groups tables by business domain in columns" },
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
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-gray-200 bg-white shadow-xl">
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
  const [editingZoom, setEditingZoom] = useState(false);
  const [zoomInput, setZoomInput] = useState("");
  const zoomInputRef = useRef<HTMLInputElement>(null);
  const { zoomIn, zoomOut, zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  const zoomPercent = Math.round(zoom * 100);

  useEffect(() => {
    if (editingZoom) zoomInputRef.current?.select();
  }, [editingZoom]);

  const handleZoomChange = useCallback(() => {
    setEditingZoom(false);
    const val = parseInt(zoomInput, 10);
    if (!isNaN(val) && val > 0) zoomTo(val / 100, { duration: 0 });
  }, [zoomInput, zoomTo]);

  const handleExportPng = useCallback(() => {
    const viewport = document.querySelector(".react-flow__viewport") as SVGElement | null;
    if (!viewport) return;
    const clone = viewport.cloneNode(true) as SVGElement;
    const rect = viewport.getBoundingClientRect();
    clone.setAttribute("width", String(rect.width));
    clone.setAttribute("height", String(rect.height));
    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement("canvas");
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.download = "data-model-graph.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = url;
  }, []);

  return (
    <div className={`flex flex-row items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 shadow-md ${className ?? ""}`}>
      {/* Zoom */}
      <button onClick={() => zoomIn()} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Zoom in">
        <ZoomIn size={16} />
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
          className="h-7 w-14 rounded border border-gray-300 px-1 text-center text-[10px] font-semibold text-gray-700 tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          autoFocus
        />
      ) : (
        <button
          onClick={() => { setZoomInput(String(zoomPercent)); setEditingZoom(true); }}
          className="flex h-7 items-center rounded px-1.5 text-[10px] font-semibold text-gray-500 tabular-nums hover:bg-gray-50 hover:text-gray-700"
          title="Click to set zoom percentage"
        >
          {zoomPercent}%
        </button>
      )}
      <button onClick={() => zoomOut()} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Zoom out">
        <ZoomOut size={16} />
      </button>
      <button onClick={() => { onFitViewVisible(); }} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Fit view">
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
      <button onClick={handleExportPng} className="flex h-7 w-7 items-center justify-center rounded-md text-gray-500 hover:bg-gray-50 hover:text-gray-700" title="Export as PNG">
        <Download size={16} />
      </button>
    </div>
  );
}
