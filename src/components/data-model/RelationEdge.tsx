"use client";

import { memo, useState, useEffect, useMemo, useContext } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from "@xyflow/react";
import { ViewModeCtx } from "./ModelGraph";

const animStyleId = "dcc-edge-flow";

function edgeOffset(position: Position, side: "source" | "target", distance: number): { dx: number; dy: number } {
  if (side === "source") {
    if (position === Position.Right)  return { dx:  distance, dy: 0 };
    if (position === Position.Left)   return { dx: -distance, dy: 0 };
    if (position === Position.Top)    return { dx: 0, dy: -distance };
    if (position === Position.Bottom) return { dx: 0, dy:  distance };
  }
  if (position === Position.Left)   return { dx: -distance, dy: 0 };
  if (position === Position.Right)  return { dx:  distance, dy: 0 };
  if (position === Position.Bottom) return { dx: 0, dy:  distance };
  if (position === Position.Top)    return { dx: 0, dy: -distance };
  return { dx: distance, dy: 0 };
}

function CardinalitySymbol({ x, y, position, side, type }: { x: number; y: number; position: Position; side: "source" | "target"; type: "one" | "many" }) {
  const offset = 8;
  const spread = 7;
  const { dx, dy } = edgeOffset(position, side, offset);
  const isLeftRight = position === Position.Left || position === Position.Right;

  if (type === "one") {
    if (isLeftRight) {
      return <line x1={x + dx} y1={y - spread} x2={x + dx} y2={y + spread} stroke="#64748b" strokeWidth={3} strokeLinecap="round" />;
    }
    return <line x1={x - spread} y1={y + dy} x2={x + spread} y2={y + dy} stroke="#64748b" strokeWidth={3} strokeLinecap="round" />;
  }

  const cx = x + dx;
  const cy = y + dy;

  if (isLeftRight) {
    return (
      <g stroke="#64748b" strokeWidth={2.5} fill="none" strokeLinecap="round">
        <line x1={cx} y1={cy} x2={x} y2={y - spread} />
        <line x1={cx} y1={cy} x2={x} y2={y} />
        <line x1={cx} y1={cy} x2={x} y2={y + spread} />
      </g>
    );
  }
  return (
    <g stroke="#64748b" strokeWidth={2.5} fill="none" strokeLinecap="round">
      <line x1={cx} y1={cy} x2={x - spread} y2={y} />
      <line x1={cx} y1={cy} x2={x} y2={y} />
      <line x1={cx} y1={cy} x2={x + spread} y2={y} />
    </g>
  );
}

export const RelationEdge = memo(function RelationEdge(props: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { highlightedNode, highlightedNeighbors } = useContext(ViewModeCtx);

  const { source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label, data, animated } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
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
      `;
      document.head.appendChild(s);
    }
  }, []);

  const cd = (data ?? {}) as { cardSource?: string; cardTarget?: string };
  const cardSource = cd.cardSource === "many" ? "many" : "one";
  const cardTarget = cd.cardTarget === "many" ? "many" : "one";

  const baseStrokeWidth = ((style as React.CSSProperties)?.strokeWidth as number) || 2;
  const isAnimated = !!animated;

  const isEdgeHighlighted = useMemo(() => {
    if (!highlightedNode || !highlightedNeighbors) return true;
    const isSourceHighlighted = source === highlightedNode || highlightedNeighbors.has(source);
    const isTargetHighlighted = target === highlightedNode || highlightedNeighbors.has(target);
    return isSourceHighlighted && isTargetHighlighted;
  }, [highlightedNode, highlightedNeighbors, source, target]);

  const pathStyle: React.CSSProperties = useMemo(() => ({
    ...(style as React.CSSProperties),
    strokeDasharray: isAnimated ? "8 6" : (style as React.CSSProperties)?.strokeDasharray || "4 3",
    animation: isAnimated
      ? `dcc-flow ${hovered ? "0.3s" : "0.8s"} linear infinite`
      : undefined,
    opacity: isEdgeHighlighted ? 1 : 0.15,
    transition: "stroke 0.2s, filter 0.2s, opacity 0.2s",
  }), [style, isAnimated, hovered, isEdgeHighlighted]);

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
        strokeWidth={hovered ? baseStrokeWidth * 2 : baseStrokeWidth}
        filter={hovered ? "drop-shadow(0 0 6px rgba(100,116,139,0.4))" : undefined}
        strokeLinecap="round"
      />
      <g opacity={isEdgeHighlighted ? 1 : 0.2}>
        <CardinalitySymbol x={sourceX} y={sourceY} position={sourcePosition} side="source" type={cardSource} />
        <CardinalitySymbol x={targetX} y={targetY} position={targetPosition} side="target" type={cardTarget} />
      </g>
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: hovered ? 11 : 10,
            fontWeight: hovered ? 700 : 600,
            fontFamily: "monospace",
            color: hovered ? "#1e293b" : "#334155",
            background: hovered ? "#f0f9ff" : "#ffffff",
            border: hovered ? "1px solid #93c5fd" : "1px solid #e2e8f0",
            borderRadius: 4,
            padding: "2px 6px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            opacity: isEdgeHighlighted ? 1 : 0.2,
            transition: "all 120ms ease",
          }}
        >
          {label as string}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
});
