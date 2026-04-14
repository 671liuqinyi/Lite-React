/** @jsxRuntime classic */
/** @jsx createElement */
import { createElement } from "lite-react";
import { render } from "lite-react-dom";
import App from "./App.tsx";

// The classic JSX pragma consumes this binding during TSX compilation.
void createElement;

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container for lite-react demo");
}

render(<App title="lite-react" />, container);
