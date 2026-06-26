"use client";

import { memo, useState } from "react";
import {
  getSmoothStepPath,
  EdgeLabelRenderer,
  type EdgeProps,
} from "@xyflow/react";

export const RelationEdge = memo(function RelationEdge(props: EdgeProps) {
  const [hovered, setHovered] = useState(false);

  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, label } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

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
