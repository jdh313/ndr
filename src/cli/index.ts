import { Command } from "commander";

export function run(argv: readonly string[]): void {
  const program = new Command();

  program
    .name("ndr")
    .description("Capture and resolution tooling for nested decision records.")
    .version("0.0.0");

  program.parse([...argv]);
}
