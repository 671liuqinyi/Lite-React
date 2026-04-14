import { mountLiteReactDevtools } from "./client";

// 这个入口专门给 HTML 注入使用，避免直接在页面里写内联 bootstrap 代码。
mountLiteReactDevtools();
