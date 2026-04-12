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
    <button
      className={count > 0 ? "active" : "idle"}
      onClick={() => setCount((value) => value + 1)}
    >
      {`${label}:${count}`}
    </button>
  );
};

const HintToggle: LiteFunctionComponent = () => {
  const [visible, setVisible] = useState(true);

  return (
    <section className="demo-stack">
      <button onClick={() => setVisible((value) => !value)}>
        {visible ? "hide hint" : "show hint"}
      </button>
      {visible ? <p>{"Fiber diff can remove this node."}</p> : null}
    </section>
  );
};

const App: LiteFunctionComponent<AppProps> = ({ title }) => {
  return (
    <section id="lite-root">
      <p>{"fiber + diff + reusable DOM nodes"}</p>
      <Panel title={title}>
        <Counter label="A" />
        <Counter label="B" />
        <HintToggle />
      </Panel>
    </section>
  );
};

export default App;
