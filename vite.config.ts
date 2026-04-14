import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { liteReactDevtools } from "./src/vite-plugin-lite-react-devtools";

const indexHtml = fileURLToPath(new URL("./index.html", import.meta.url));
const liteHtml = fileURLToPath(new URL("./lite.html", import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), liteReactDevtools()],
  build: {
    rollupOptions: {
      input: {
        main: indexHtml,
        lite: liteHtml,
      },
    },
  },
  test: {
    environment: "jsdom",
  },
});
