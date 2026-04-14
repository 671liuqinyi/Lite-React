import { describe, expect, it, vi } from "vitest";
import { createElement } from "../index";
import { ROOT_ELEMENT, type LiteFiberNode } from "../fiber";
import { createLiteDevtoolsHook, serializeFiberTree } from "../devtools";

describe("lite-react devtools hook", () => {
  it("publishes events to subscribers and supports unsubscribe", () => {
    const hook = createLiteDevtoolsHook();
    const listener = vi.fn();

    const unsubscribe = hook.subscribe(listener);

    hook.publish({
      type: "render:scheduled",
      renderId: 1,
      timestamp: 123,
    });

    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();

    hook.publish({
      type: "render:scheduled",
      renderId: 2,
      timestamp: 456,
    });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("serializes a fiber tree into a devtools snapshot", () => {
    const root: LiteFiberNode = {
      type: ROOT_ELEMENT,
      key: null,
      props: { children: [] },
      dom: null,
      parent: null,
      child: {
        type: "section",
        key: "root-section",
        props: {
          children: [createElement("span", null, "child")],
        },
        dom: null,
        parent: null,
        child: null,
        sibling: null,
        alternate: null,
        effectTag: "UPDATE",
        memoizedState: {
          kind: "STATE",
          state: 1,
          queue: [],
          next: {
            kind: "REF",
            ref: { current: "child-ref" },
            next: null,
          },
        },
      },
      sibling: null,
      alternate: null,
      memoizedState: null,
    } as unknown as LiteFiberNode;

    if (!root.child) {
      throw new Error("Expected a child fiber");
    }

    root.child.parent = root;

    const snapshot = serializeFiberTree(root);

    expect(snapshot?.type).toBe("ROOT");
    expect(snapshot?.children[0]?.type).toBe("section");
    expect(snapshot?.children[0]?.hooks).toEqual(["STATE", "REF"]);
    expect(snapshot?.children[0]?.hookCount).toBe(2);
    expect(snapshot?.children[0]?.hookChain).toBe("STATE -> REF");
    expect(snapshot?.children[0]?.effectTag).toBe("UPDATE");
  });
});
