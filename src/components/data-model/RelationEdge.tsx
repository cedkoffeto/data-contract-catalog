"use client";

import { memo, useState, useEffect, useMemo, useContext } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  useReactFlow,
  type EdgeProps,
} from "@xyflow/react";
import { HighlightCtx } from "./ModelGraph";

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

function cardinalitySymbolD(
  x: number, y: number, pos: Position, type: "one" | "many"
): string {
  if (type === "one") {
    if (pos === Position.Top || pos === Position.Bottom) {
      return `M ${x-2},${y} L ${x+2},${y}`;
    }
    return `M ${x},${y-2} L ${x},${y+2}`;
  }
  // many — three diverging lines (crow's foot) spreading toward the table
  const len = 5;
  const spread = 4;
  if (pos === Position.Right) {
    return `M ${x},${y} L ${x-len},${y-spread} M ${x},${y} L ${x-len},${y} M ${x},${y} L ${x-len},${y+spread}`;
  }
  if (pos === Position.Left) {
    return `M ${x},${y} L ${x+len},${y-spread} M ${x},${y} L ${x+len},${y} M ${x},${y} L ${x+len},${y+spread}`;
  }
  if (pos === Position.Top) {
    return `M ${x},${y} L ${x-spread},${y+len} M ${x},${y} L ${x},${y+len} M ${x},${y} L ${x+spread},${y+len}`;
  }
  // Bottom
  return `M ${x},${y} L ${x-spread},${y-len} M ${x},${y} L ${x},${y-len} M ${x},${y} L ${x+spread},${y-len}`;
}

function getPortPosition(dx: number): Position {
  return dx >= 0 ? Position.Right : Position.Left;
}

function portX(pos: Position, nx: number, nw: number): number {
  if (pos === Position.Left) return nx;
  if (pos === Position.Right) return nx + nw;
  return nx + nw / 2;
}

function portY(pos: Position, ny: number, nh: number): number {
  if (pos === Position.Top) return ny;
  if (pos === Position.Bottom) return ny + nh;
  return ny + nh / 2;
}

export const RelationEdge = memo(function RelationEdge(props: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { highlightedNode, highlightedNeighbors, selectedEdge } = useContext(HighlightCtx);

  const { source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label, data, animated, id } = props;

  const edgeData = (data ?? {}) as { cardSource?: string; cardTarget?: string; parallelOffset?: number; targetParallelOffset?: number };
  const parallelOffset = edgeData.parallelOffset ?? 0;
  const targetParallelOffset = edgeData.targetParallelOffset ?? 0;
  const sourceOffset = parallelOffset * 16;
  const targetOffset = (parallelOffset + targetParallelOffset) * 16;

  const hOff = parallelOffset * 8;

  const { getNodes } = useReactFlow();
  const nodes = getNodes();
  const srcNode = nodes.find((n) => n.id === source);
  const tgtNode = nodes.find((n) => n.id === target);
  const srcMeas = srcNode?.measured;
  const tgtMeas = tgtNode?.measured;

  let sp = sourcePosition;
  let tp = targetPosition;
  let sx = sourceX;
  let sy = sourceY;
  let tx = targetX;
  let ty = targetY;

  if (srcNode && tgtNode && srcMeas && tgtMeas) {
    const scx = srcNode.position.x + (srcMeas.width ?? 220) / 2;
    const scy = srcNode.position.y + (srcMeas.height ?? 40) / 2;
    const tcx = tgtNode.position.x + (tgtMeas.width ?? 220) / 2;
    const tcy = tgtNode.position.y + (tgtMeas.height ?? 40) / 2;
    sp = getPortPosition(tcx - scx);
    tp = getPortPosition(scx - tcx);
    sx = portX(sp, srcNode.position.x, srcMeas.width ?? 220);
    sy = portY(sp, srcNode.position.y, srcMeas.height ?? 40);
    tx = portX(tp, tgtNode.position.x, tgtMeas.width ?? 220);
    ty = portY(tp, tgtNode.position.y, tgtMeas.height ?? 40);
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: sx + hOff,
    sourceY: sy + sourceOffset,
    sourcePosition: sp,
    targetX: tx + hOff,
    targetY: ty + targetOffset,
    targetPosition: tp,
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
  const isSelected = selectedEdge === id;
  const edgeActive = hovered || isConnectedToHoveredNode || isSelected;

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

      <text
        x={sx + hOff + edgeOffset(sp, "source", 14).dx}
        y={sy + sourceOffset + edgeOffset(sp, "source", 14).dy - 9}
        textAnchor="middle"
        dominantBaseline="central"
        fill={edgeActive ? "#3b82f6" : "#cbd5e1"}
        fontSize={edgeActive ? 14 : 10}
        fontWeight={edgeActive ? 800 : 600}
        fontFamily="monospace"
        pointerEvents="none"
        style={{ transition: "fill 0.2s, font-size 0.2s, font-weight 0.2s" }}
      >
        {cardSource === "many" ? "*" : "1"}
      </text>
      <path
        d={cardinalitySymbolD(
          sx + hOff + edgeOffset(sp, "source", 6).dx,
          sy + sourceOffset + edgeOffset(sp, "source", 6).dy,
          sp,
          cardSource === "many" ? "many" : "one",
        )}
        stroke={edgeActive ? "#3b82f6" : "#cbd5e1"}
        strokeWidth={edgeActive ? 2 : 1.5}
        strokeLinecap="round"
        pointerEvents="none"
        style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
      />

      <text
        x={tx + hOff + edgeOffset(tp, "target", 14).dx}
        y={ty + targetOffset + edgeOffset(tp, "target", 14).dy - 9}
        textAnchor="middle"
        dominantBaseline="central"
        fill={edgeActive ? "#3b82f6" : "#cbd5e1"}
        fontSize={edgeActive ? 14 : 10}
        fontWeight={edgeActive ? 800 : 600}
        fontFamily="monospace"
        pointerEvents="none"
        style={{ transition: "fill 0.2s, font-size 0.2s, font-weight 0.2s" }}
      >
        {cardTarget === "many" ? "*" : "1"}
      </text>
      <path
        d={cardinalitySymbolD(
          tx + hOff + edgeOffset(tp, "target", 6).dx,
          ty + targetOffset + edgeOffset(tp, "target", 6).dy,
          tp,
          cardTarget === "many" ? "many" : "one",
        )}
        stroke={edgeActive ? "#3b82f6" : "#cbd5e1"}
        strokeWidth={edgeActive ? 2 : 1.5}
        strokeLinecap="round"
        pointerEvents="none"
        style={{ transition: "stroke 0.2s, stroke-width 0.2s" }}
      />

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
