#!/usr/bin/env bun
import * as fs from "fs";
import * as path from "path";
import { generateFromContracts } from "./src/codegen.ts";

function readFlag(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function parseArgs(argv: string[]) {
  if (argv[0] && !argv[0].startsWith("-") && argv[0] !== "generate") {
    console.error(`error: unknown command "${argv[0]}"`);
    console.error("usage: srpc-core generate [--contract-dir <dir>] [--out <file>]");
    process.exit(1);
  }

  const args = argv[0] === "generate" ? argv.slice(1) : argv;
  const projectRoot = process.cwd();

  const contractDir =
    readFlag(args, "--contract-dir") ?? path.join(projectRoot, "contract");

  const outputFile =
    readFlag(args, "--out") ?? path.join(projectRoot, "generated/srpc-types.ts");

  return { contractDir, outputFile };
}

function displayPath(filePath: string): string {
  const relative = path.relative(process.cwd(), filePath);
  return relative && !relative.startsWith("..") ? relative : filePath;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function printGenerateReport(
  options: { contractDir: string; outputFile: string },
  result: ReturnType<typeof generateFromContracts>
): void {
  const contractDir = displayPath(options.contractDir);
  const outputFile = displayPath(result.outputFile);
  const fileCount = result.filesRead.length;

  console.log("srpc-core generate");
  console.log("");
  console.log(`  input:      ${contractDir}/ (${fileCount} contract${fileCount === 1 ? "" : "s"})`);
  console.log(`  output:     ${outputFile}`);
  console.log("");

  if (result.filesRead.length > 0) {
    console.log("  contracts:");
    for (const file of result.filesRead) {
      console.log(`    - ${file}`);
    }
    console.log("");
  }

  const { structs, enums, services, methods } = result.stats;
  console.log("  generated:");
  console.log(`    structs:    ${structs}`);
  console.log(`    enums:      ${enums}`);
  console.log(`    services:   ${services}`);
  console.log(`    methods:    ${methods}`);

  try {
    const bytes = fs.statSync(result.outputFile).size;
    console.log(`    size:       ${formatBytes(bytes)}`);
  } catch {
    // Output file stat is optional for the report.
  }

  console.log("");

  if (result.errors.length > 0) {
    console.error(`  failed: ${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`);
    for (const error of result.errors) {
      console.error(`    - ${error}`);
    }
    console.error("");
    return;
  }

  console.log(`  done: wrote ${outputFile}`);
}

const options = parseArgs(process.argv.slice(2));
const result = generateFromContracts(options);

printGenerateReport(options, result);

if (result.errors.length > 0) {
  process.exit(1);
}
