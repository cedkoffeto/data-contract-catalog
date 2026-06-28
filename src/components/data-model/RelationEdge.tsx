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
  const dir = side === "source" ? 1 : -1;
  const ox = isLeftRight ? dir * 8 : 0;
  const oy = isLeftRight ? 0 : dir * 8;
  const cx = x + ox;
  const cy = y + oy;

  if (type === "one") {
    if (isLeftRight) {
      const mx = cx + (side === "source" ? 2 : -2);
      return <line x1={mx} y1={cy - 6} x2={mx} y2={cy + 6} stroke="#94a3b8" strokeWidth={2} />;
    }
    return <line x1={cx - 6} y1={cy + (side === "source" ? 2 : -2)} x2={cx + 6} y2={cy + (side === "source" ? 2 : -2)} stroke="#94a3b8" strokeWidth={2} />;
  }

  // many — crow's foot
  const spread = 5;
  if (isLeftRight) {
    const tipX = cx + (side === "source" ? 6 : -6);
    return (
      <g stroke="#94a3b8" strokeWidth={1.5} fill="none">
        <line x1={tipX} y1={cy - spread} x2={cx} y2={cy} />
        <line x1={tipX} y1={cy + spread} x2={cx} y2={cy} />
        <line x1={tipX} y1={cy} x2={cx} y2={cy} />
      </g>
    );
  }
  const tipY = cy + (side === "source" ? 6 : -6);
  return (
    <g stroke="#94a3b8" strokeWidth={1.5} fill="none">
      <line x1={cx - spread} y1={tipY} x2={cx} y2={cy} />
      <line x1={cx + spread} y1={tipY} x2={cx} y2={cy} />
      <line x1={cx} y1={tipY} x2={cx} y2={cy} />
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
