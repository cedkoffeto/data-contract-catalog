"use client";

import { memo, useState, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from "@xyflow/react";
import { subscribeHighlight, getHighlightSnapshot, getHighlightSnapshotValue } from "./ModelGraph";

const animStyleId = "dcc-edge-flow";

function edgeOffset(position: Position, side: "source" | "target", distance: number): { dx: number; dy: number } {
  const pad = 6;
  const d = distance + pad;
  if (side === "source") {
    if (position === Position.Right)  return { dx:  d, dy: 0 };
    if (position === Position.Left)   return { dx: -d, dy: 0 };
    if (position === Position.Top)    return { dx: 0, dy: -d };
    if (position === Position.Bottom) return { dx: 0, dy:  d };
  }
  if (position === Position.Left)   return { dx: -d, dy: 0 };
  if (position === Position.Right)  return { dx:  d, dy: 0 };
  if (position === Position.Bottom) return { dx: 0, dy:  d };
  if (position === Position.Top)    return { dx: 0, dy: -d };
  return { dx: d, dy: 0 };
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

export const RelationEdge = memo(function RelationEdge(props: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const _version = useSyncExternalStore(subscribeHighlight, getHighlightSnapshot);
  const { highlightedNode, highlightedNeighbors, selectedEdge, nodeMap } = getHighlightSnapshotValue();

  const { source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label, data, animated, id } = props;

  const edgeData = (data ?? {}) as { cardSource?: string; cardTarget?: string; parsed?: any };

  const srcNode = nodeMap.get(source);
  const tgtNode = nodeMap.get(target);
  const srcMeas = srcNode?.measured;
  const tgtMeas = tgtNode?.measured;

  // With per-field handles, React Flow provides sourceX/Y and targetX/Y
  // at the exact handle position. We just determine the port direction.
  let sp = sourcePosition;
  let tp = targetPosition;

  if (srcNode && tgtNode && srcMeas && tgtMeas) {
    const scx = srcNode.position.x + (srcMeas.width ?? 220) / 2;
    const tcx = tgtNode.position.x + (tgtMeas.width ?? 220) / 2;
    sp = getPortPosition(tcx - scx);
    tp = getPortPosition(scx - tcx);
  }

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: sp,
    targetX,
    targetY,
    targetPosition: tp,
    borderRadius: 20,
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
  const edgeColor = edgeActive ? "#3b82f6" : ((style as React.CSSProperties)?.stroke as string) || "#94a3b8";

  const pathStyle: React.CSSProperties = useMemo(() => ({
    ...(style as React.CSSProperties),
    stroke: edgeColor,
    strokeDasharray: undefined,
    animation: isAnimated
      ? `dcc-flow ${edgeActive ? "0.3s" : "0.8s"} linear infinite`
      : undefined,
    opacity: isEdgeHighlighted ? 1 : 0.15,
    transition: "stroke 0.2s, filter 0.2s, opacity 0.2s",
  }), [style, isAnimated, edgeActive, isEdgeHighlighted]);

  // Offset to push cardinality symbols outside the node boundary
  const cardPad = 4;
  const spDx = sp === Position.Left ? -cardPad : sp === Position.Right ? cardPad : 0;
  const spDy = sp === Position.Top ? -cardPad : sp === Position.Bottom ? cardPad : 0;
  const tpDx = tp === Position.Left ? -cardPad : tp === Position.Right ? cardPad : 0;
  const tpDy = tp === Position.Top ? -cardPad : tp === Position.Bottom ? cardPad : 0;

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
        x={sourceX + edgeOffset(sp, "source", 4).dx}
        y={sourceY + edgeOffset(sp, "source", 4).dy - 10}
        textAnchor="middle"
        dominantBaseline="central"
        fill={edgeColor}
        fontSize={edgeActive ? 14 : 10}
        fontWeight={edgeActive ? 800 : 600}
        fontFamily="monospace"
        pointerEvents="none"
        opacity={isEdgeHighlighted ? 1 : 0.15}
        style={{ transition: "fill 0.2s, font-size 0.2s, font-weight 0.2s, opacity 0.2s" }}
      >
        {cardSource === "many" ? "*" : "1"}
      </text>
      <path
        d={cardinalitySymbolD(
          sourceX + spDx,
          sourceY + spDy,
          sp,
          cardSource === "many" ? "many" : "one",
        )}
        stroke={edgeColor}
        strokeWidth={edgeActive ? 2 : 1.5}
        strokeLinecap="round"
        pointerEvents="none"
        opacity={isEdgeHighlighted ? 1 : 0.15}
        style={{ transition: "stroke 0.2s, stroke-width 0.2s, opacity 0.2s" }}
      />

      <text
        x={targetX + edgeOffset(tp, "target", 4).dx}
        y={targetY + edgeOffset(tp, "target", 4).dy - 10}
        textAnchor="middle"
        dominantBaseline="central"
        fill={edgeColor}
        fontSize={edgeActive ? 14 : 10}
        fontWeight={edgeActive ? 800 : 600}
        fontFamily="monospace"
        pointerEvents="none"
        opacity={isEdgeHighlighted ? 1 : 0.15}
        style={{ transition: "fill 0.2s, font-size 0.2s, font-weight 0.2s, opacity 0.2s" }}
      >
        {cardTarget === "many" ? "*" : "1"}
      </text>
      <path
        d={cardinalitySymbolD(
          targetX + tpDx,
          targetY + tpDy,
          tp,
          cardTarget === "many" ? "many" : "one",
        )}
        stroke={edgeColor}
        strokeWidth={edgeActive ? 2 : 1.5}
        strokeLinecap="round"
        pointerEvents="none"
        opacity={isEdgeHighlighted ? 1 : 0.15}
        style={{ transition: "stroke 0.2s, stroke-width 0.2s, opacity 0.2s" }}
      />

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -100%) translate(${labelX}px,${labelY}px) translateY(-6px)`,
            fontSize: edgeActive ? 11 : 10,
            fontWeight: edgeActive ? 700 : 600,
            fontFamily: "monospace",
            color: edgeActive ? "#1e293b" : "#475569",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            opacity: edgeActive ? (isEdgeHighlighted ? 1 : 0.6) : 0,
            transition: "opacity 120ms ease",
            background: edgeActive ? "rgba(219,234,254,0.95)" : "rgba(241,245,249,0.9)",
            border: `1px solid ${edgeActive ? "rgba(59,130,246,0.3)" : "rgba(148,163,184,0.3)"}`,
            borderRadius: 6,
            padding: "2px 8px",
            lineHeight: "1.2",
            boxShadow: edgeActive ? "0 1px 4px rgba(59,130,246,0.15)" : "0 1px 2px rgba(0,0,0,0.06)",
            zIndex: edgeActive ? 9999 : 0,
          }}
        >
          {label as string}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
});
