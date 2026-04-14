import { resolve } from "node:path";
import {
  normalizePath,
  searchForWorkspaceRoot,
  type HtmlTagDescriptor,
  type Plugin,
} from "vite";

const VIRTUAL_CLIENT_ID = "virtual:lite-react-devtools/client";
const RESOLVED_VIRTUAL_CLIENT_ID = `\0${VIRTUAL_CLIENT_ID}`;

export function resolveDevtoolsEntryPublicPath() {
  const workspaceRoot = searchForWorkspaceRoot(process.cwd());
  const entryFile = resolve(
    workspaceRoot,
    "packages/vite-plugin-lite-react-devtools/src/entry.ts",
  );

  // monorepo 下的 fixture 运行在独立目录，需要通过 /@fs/ 访问工作区包内的真实入口。
  // 这里直接从 workspace 根目录反推包内入口，避免测试和运行时的路径分歧。
  return `/@fs/${normalizePath(entryFile)}`;
}

export function liteReactDevtools(): Plugin {
  const clientEntry = resolveDevtoolsEntryPublicPath();

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

      return `import "${clientEntry}";`;
    },
    transformIndexHtml: {
      order: "pre",
      handler() {
        const tags: HtmlTagDescriptor[] = [
          {
            tag: "script",
            attrs: {
              type: "module",
              // 这里在 pre 阶段注入真实入口，让客户端脚本继续经过 Vite 的 HTML 处理链。
              src: clientEntry,
            },
            injectTo: "body",
          },
        ];

        return tags;
      },
    },
  };
}
