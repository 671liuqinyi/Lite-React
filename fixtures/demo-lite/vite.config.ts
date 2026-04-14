import { defineConfig, searchForWorkspaceRoot } from "vite";
import { liteReactDevtools } from "vite-plugin-lite-react-devtools";

export default defineConfig({
  plugins: [liteReactDevtools()],
  publicDir: "../../public",
  server: {
    fs: {
      // monorepo 下的 fixture 需要访问工作区根目录里的公共资源和包源码。
      allow: [searchForWorkspaceRoot(process.cwd())],
    },
  },
});
