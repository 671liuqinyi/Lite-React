import mermaid from "mermaid";
import {
  ensureLiteDevtoolsHook,
  type LiteDevtoolsEvent,
  type LiteFiberSnapshot,
} from "../lite-react/devtools";
import { fiberSnapshotToMermaid } from "./graph";

type DevtoolsPanel = {
  root: HTMLDivElement;
  status: HTMLParagraphElement;
  diagram: HTMLDivElement;
};

type ResizeCorner = "nw" | "ne" | "sw" | "se";

const PANEL_ID = "lite-react-devtools-panel";
const PANEL_DEFAULT_WIDTH = 420;
const PANEL_DEFAULT_HEIGHT = 320;
const PANEL_MIN_WIDTH = 320;
const PANEL_MIN_HEIGHT = 180;
const PANEL_MAX_VIEWPORT_RATIO = 0.8;
let mermaidInitialized = false;

function ensureMermaid() {
  if (mermaidInitialized) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "neutral",
    fontFamily: "monospace",
  });
  mermaidInitialized = true;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getPanelMaxWidth() {
  return Math.max(
    PANEL_MIN_WIDTH,
    Math.floor(window.innerWidth * PANEL_MAX_VIEWPORT_RATIO),
  );
}

function getPanelMaxHeight() {
  return Math.max(
    PANEL_MIN_HEIGHT,
    Math.floor(window.innerHeight * PANEL_MAX_VIEWPORT_RATIO),
  );
}

function createResizeHandle(
  corner: ResizeCorner,
  cursor: string,
  offsets: Partial<Record<"top" | "right" | "bottom" | "left", string>>,
) {
  const handle = document.createElement("div");

  handle.dataset.role = "resize-handle";
  handle.dataset.corner = corner;
  handle.style.position = "absolute";
  handle.style.width = "14px";
  handle.style.height = "14px";
  handle.style.borderRadius = "999px";
  handle.style.border = "1px solid rgba(71, 62, 53, 0.35)";
  handle.style.background = "rgba(255, 255, 255, 0.9)";
  handle.style.boxShadow = "0 2px 6px rgba(71, 62, 53, 0.18)";
  handle.style.cursor = cursor;
  handle.style.zIndex = "2";

  if (offsets.top) {
    handle.style.top = offsets.top;
  }

  if (offsets.right) {
    handle.style.right = offsets.right;
  }

  if (offsets.bottom) {
    handle.style.bottom = offsets.bottom;
  }

  if (offsets.left) {
    handle.style.left = offsets.left;
  }

  return handle;
}

function attachResizeHandles(root: HTMLDivElement) {
  const handles = [
    createResizeHandle("nw", "nwse-resize", {
      top: "8px",
      left: "8px",
    }),
    createResizeHandle("ne", "nesw-resize", {
      top: "8px",
      right: "8px",
    }),
    createResizeHandle("sw", "nesw-resize", {
      bottom: "8px",
      left: "8px",
    }),
    createResizeHandle("se", "nwse-resize", {
      bottom: "8px",
      right: "8px",
    }),
  ];

  for (const handle of handles) {
    handle.addEventListener("mousedown", (event) => {
      event.preventDefault();

      const corner = handle.dataset.corner as ResizeCorner;
      const startRect = root.getBoundingClientRect();
      const startX = event.clientX;
      const startY = event.clientY;
      const startRight = startRect.left + startRect.width;
      const startBottom = startRect.top + startRect.height;
      const isWest = corner.endsWith("w");
      const isNorth = corner.startsWith("n");

      root.style.left = `${startRect.left}px`;
      root.style.top = `${startRect.top}px`;
      root.style.right = "auto";
      root.style.bottom = "auto";
      root.style.width = `${startRect.width}px`;
      root.style.height = `${startRect.height}px`;

      function onMouseMove(moveEvent: MouseEvent) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        const nextWidth = clamp(
          startRect.width + (isWest ? -deltaX : deltaX),
          PANEL_MIN_WIDTH,
          getPanelMaxWidth(),
        );
        const nextHeight = clamp(
          startRect.height + (isNorth ? -deltaY : deltaY),
          PANEL_MIN_HEIGHT,
          getPanelMaxHeight(),
        );
        const nextLeft = isWest ? startRight - nextWidth : startRect.left;
        const nextTop = isNorth ? startBottom - nextHeight : startRect.top;

        root.style.left = `${nextLeft}px`;
        root.style.top = `${nextTop}px`;
        root.style.width = `${nextWidth}px`;
        root.style.height = `${nextHeight}px`;
      }

      function stopResize() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", stopResize);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", stopResize);
    });

    root.append(handle);
  }
}

