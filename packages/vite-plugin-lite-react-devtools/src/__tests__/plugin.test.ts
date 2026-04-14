import { describe, expect, it } from "vitest";
import { liteReactDevtools } from "../index";

type TransformIndexHtmlHook =
  | ((html: string, context: Record<string, unknown>) => unknown)
  | {
      handler: (html: string, context: Record<string, unknown>) => unknown;
    };

type ResolveIdHook =
  | ((id: string) => unknown)
  | {
      handler: (id: string) => unknown;
    };

type LoadHook =
  | ((id: string) => unknown)
  | {
      handler: (id: string) => unknown;
    };

function runTransformIndexHtml(
  hook: TransformIndexHtmlHook | undefined,
  filename: string,
) {
  if (!hook) {
    return undefined;
  }

  const context = {
    filename,
    path: filename,
    server: null,
    bundle: undefined,
    originalUrl: filename,
  };

  if (typeof hook === "function") {
    return hook("", context);
  }

  return hook.handler("", context);
}

function runResolveId(hook: ResolveIdHook | undefined, id: string) {
  if (!hook) {
    return undefined;
  }

  if (typeof hook === "function") {
    return hook(id);
  }

  return hook.handler(id);
}

function runLoad(hook: LoadHook | undefined, id: string) {
  if (!hook) {
    return undefined;
  }

  if (typeof hook === "function") {
    return hook(id);
  }

  return hook.handler(id);
}

describe("vite-plugin-lite-react-devtools", () => {
  it("injects the client into the active fixture html", async () => {
    const plugin = liteReactDevtools();
    const htmlHook = plugin.transformIndexHtml as unknown as
      | (TransformIndexHtmlHook & {
          order?: string;
        })
      | undefined;

    if (!htmlHook) {
      throw new Error("Expected transformIndexHtml hook to exist");
    }

    const liteTags = await runTransformIndexHtml(
      htmlHook,
      "/project/fixtures/demo-lite/index.html",
    );

    expect(htmlHook.order).toBe("pre");
    expect(JSON.stringify(liteTags)).toContain(
      "/@fs/",
    );
    expect(JSON.stringify(liteTags)).toContain(
      "packages/vite-plugin-lite-react-devtools/src/entry.ts",
    );
    expect(JSON.stringify(liteTags)).not.toContain(
      "virtual:lite-react-devtools/client",
    );
    expect(JSON.stringify(liteTags)).not.toContain("mountLiteReactDevtools");
  });

  it("loads a bootstrap module for the virtual client id", async () => {
    const plugin = liteReactDevtools();
    const resolved = await runResolveId(
      plugin.resolveId as ResolveIdHook | undefined,
      "virtual:lite-react-devtools/client",
    );
    const loaded = await runLoad(
      plugin.load as LoadHook | undefined,
      resolved as string,
    );

    expect(typeof resolved).toBe("string");
    expect(String(loaded)).toContain(
      'import "/@fs/',
    );
    expect(String(loaded)).toContain(
      "packages/vite-plugin-lite-react-devtools/src/entry.ts",
    );
  });
});
