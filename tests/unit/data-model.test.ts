import { describe, expect, it } from "vitest";
import type { Edge, Node } from "@xyflow/react";
import {
  assignPortSides,
  layoutByMode,
  parseContractsToGraph,
  type DataModelContract,
} from "@/src/lib/data-model";

function makeContract(partial: Partial<DataModelContract> = {}): DataModelContract {
  return {
    slug: "orders",
    maturity: "silver",
    domain: "crm",
    context: "claims",
    name: "Orders",
    fields: [{ name: "customer_id", type: "string" }],
    ...partial,
  };
}

function layoutNode(id: string, x: number, fields: string[]): Node {
  return {
    id,
    type: "contractTable",
    position: { x, y: 0 },
    data: {
      label: id,
      slug: id,
      maturity: "silver",
      domain: "crm",
      context: "claims",
      fields: fields.map((name) => ({ name, type: "string" })),
    },
  };
}

function layoutEdge(source: string, target: string, srcField: string, tgtField: string): Edge {
  return {
    id: `${source}->${target}`,
    source,
    target,
    data: { parsed: [{ left: { field: srcField }, right: { field: tgtField } }] },
  };
}

function connectedFieldsOf(nodes: Node[]): Map<string, Map<string, number>> {
  const map = new Map<string, Map<string, number>>();
  for (const n of nodes) {
    const fields = (n.data as { fields?: { name: string }[] }).fields ?? [];
    map.set(n.id, new Map(fields.map((f) => [f.name, 1])));
  }
  return map;
}

describe("parseContractsToGraph", () => {
  it("creates one node per contract with a slug-maturity id", () => {
    const graph = parseContractsToGraph([makeContract(), makeContract({ slug: "customers" })]);
    expect(graph.nodes).toHaveLength(2);
    expect(graph.nodes.map((n) => n.id).sort()).toEqual(["silver_customers", "silver_orders"]);
  });

  it("resolves a one-to-many relation (<) with the correct handles and cardinality", () => {
    const graph = parseContractsToGraph([
      makeContract({
        fields: [{ name: "customer_id", type: "string" }],
        relations: [{ ref_name: "belongs_to", ref: "@customers.id < @orders.customer_id" }],
      }),
      makeContract({ slug: "customers", fields: [{ name: "id", type: "string" }] }),
    ]);

    expect(graph.edges).toHaveLength(1);
    const e = graph.edges[0];
    expect(e.source).toBe("silver_customers");
    expect(e.target).toBe("silver_orders");
    expect(e.sourceHandle).toBe("id-right");
    expect(e.targetHandle).toBe("customer_id-left");
    const data = e.data as { cardSource?: string; cardTarget?: string };
    expect(data.cardSource).toBe("one");
    expect(data.cardTarget).toBe("many");
  });

  it("resolves a many-to-one relation (>) with reversed cardinality", () => {
    const graph = parseContractsToGraph([
      makeContract({
        fields: [{ name: "customer_id", type: "string" }],
        relations: [{ ref_name: "has_many", ref: "@customers.id > @orders.customer_id" }],
      }),
      makeContract({ slug: "customers", fields: [{ name: "id", type: "string" }] }),
    ]);

    const data = graph.edges[0].data as { cardSource?: string; cardTarget?: string };
    expect(data.cardSource).toBe("many");
    expect(data.cardTarget).toBe("one");
  });

  it("records an orphan ref and a relation error when the target contract is missing", () => {
    const graph = parseContractsToGraph([
      makeContract({
        relations: [{ ref_name: "fk", ref: "@customers.id < @ghost.field" }],
      }),
      makeContract({ slug: "customers", fields: [{ name: "id", type: "string" }] }),
    ]);

    expect(graph.orphanRefs).toEqual(["@customers.id < @ghost.field"]);
    expect(graph.edges).toHaveLength(0);
    const node = graph.nodes.find((n) => n.id === "silver_orders")!;
    const errors = (node.data as { relationErrors?: { targetSlug: string; message: string }[] }).relationErrors ?? [];
    expect(errors).toHaveLength(1);
    expect(errors[0].targetSlug).toBe("ghost");
  });

  it("records a field-not-found error and skips the edge", () => {
    const graph = parseContractsToGraph([
      makeContract({
        relations: [{ ref_name: "fk", ref: "@customers.nonexistent < @orders.customer_id" }],
      }),
      makeContract({ slug: "customers", fields: [{ name: "id", type: "string" }] }),
    ]);

    expect(graph.edges).toHaveLength(0);
    const node = graph.nodes.find((n) => n.id === "silver_customers")!;
    const errors = (node.data as { relationErrors?: { field: string; message: string }[] }).relationErrors ?? [];
    expect(errors.some((er) => er.field === "nonexistent")).toBe(true);
  });

  it("merges duplicate relations between the same pair into a single edge", () => {
    const graph = parseContractsToGraph([
      makeContract({
        relations: [
          { ref_name: "fk1", ref: "@customers.id < @orders.customer_id" },
          { ref_name: "fk2", ref: "@customers.phone < @orders.customer_id" },
        ],
      }),
      makeContract({ slug: "customers", fields: [{ name: "id", type: "string" }, { name: "phone", type: "string" }] }),
    ]);

    expect(graph.edges).toHaveLength(1);
    const data = graph.edges[0].data as { refs?: string[] };
    expect(data.refs).toEqual(["fk1", "fk2"]);
  });

  it("resolves model-level relations", () => {
    const graph = parseContractsToGraph(
      [
        makeContract(),
        makeContract({ slug: "customers", fields: [{ name: "id", type: "string" }] }),
      ],
      [
        {
          layer: "silver",
          domain: "crm",
          context: "claims",
          sourceFile: "models.yaml",
          relations: [{ ref_name: "model_rel", ref: "@customers.id < @orders.customer_id" }],
        },
      ],
    );

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].data as { ref_name?: string }).toEqual(
      expect.objectContaining({ ref_name: "model_rel" }),
    );
  });

  it("resolves a fully-qualified ref with layer:domain:context:slug.field", () => {
    const graph = parseContractsToGraph([
      makeContract({
        relations: [{ ref_name: "fk", ref: "@silver:crm:claims:customers.id < @orders.customer_id" }],
      }),
      makeContract({ slug: "customers", fields: [{ name: "id", type: "string" }] }),
    ]);

    expect(graph.edges).toHaveLength(1);
  });
});

