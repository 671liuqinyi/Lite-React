import { describe, expect, it } from "vitest";
import { fiberSnapshotToMermaid } from "../graph";

describe("fiberSnapshotToMermaid", () => {
  it("includes hook count and hook chain in the node label", () => {
    const graph = fiberSnapshotToMermaid({
      id: "root.0",
      type: "TodoShowcase",
      key: null,
      effectTag: "UPDATE",
      hooks: ["STATE", "REF", "EFFECT"],
      hookCount: 3,
      hookChain: "STATE -> REF -> EFFECT",
      children: [],
    });

    expect(graph).toContain("hookCount: 3");
    expect(graph).toContain("hookChain: STATE -> REF -> EFFECT");
  });
});
