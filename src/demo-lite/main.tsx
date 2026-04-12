import app from "./App.tsx";
import { render } from "../lite-react-dom";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container for lite-react demo");
}

render(app, container);