describe("layoutByMode", () => {
  function graph() {
    return parseContractsToGraph([
      makeContract({ slug: "a", fields: [{ name: "id", type: "string" }] }),
      makeContract({ slug: "b", fields: [{ name: "id", type: "string" }] }),
    ], [
      {
        layer: "silver",
        domain: "crm",
        context: "claims",
        sourceFile: "models.yaml",
        relations: [{ ref_name: "rel", ref: "@a.id < @b.id" }],
      },
    ]);
  }

  it("places the target to the right of the source in LR mode", () => {
    const { nodes } = layoutByMode(...(() => { const g = graph(); return [g.nodes, g.edges, "LR"] as const; })());
    const a = nodes.find((n) => n.id === "silver_a")!;
    const b = nodes.find((n) => n.id === "silver_b")!;
    expect(a.position.x).toBeLessThan(b.position.x);
  });

  it("places the target below the source in TB mode", () => {
    const { nodes } = layoutByMode(...(() => { const g = graph(); return [g.nodes, g.edges, "TB"] as const; })());
    const a = nodes.find((n) => n.id === "silver_a")!;
    const b = nodes.find((n) => n.id === "silver_b")!;
    expect(a.position.y).toBeLessThan(b.position.y);
  });

  it("keeps every node and produces finite positions in all modes", () => {
    for (const mode of ["LR", "TB", "layer", "star"] as const) {
      const g = graph();
      const { nodes } = layoutByMode(g.nodes, g.edges, mode);
      // layer mode adds layer-background nodes, so require every original id to be present
      for (const n of g.nodes) {
        expect(nodes.some((r) => r.id === n.id)).toBe(true);
        const placed = nodes.find((r) => r.id === n.id)!;
        expect(Number.isFinite(placed.position.x)).toBe(true);
        expect(Number.isFinite(placed.position.y)).toBe(true);
      }
    }
  });
});

describe("assignPortSides", () => {
  it("uses right/left when the target is to the right of the source", () => {
    const nodes = [layoutNode("a", 0, ["f1"]), layoutNode("b", 400, ["f2"])];
    const edges = [layoutEdge("a", "b", "f1", "f2")];
    const [e] = assignPortSides(nodes, edges, connectedFieldsOf(nodes));
    expect(e.sourceHandle).toBe("f1-right");
    expect(e.targetHandle).toBe("f2-left");
  });

  it("uses left-out/right-in when the target is to the left of the source", () => {
    const nodes = [layoutNode("a", 400, ["f1"]), layoutNode("b", 0, ["f2"])];
    const edges = [layoutEdge("a", "b", "f1", "f2")];
    const [e] = assignPortSides(nodes, edges, connectedFieldsOf(nodes));
    expect(e.sourceHandle).toBe("f1-left-out");
    expect(e.targetHandle).toBe("f2-right-in");
  });

  it("never assigns top/bottom handles", () => {
    const nodes = [layoutNode("a", 0, ["f1"]), layoutNode("b", 400, ["f2"]), layoutNode("c", -300, ["f3"])];
    const edges = [layoutEdge("a", "b", "f1", "f2"), layoutEdge("c", "a", "f3", "f1")];
    const result = assignPortSides(nodes, edges, connectedFieldsOf(nodes));
    for (const e of result) {
      expect(e.sourceHandle).toMatch(/-(right|left|left-out|right-in)$/);
      expect(e.targetHandle).toMatch(/-(right|left|left-out|right-in)$/);
    }
  });

  it("leaves an edge unchanged when its parsed field data is missing", () => {
    const nodes = [layoutNode("a", 0, ["f1"]), layoutNode("b", 400, ["f2"])];
    const edge: Edge = { id: "e", source: "a", target: "b", data: {} };
    const [result] = assignPortSides(nodes, [edge], connectedFieldsOf(nodes));
    expect(result).toEqual(edge);
  });
});
