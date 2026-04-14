import { describe, expect, it } from "vitest";
import { createElement } from "../index";
import type { LiteFiberNode } from "../fiber";
import { runFunctionComponent, useEffect, useRef, useState } from "../hooks";

function createFunctionFiber(): LiteFiberNode {
  return {
    type: (() => createElement("div", null, "noop")) as LiteFiberNode["type"],
    key: null,
    props: { children: [] },
    dom: null,
    parent: null,
    child: null,
    sibling: null,
    alternate: null,
    memoizedState: null,
  } as unknown as LiteFiberNode;
}

describe("hook linked list runtime", () => {
  it("rebuilds hooks as a linked list while preserving old state order", () => {
    const sharedRef = { current: "shared" };
    const oldFiber = {
      ...createFunctionFiber(),
      memoizedState: {
        kind: "STATE",
        state: 2,
        queue: [(prev: unknown) => Number(prev) + 1],
        next: {
          kind: "REF",
          ref: sharedRef,
          next: {
            kind: "EFFECT",
            deps: [2],
            effect: () => undefined,
            shouldRun: false,
            next: {
              kind: "STATE",
              state: "tail",
              queue: [],
              next: null,
            },
          },
        },
      },
    } as unknown as LiteFiberNode;

    const newFiber = {
      ...createFunctionFiber(),
      alternate: oldFiber,
    } as LiteFiberNode;

    function MixedHooks() {
      const [count] = useState(0);
      const ref = useRef("fresh");
      useEffect(() => undefined, [count]);
      const [label] = useState("fallback");

      return createElement("div", null, `${count}:${String(ref.current)}:${label}`);
    }

    runFunctionComponent(newFiber, MixedHooks, {});

    expect(newFiber.memoizedState?.kind).toBe("STATE");
    expect(newFiber.memoizedState?.next?.kind).toBe("REF");
    expect(newFiber.memoizedState?.next?.next?.kind).toBe("EFFECT");
    expect(newFiber.memoizedState?.next?.next?.next?.kind).toBe("STATE");
    expect((newFiber.memoizedState as { state?: unknown } | null)?.state).toBe(3);
    expect(
      (
        newFiber.memoizedState?.next as
          | { ref?: { current: string } }
          | null
      )?.ref,
    ).toBe(sharedRef);
    expect(
      (
        newFiber.memoizedState?.next?.next?.next as
          | { state?: unknown }
          | null
      )?.state,
    ).toBe("tail");
  });
});
