"use client";

import { useReactFlow } from "@xyflow/react";
import { ZoomIn, ZoomOut, Maximize2, LayoutList, AlignEndHorizontal, AlignEndVertical } from "lucide-react";
import type { LayoutDirection } from "@/src/lib/data-model";

export function GraphControls({
  viewMode,
  onViewModeChange,
  direction,
  onDirectionChange,
}: {
  viewMode: "detailed" | "compact";
  onViewModeChange: (v: "detailed" | "compact") => void;
  direction: LayoutDirection;
  onDirectionChange: (d: LayoutDirection) => void;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-gray-200 bg-white p-1.5 shadow-md">
      {/* Zoom */}
      <button
        onClick={() => zoomIn()}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="Zoom in"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={() => zoomOut()}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="Zoom out"
      >
        <ZoomOut size={16} />
      </button>
      <button
        onClick={() => fitView({ padding: 0.2 })}
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        title="Fit view"
      >
        <Maximize2 size={16} />
      </button>

      <div className="border-t border-gray-200" />

      {/* View mode */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onViewModeChange("detailed")}
          className={`rounded-md p-1.5 ${
            viewMode === "detailed"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
          title="Detailed view"
        >
          <LayoutList size={16} />
        </button>
        <button
          onClick={() => onViewModeChange("compact")}
          className={`rounded-md p-1.5 ${
            viewMode === "compact"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
          title="Compact view"
        >
          <LayoutList size={16} className="rotate-90" />
        </button>
      </div>

      <div className="border-t border-gray-200" />

      {/* Direction */}
      <div className="flex flex-col gap-0.5">
        <button
          onClick={() => onDirectionChange("LR")}
          className={`rounded-md p-1.5 ${
            direction === "LR"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
          title="Left to Right"
        >
          <AlignEndHorizontal size={16} />
        </button>
        <button
          onClick={() => onDirectionChange("TB")}
          className={`rounded-md p-1.5 ${
            direction === "TB"
              ? "bg-blue-100 text-blue-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
          title="Top to Bottom"
        >
          <AlignEndVertical size={16} />
        </button>
      </div>
    </div>
  );
}
