import type { LiteFiberSnapshot } from "../lite-react/devtools";

function escapeMermaidLabel(value: string) {
  return value.replace(/"/g, "'").replace(/\n/g, "<br/>");
}

function formatFiberLabel(snapshot: LiteFiberSnapshot) {
  const lines = [snapshot.type];

  if (snapshot.key !== null) {
    lines.push(`key: ${String(snapshot.key)}`);
  }

  if (snapshot.effectTag) {
    lines.push(`effect: ${snapshot.effectTag}`);
  }

  if (snapshot.hooks.length > 0) {
    lines.push(`hooks: ${snapshot.hooks.join(", ")}`);
    lines.push(`hookCount: ${snapshot.hookCount}`);
    lines.push(`hookChain: ${snapshot.hookChain}`);
  }

  return escapeMermaidLabel(lines.join("\n"));
}

function appendFiberLines(snapshot: LiteFiberSnapshot, lines: string[]) {
  lines.push(`${snapshot.id}["${formatFiberLabel(snapshot)}"]`);

  for (const child of snapshot.children) {
    lines.push(`${snapshot.id} --> ${child.id}`);
    appendFiberLines(child, lines);
  }
}

export function fiberSnapshotToMermaid(snapshot: LiteFiberSnapshot | null) {
  const lines = ["flowchart TD"];

  if (!snapshot) {
    lines.push('empty["No Fiber tree yet"]');
    return lines.join("\n");
  }

  // 这里只画父子树边，保持教学版图结构简洁可读。
  appendFiberLines(snapshot, lines);
  return lines.join("\n");
}
