/** @jsxRuntime classic */
/** @jsx createElement */
import {
  createElement,
  type LiteFunctionComponent,
  useState,
} from "../lite-react";

// The classic JSX pragma consumes this binding during TSX compilation.
void createElement;

type AppProps = {
  title: string;
};

const Panel: LiteFunctionComponent<{ title: string }> = ({
  title,
  children,
}) => {
  return (
    <section className="demo-card">
      <h1>{title}</h1>
      <div className="demo-row">{children ?? []}</div>
    </section>
  );
};

const Counter: LiteFunctionComponent<{ label: string }> = ({ label }) => {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount((value) => value + 1)}>{`${label}:${count}`}</button>
  );
};

const App: LiteFunctionComponent<AppProps> = ({ title }) => {
  return (
    <section id="lite-root">
      <p>{"props.children + nested components + isolated state"}</p>
      <Panel title={title}>
        <Counter label="A" />
        <Counter label="B" />
      </Panel>
    </section>
  );
};

export default App;
