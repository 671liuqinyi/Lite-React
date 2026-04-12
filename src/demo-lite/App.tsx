/** @jsxRuntime classic */
/** @jsx createElement */
import { createElement } from "../lite-react";

// The classic JSX pragma consumes this binding during TSX compilation.
void createElement;

const app = (
  <section id="lite-root" className="demo-card">
    <h1>lite-react</h1>
    <p>{"JSX -> vnode -> DOM"}</p>
    <div className="demo-row">
      <span>nested</span>
      <span>children</span>
    </div>
  </section>
);

export default app;
