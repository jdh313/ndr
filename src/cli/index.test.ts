import { expect, test } from "bun:test";
import { run } from "./index.ts";

test("cli module exports a callable run()", () => {
  expect(typeof run).toBe("function");
});
