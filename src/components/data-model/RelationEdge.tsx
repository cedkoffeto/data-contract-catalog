"use client";

import { memo, useState, useEffect, useMemo, useContext } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from "@xyflow/react";
import { HighlightCtx } from "./ModelGraph";

const animStyleId = "dcc-edge-flow";

export const RelationEdge = memo(function RelationEdge(props: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { highlightedNode, highlightedNeighbors } = useContext(HighlightCtx);

  const { source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label, data, animated } = props;

  const edgeData = (data ?? {}) as { cardSource?: string; cardTarget?: string; parallelOffset?: number; targetParallelOffset?: number };
  const parallelOffset = edgeData.parallelOffset ?? 0;
  const targetParallelOffset = edgeData.targetParallelOffset ?? 0;
  const sourceOffset = parallelOffset * 16;
  const targetOffset = (parallelOffset + targetParallelOffset) * 16;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY: sourceY + sourceOffset,
    sourcePosition,
    targetX,
    targetY: targetY + targetOffset,
    targetPosition,
    borderRadius: 18,
  });

  useEffect(() => {
    if (typeof document !== "undefined" && !document.getElementById(animStyleId)) {
      const s = document.createElement("style");
      s.id = animStyleId;
      s.textContent = `
        @keyframes dcc-flow {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes dcc-dots {
          0% { stroke-dashoffset: 16; }
          100% { stroke-dashoffset: 0; }
        }
      `;
      document.head.appendChild(s);
    }
  }, []);

  const cardSource = edgeData.cardSource === "many" ? "many" : "one";
  const cardTarget = edgeData.cardTarget === "many" ? "many" : "one";

  const baseStrokeWidth = ((style as React.CSSProperties)?.strokeWidth as number) || 2;
  const isAnimated = !!animated;

  const isEdgeHighlighted = useMemo(() => {
    if (!highlightedNode || !highlightedNeighbors) return true;
    const isSourceHighlighted = source === highlightedNode || highlightedNeighbors.has(source);
    const isTargetHighlighted = target === highlightedNode || highlightedNeighbors.has(target);
    return isSourceHighlighted && isTargetHighlighted;
  }, [highlightedNode, highlightedNeighbors, source, target]);

  const isConnectedToHoveredNode = highlightedNode !== null && (source === highlightedNode || target === highlightedNode);
  const edgeActive = hovered || isConnectedToHoveredNode;

  const pathStyle: React.CSSProperties = useMemo(() => ({
    ...(style as React.CSSProperties),
    stroke: edgeActive ? "#3b82f6" : (style as React.CSSProperties)?.stroke || "#94a3b8",
    strokeDasharray: undefined,
    animation: isAnimated
      ? `dcc-flow ${edgeActive ? "0.3s" : "0.8s"} linear infinite`
      : undefined,
    opacity: isEdgeHighlighted ? 1 : 0.15,
    transition: "stroke 0.2s, filter 0.2s, opacity 0.2s",
  }), [style, isAnimated, edgeActive, isEdgeHighlighted]);

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      {isAnimated && (
        <path
          d={edgePath}
          fill="none"
          stroke="#94a3b8"
          strokeWidth={baseStrokeWidth + 2}
          strokeLinecap="round"
          opacity={isEdgeHighlighted ? 0.15 : 0.03}
        />
      )}
      <path
        d={edgePath}
        fill="none"
        style={pathStyle}
        strokeWidth={edgeActive ? baseStrokeWidth * 2 : baseStrokeWidth}
        filter={edgeActive ? "drop-shadow(0 0 6px rgba(59,130,246,0.4))" : undefined}
        strokeLinecap="round"
      />
      {edgeActive && (
        <path
          d={edgePath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={baseStrokeWidth * 2}
          strokeLinecap="round"
          strokeDasharray="0 16"
          opacity={0.7}
          style={{ animation: "dcc-dots 0.6s linear infinite" }}
        />
      )}
      <g opacity={edgeActive || isEdgeHighlighted ? 1 : 0.2} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: edgeActive ? 11 : 10,
            fontWeight: edgeActive ? 700 : 600,
            fontFamily: "monospace",
            color: edgeActive ? "#1e293b" : "#334155",
            background: edgeActive ? "#f0f9ff" : "#ffffff",
            border: edgeActive ? "1px solid #93c5fd" : "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "2px 6px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            opacity: edgeActive ? (isEdgeHighlighted ? 1 : 0.6) : 0,
            transition: "opacity 120ms ease",
          }}
        >
          {label as string}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
});
