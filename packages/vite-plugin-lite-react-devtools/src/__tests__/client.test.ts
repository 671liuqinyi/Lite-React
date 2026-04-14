import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    render: vi.fn(),
  },
}));

import { mountLiteReactDevtools } from "../client";

describe("lite-react devtools client", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    delete (globalThis as typeof globalThis & {
      __LITE_REACT_DEVTOOLS__?: unknown;
    }).__LITE_REACT_DEVTOOLS__;
  });

  it("creates a panel with four resize handles and size constraints", () => {
    mountLiteReactDevtools();

    const panel = document.getElementById("lite-react-devtools-panel");

    expect(panel).toBeInstanceOf(HTMLDivElement);

    const root = panel as HTMLDivElement;

    expect(root.style.width).toBe("420px");
    expect(root.style.height).toBe("320px");
    expect(root.style.minWidth).toBe("320px");
    expect(root.style.minHeight).toBe("180px");
    expect(root.style.maxWidth).toBe("80vw");
    expect(root.style.maxHeight).toBe("80vh");
    expect(root.querySelectorAll("[data-role='resize-handle']")).toHaveLength(4);
  });

  it("resizes the panel from the top-left handle", () => {
    mountLiteReactDevtools();

    const panel = document.getElementById("lite-react-devtools-panel");

    if (!(panel instanceof HTMLDivElement)) {
      throw new Error("Expected the devtools panel to exist");
    }

    panel.getBoundingClientRect = vi.fn(() => ({
      x: 100,
      y: 120,
      left: 100,
      top: 120,
      right: 520,
      bottom: 440,
      width: 420,
      height: 320,
      toJSON: () => ({}),
    })) as typeof panel.getBoundingClientRect;

    const handle = panel.querySelector("[data-corner='nw']");

    if (!(handle instanceof HTMLDivElement)) {
      throw new Error("Expected the top-left resize handle to exist");
    }

    handle.dispatchEvent(
      new MouseEvent("mousedown", {
        bubbles: true,
        clientX: 100,
        clientY: 120,
      }),
    );

    document.dispatchEvent(
      new MouseEvent("mousemove", {
        bubbles: true,
        clientX: 60,
        clientY: 80,
      }),
    );
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    expect(panel.style.left).toBe("60px");
    expect(panel.style.top).toBe("80px");
    expect(panel.style.width).toBe("460px");
    expect(panel.style.height).toBe("360px");
    expect(panel.style.right).toBe("auto");
    expect(panel.style.bottom).toBe("auto");
  });
});
