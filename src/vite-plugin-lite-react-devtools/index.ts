import type { HtmlTagDescriptor, Plugin } from "vite";

const VIRTUAL_CLIENT_ID = "virtual:lite-react-devtools/client";
const RESOLVED_VIRTUAL_CLIENT_ID = `\0${VIRTUAL_CLIENT_ID}`;
const CLIENT_ENTRY = "/src/vite-plugin-lite-react-devtools/entry.ts";

export function liteReactDevtools(): Plugin {
  return {
    name: "vite-plugin-lite-react-devtools",
    enforce: "pre",
    resolveId(id) {
      if (id === VIRTUAL_CLIENT_ID) {
        return RESOLVED_VIRTUAL_CLIENT_ID;
      }

      return null;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_CLIENT_ID) {
        return null;
      }

      return `import "${CLIENT_ENTRY}";`;
    },
    transformIndexHtml: {
      order: "pre",
      handler(_html, context) {
        if (!context?.filename.endsWith("lite.html")) {
          return undefined;
        }

        const tags: HtmlTagDescriptor[] = [
          {
            tag: "script",
            attrs: {
              type: "module",
              // 这里用 pre 阶段注入真实入口，让脚本继续经过 Vite 的 HTML 处理链。
              src: CLIENT_ENTRY,
            },
            injectTo: "body",
          },
        ];

        return tags;
      },
    },
  };
}
