import { describe, expect, it } from "vitest";
import { createElement, TEXT_ELEMENT } from "../index";

describe("createElement", () => {
  it("creates a vnode for native elements", () => {
    const vnode = createElement("div", { id: "root" });

    expect(vnode).toEqual({
      type: "div",
      props: {
        id: "root",
        children: [],
      },
    });
  });

  it("normalizes string and number children into text vnodes", () => {
    const vnode = createElement("div", null, "hello", 123);

    expect(vnode.props.children).toEqual([
      {
        type: TEXT_ELEMENT,
        props: {
          nodeValue: "hello",
          children: [],
        },
      },
      {
        type: TEXT_ELEMENT,
        props: {
          nodeValue: "123",
          children: [],
        },
      },
    ]);
  });

  it("flattens arrays and drops empty children", () => {
    const child = createElement("span", { title: "ok" }, "child");
    const vnode = createElement("div", null, [child, null, false, undefined, true]);

    expect(vnode.props.children).toEqual([child]);
  });

  it("keeps function components as vnode types without executing them", () => {
    let called = false;

    function App(props: { title: string }) {
      called = true;

      return createElement("section", null, props.title);
    }

    const vnode = createElement(App, { title: "lite-react" });

    expect(vnode.type).toBe(App);
    expect(vnode.props.title).toBe("lite-react");
    expect(called).toBe(false);
  });
});
