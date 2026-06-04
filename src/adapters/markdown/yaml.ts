import { Document, parseDocument, Scalar, YAMLMap, YAMLSeq } from "yaml";

export interface ParsedYaml {
  readonly data: unknown;
  readonly doc: Document.Parsed;
}

export function parseFrontmatterYaml(source: string): ParsedYaml {
  const doc = parseDocument(source, { keepSourceTokens: true });
  if (doc.errors.length > 0) {
    const first = doc.errors[0]!;
    throw new Error(`YAML parse error: ${first.message}`);
  }
  const data = doc.toJS({ mapAsMap: false });
  return { data, doc };
}

export function stringifyFrontmatter(data: Record<string, unknown>): string {
  const doc = new Document(data);
  forceFlowOnEmptySeqs(doc);
  forceQuotedString(doc, "id");
  return doc.toString();
}

function forceFlowOnEmptySeqs(doc: Document): void {
  const contents = doc.contents;
  if (!(contents instanceof YAMLMap)) return;
  for (const pair of contents.items) {
    const v = pair.value;
    if (v instanceof YAMLSeq && v.items.length === 0) {
      v.flow = true;
    }
  }
}

// Append a string to a top-level sequence key of a parsed document, mutating
// only that node — every other key keeps its source formatting. Creates the
// key when absent; no-ops when the value is already in the sequence.
export function appendToSequence(doc: Document.Parsed, key: string, value: string): void {
  const contents = doc.contents;
  if (!(contents instanceof YAMLMap)) {
    throw new Error("frontmatter is not a YAML mapping");
  }
  const node = contents.get(key, true);
  if (node instanceof YAMLSeq) {
    const present = node.items.some((item) => item instanceof Scalar && item.value === value);
    if (present) return;
    node.add(doc.createNode(value));
    // An empty `[]` parses as a flow seq; switch to block style on first entry
    // to match the corpus convention for non-empty lists.
    node.flow = false;
    return;
  }
  doc.set(key, doc.createNode([value]));
}

function forceQuotedString(doc: Document, key: string): void {
  const contents = doc.contents;
  if (!(contents instanceof YAMLMap)) return;
  const node = contents.get(key, true);
  if (node instanceof Scalar) {
    node.type = Scalar.QUOTE_DOUBLE;
  }
}
