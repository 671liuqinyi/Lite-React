import { describe, expect, it } from "vitest";
import { createElement } from "../index";
import type { LiteFiberNode, LiteHook } from "../fiber";
import {
  HooksDispatcherOnMount,
  HooksDispatcherOnUpdate,
  finishHooks,
  prepareToUseHooks,
  resolveDispatcher,
} from "../dispatcher";
import { useState } from "../hooks";

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
  } as LiteFiberNode;
}

function createStateHook(state: unknown): LiteHook {
  return {
    kind: "STATE",
    state,
    queue: [],
    next: null,
  };
}

describe("hooks dispatcher", () => {
  it("throws a dispatcher error when hooks are called outside a function component", () => {
    expect(() => useState(0)).toThrowError(
      "Hooks can only be called inside a function component",
    );
  });

  it("selects the mount dispatcher on first render", () => {
    const fiber = createFunctionFiber();
    const previousContext = prepareToUseHooks(fiber);

    try {
      expect(resolveDispatcher()).toBe(HooksDispatcherOnMount);
    } finally {
      finishHooks(previousContext);
    }
  });

  it("selects the update dispatcher when an alternate hook chain exists", () => {
    const fiber = {
      ...createFunctionFiber(),
      alternate: {
        ...createFunctionFiber(),
        memoizedState: createStateHook(1),
      },
    } as LiteFiberNode;
    const previousContext = prepareToUseHooks(fiber);

    try {
      expect(resolveDispatcher()).toBe(HooksDispatcherOnUpdate);
    } finally {
      finishHooks(previousContext);
    }
  });
});
