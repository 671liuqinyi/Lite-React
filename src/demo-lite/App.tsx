/** @jsxRuntime classic */
/** @jsx createElement */
import { createElement, type LiteFunctionComponent } from "../lite-react";

// The classic JSX pragma consumes this binding during TSX compilation.
void createElement;

type AppProps = {
  title: string;
};

const App: LiteFunctionComponent<AppProps> = ({ title }) => {
  return (
    <section id="lite-root" className="demo-card">
      <h1>{title}</h1>
      <p>{"Function component mount"}</p>
      <div className="demo-row">
        <span>plain props</span>
        <span>first mount only</span>
      </div>
    </section>
  );
};

export default App;