function createPanel() {
  const existing = document.getElementById(PANEL_ID);

  if (existing instanceof HTMLDivElement) {
    const status = existing.querySelector("[data-role='status']");
    const diagram = existing.querySelector("[data-role='diagram']");

    if (status instanceof HTMLParagraphElement && diagram instanceof HTMLDivElement) {
      return {
        root: existing,
        status,
        diagram,
      } satisfies DevtoolsPanel;
    }
  }

  const root = document.createElement("div");
  const title = document.createElement("h2");
  const status = document.createElement("p");
  const diagram = document.createElement("div");

  root.id = PANEL_ID;
  root.style.position = "fixed";
  root.style.right = "16px";
  root.style.bottom = "16px";
  // 这里显式维护面板尺寸上下限，配合四角手柄更接近传统 devtools 面板体验。
  root.style.width = `${PANEL_DEFAULT_WIDTH}px`;
  root.style.height = `${PANEL_DEFAULT_HEIGHT}px`;
  root.style.minWidth = `${PANEL_MIN_WIDTH}px`;
  root.style.minHeight = `${PANEL_MIN_HEIGHT}px`;
  root.style.maxWidth = "80vw";
  root.style.maxHeight = "80vh";
  root.style.overflow = "auto";
  root.style.padding = "16px";
  root.style.boxSizing = "border-box";
  root.style.borderRadius = "16px";
  root.style.border = "1px solid #d6d0c4";
  root.style.background = "rgba(249, 246, 239, 0.96)";
  root.style.color = "#2b2a28";
  root.style.boxShadow = "0 20px 45px rgba(61, 50, 38, 0.18)";
  root.style.backdropFilter = "blur(8px)";
  root.style.fontFamily = "'IBM Plex Mono', 'Fira Code', monospace";
  root.style.zIndex = "9999";

  title.textContent = "lite-react devtools";
  title.style.margin = "0 0 8px";
  title.style.fontSize = "14px";
  title.style.letterSpacing = "0.04em";
  title.style.textTransform = "uppercase";

  status.dataset.role = "status";
  status.textContent = "Waiting for render events...";
  status.style.margin = "0 0 12px";
  status.style.fontSize = "12px";
  status.style.color = "#6a6258";

  diagram.dataset.role = "diagram";
  diagram.style.minHeight = "120px";
  diagram.style.fontSize = "12px";
  diagram.style.lineHeight = "1.4";

  root.append(title, status, diagram);
  attachResizeHandles(root);
  document.body.append(root);

  return {
    root,
    status,
    diagram,
  } satisfies DevtoolsPanel;
}

async function renderSnapshotGraph(
  diagramRoot: HTMLDivElement,
  snapshot: LiteFiberSnapshot | null,
  renderId: number,
) {
  ensureMermaid();

  try {
    const graphDefinition = fiberSnapshotToMermaid(snapshot);
    const { svg } = await mermaid.render(
      `lite-react-devtools-${renderId}-${Date.now()}`,
      graphDefinition,
    );

    diagramRoot.innerHTML = svg;
  } catch (error) {
    diagramRoot.innerHTML = "";

    const fallback = document.createElement("pre");
    fallback.textContent =
      error instanceof Error ? error.message : "Mermaid render failed";
    diagramRoot.append(fallback);
  }
}

function formatStatus(event: LiteDevtoolsEvent) {
  if (event.type === "render:scheduled") {
    return `scheduled #${event.renderId}`;
  }

  return `commit #${event.renderId} @ ${new Date(event.timestamp).toLocaleTimeString()}`;
}

function handleEvent(panel: DevtoolsPanel, event: LiteDevtoolsEvent) {
  panel.status.textContent = formatStatus(event);

  if (event.type === "render:commit") {
    void renderSnapshotGraph(panel.diagram, event.snapshot, event.renderId);
  }
}

export function mountLiteReactDevtools() {
  if (typeof document === "undefined") {
    return;
  }

  const hook = ensureLiteDevtoolsHook();
  const panel = createPanel();

  hook.subscribe((event) => {
    handleEvent(panel, event);
  });
}
