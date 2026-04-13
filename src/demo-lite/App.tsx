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

const keyedItems = [
  { id: "a", label: "A" },
  { id: "b", label: "B" },
  { id: "c", label: "C" },
];

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

const KeyedCounterList: LiteFunctionComponent = () => {
  const [reversed, setReversed] = useState(false);
  const items = reversed ? [...keyedItems].reverse() : keyedItems;

  return (
    <section className="demo-stack">
      <button onClick={() => setReversed((value) => !value)}>
        {reversed ? "restore order" : "reverse order"}
      </button>
      <div className="demo-row">
        {items.map((item) => (
          <Counter key={item.id} label={item.label} />
        ))}
      </div>
    </section>
  );
};

const App: LiteFunctionComponent<AppProps> = ({ title }) => {
  return (
    <section id="lite-root">
      <p>{"key + list diff + state follows identity"}</p>
      <Panel title={title}>
        <KeyedCounterList />
      </Panel>
    </section>
  );
};

export default App;
