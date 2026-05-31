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

function forceQuotedString(doc: Document, key: string): void {
  const contents = doc.contents;
  if (!(contents instanceof YAMLMap)) return;
  const node = contents.get(key, true);
  if (node instanceof Scalar) {
    node.type = Scalar.QUOTE_DOUBLE;
  }
}
