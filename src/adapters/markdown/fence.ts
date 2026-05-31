export interface SplitResult {
  readonly yaml: string;
  readonly body: string;
}

export class FenceError extends Error {}

export function splitFrontmatter(source: string): SplitResult {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new FenceError("missing opening --- fence at position 0");
  }
  const closeIdx = normalized.indexOf("\n---\n", 4);
  const closeAtEnd = normalized.endsWith("\n---") ? normalized.length - 4 : -1;
  const end = closeIdx >= 0 ? closeIdx : closeAtEnd;
  if (end < 0) {
    throw new FenceError("missing closing --- fence");
  }
  const yaml = normalized.slice(4, end);
  const bodyStart = closeIdx >= 0 ? closeIdx + 5 : normalized.length;
  const body = normalized.slice(bodyStart);
  return { yaml, body };
}

export function joinFrontmatter(yaml: string, body: string): string {
  const yamlBlock = yaml.endsWith("\n") ? yaml : yaml + "\n";
  return `---\n${yamlBlock}---\n${body}`;
}
