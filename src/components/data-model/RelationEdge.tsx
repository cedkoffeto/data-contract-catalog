"use client";

import { memo, useState } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  Position,
  type EdgeProps,
} from "@xyflow/react";

function CardinalitySymbol({ x, y, position, side, type }: { x: number; y: number; position: Position; side: "source" | "target"; type: "one" | "many" }) {
  const isLeftRight = position === Position.Left || position === Position.Right;

  if (type === "one") {
    if (isLeftRight) {
      return <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke="#94a3b8" strokeWidth={2} />;
    }
    return <line x1={x - 6} y1={y} x2={x + 6} y2={y} stroke="#94a3b8" strokeWidth={2} />;
  }

  // many — crow's foot: three lines converging at (x,y) and spreading into the entity
  const spread = 5;
  if (isLeftRight) {
    // into = direction INTO the entity (away from the edge path)
    const into = side === "source" ? -1 : 1;
    const tipX = x + into * 7;
    return (
      <g stroke="#94a3b8" strokeWidth={1.5} fill="none">
        <line x1={x} y1={y} x2={tipX} y2={y - spread} />
        <line x1={x} y1={y} x2={tipX} y2={y + spread} />
        <line x1={x} y1={y} x2={tipX} y2={y} />
      </g>
    );
  }
  const into = side === "source" ? -1 : 1;
  const tipY = y + into * 7;
  return (
    <g stroke="#94a3b8" strokeWidth={1.5} fill="none">
      <line x1={x} y1={y} x2={x - spread} y2={tipY} />
      <line x1={x} y1={y} x2={x + spread} y2={tipY} />
      <line x1={x} y1={y} x2={x} y2={tipY} />
    </g>
  );
}

export const RelationEdge = memo(function RelationEdge(props: EdgeProps) {
  const [hovered, setHovered] = useState(false);

  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label, data } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const cd = (data ?? {}) as { cardSource?: string; cardTarget?: string };
  const cardSource = cd.cardSource === "many" ? "many" : "one";
  const cardTarget = cd.cardTarget === "many" ? "many" : "one";

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={20} />
      <path
        d={edgePath}
        fill="none"
        style={style}
        strokeWidth={hovered ? 4 : ((style as React.CSSProperties)?.strokeWidth as number) || 2}
        filter={hovered ? "drop-shadow(0 0 6px rgba(0,0,0,0.3))" : undefined}
      />
      {/* Source cardinality */}
      <CardinalitySymbol x={sourceX} y={sourceY} position={sourcePosition} side="source" type={cardSource} />
      {/* Target cardinality */}
      <CardinalitySymbol x={targetX} y={targetY} position={targetPosition} side="target" type={cardTarget} />
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
            transition: "all 120ms ease",
          }}
        >
          {label as string}
        </div>
      </EdgeLabelRenderer>
    </g>
  );
});
