#!/usr/bin/env bun
import * as path from "node:path";
import { generateFromContracts } from "srpc-core";
import { hasFlag, positionalArgs, readFlag, stripClientFlags } from "./src/args.ts";
import {
  listLocalPackages,
  readPackageSource,
  resolveContractDir,
  resolvePackageFile,
  writePackageSource,
} from "./src/packages.ts";
import {
  ContractsApiError,
  createContractsClient,
  type ContractsClientOptions,
} from "./src/client.ts";
import { createStarterProject } from "./src/create.ts";
import {
  bullet,
  c,
  fail,
  formatPackageStats,
  info,
  path as fmtPath,
  pkg,
  printUsage,
  success,
  url,
  warn,
} from "./src/ui.ts";

function parseClientOptions(args: string[]): {
  options: ContractsClientOptions;
  rest: string[];
} {
  if (hasFlag(args, "--no-color")) {
    process.env.NO_COLOR = "1";
  }

  const baseUrl =
    readFlag(args, "--url") ??
    process.env.SRPC_URL ??
    "http://localhost:3100";

  const apiKey =
    readFlag(args, "--api-key") ??
    readFlag(args, "--token") ??
    process.env.SRPC_API_KEY ??
    process.env.SRPC_TOKEN;

  const username = readFlag(args, "--user") ?? process.env.SRPC_USER;
  const password = readFlag(args, "--password") ?? process.env.SRPC_PASSWORD;

  const basicAuth =
    username && password ? { username, password } : undefined;

  return {
    options: { baseUrl, apiKey, basicAuth },
    rest: stripClientFlags(args),
  };
}

function printApiError(error: ContractsApiError): void {
  fail(error.message);
  if (error.body.diagnostics?.length) {
    for (const diagnostic of error.body.diagnostics) {
      const icon = diagnostic.severity === "error" ? c.red("✗") : c.yellow("!");
      console.error(`  ${icon} ${diagnostic.message}`);
    }
  }
}

async function runGenerate(args: string[]): Promise<void> {
  const projectRoot = process.cwd();
  const contractDir =
    readFlag(args, "--contract-dir") ?? path.join(projectRoot, "contract");
  const outputFile =
    readFlag(args, "--out") ?? path.join(projectRoot, "generated/srpc-types.ts");

  info(`generating from ${fmtPath(contractDir)}`);

  const result = generateFromContracts({ contractDir, outputFile });
  if (result.errors.length > 0) {
    console.log("");
    fail(`${result.errors.length} error${result.errors.length === 1 ? "" : "s"}`);
    for (const error of result.errors) {
      console.error(`  ${c.red("✗")} ${error}`);
    }
    process.exit(1);
  }

  console.log("");
  console.log(
    [
      `${c.green(String(result.stats.services))} ${c.dim("services")}`,
      `${c.blue(String(result.stats.structs))} ${c.dim("structs")}`,
      `${c.magenta(String(result.stats.enums))} ${c.dim("enums")}`,
      `${c.yellow(String(result.stats.methods))} ${c.dim("methods")}`,
    ].join(c.dim(" · "))
  );
  success(`wrote ${fmtPath(result.outputFile)}`);
}

async function runCreate(args: string[]): Promise<void> {
  const name = positionalArgs(args)[0];
  if (!name) {
    fail("project name required");
    process.exit(1);
  }

  const baseDir = readFlag(args, "--dir") ?? process.cwd();
  const git = !hasFlag(args, "--no-git");

  const result = createStarterProject({
    name,
    baseDir,
    git,
  });

  console.log("");
  success(`created starter app in ${fmtPath(result.projectDir)}`);
  console.log("");
  bullet(`contract ${c.dim("→")} ${fmtPath(path.join(result.projectDir, "contract/demo.ctr"))}`);
  bullet(`server ${c.dim("→")} ${fmtPath(path.join(result.projectDir, "index.ts"))}`);
  bullet(`services ${c.dim("→")} ${fmtPath(path.join(result.projectDir, "services"))}`);
  if (git && result.gitInitialized) {
    bullet("initialized git repository");
  } else if (git && !result.gitInitialized) {
    warn("starter created, but git init failed");
  }
  console.log("");
  info(`next: ${c.yellow(`cd ${result.projectDir}`)}`);
  info(`next: ${c.yellow("bun install")}`);
  info(`next: ${c.yellow("bun run dev")}`);
}

async function runPackageList(options: ContractsClientOptions): Promise<void> {
  const client = createContractsClient(options);
  const response = await client.list();

  console.log("");
  info(`packages at ${url(options.baseUrl)}`);
  console.log("");
  console.log(
    `  ${c.bold(c.dim("PACKAGE".padEnd(16)))} ${c.bold(c.dim("FILE".padEnd(18)))} ${c.bold(c.dim("SUMMARY"))}`
  );

  for (const entry of response.contracts) {
    const summary = response.index.packages.find(pkg => pkg.name === entry.package);
    const details = summary
      ? formatPackageStats(summary.services, summary.structs, summary.enums)
      : c.dim(entry.file);

    console.log(
      `  ${pkg(entry.package.padEnd(16))} ${c.dim(entry.file.padEnd(18))} ${details}`
    );
  }

  console.log("");
  success(`${response.contracts.length} package${response.contracts.length === 1 ? "" : "s"}`);
}

async function runPackageGet(
  options: ContractsClientOptions,
  packageName: string,
  args: string[]
): Promise<void> {
  const client = createContractsClient(options);
  const remote = await client.list();
  const contractDir = resolveContractDir(args);
  const source = await client.getSource(packageName);
  const out =
    readFlag(args, "--out") ??
    resolvePackageFile(contractDir, packageName, remote);

  writePackageSource(out, source);
  success(`pulled ${pkg(packageName)} ${c.dim("→")} ${fmtPath(out)}`);
}

async function runPackagePull(
  options: ContractsClientOptions,
  args: string[]
): Promise<void> {
  const client = createContractsClient(options);
  const contractDir = resolveContractDir(args);
  const requested = positionalArgs(args);
  const remote = await client.list();
  const targets =
    requested.length > 0
      ? remote.contracts.filter(entry => requested.includes(entry.package))
      : remote.contracts;

  if (requested.length > 0 && targets.length !== requested.length) {
    const found = new Set(targets.map(entry => entry.package));
    const missing = requested.filter(name => !found.has(name));
    fail(`unknown package(s): ${missing.map(pkg).join(", ")}`);
    process.exit(1);
  }

  info(`pulling ${targets.length} package${targets.length === 1 ? "" : "s"} to ${fmtPath(contractDir)}`);

  for (const entry of targets) {
    const source = await client.getSource(entry.package);
    const outPath = resolvePackageFile(contractDir, entry.package, remote);
    writePackageSource(outPath, source);
    console.log(`  ${c.teal("↓")} ${pkg(entry.package)} ${c.dim("→")} ${fmtPath(outPath)}`);
  }

  success(`synced ${targets.length} package${targets.length === 1 ? "" : "s"}`);
}

async function runPackagePush(
  options: ContractsClientOptions,
  args: string[]
): Promise<void> {
  const client = createContractsClient(options);
  const contractDir = resolveContractDir(args);
  const requested = positionalArgs(args);
  const remote = await client.list();
  const remotePackages = new Map(
    remote.contracts.map(entry => [entry.package, entry])
  );

  const packages =
    requested.length > 0 ? requested : listLocalPackages(contractDir);

  if (packages.length === 0) {
    fail(`no packages to push in ${fmtPath(contractDir)}`);
    process.exit(1);
  }

  info(`pushing ${packages.length} package${packages.length === 1 ? "" : "s"} to ${url(options.baseUrl)}`);

  for (const packageName of packages) {
    const { source, filePath } = readPackageSource(packageName, args, contractDir);
    const remoteEntry = remotePackages.get(packageName);

    if (remoteEntry) {
      await client.update(packageName, source);
      console.log(`  ${c.yellow("↑")} ${c.yellow("updated")} ${pkg(packageName)} ${c.dim("from")} ${fmtPath(filePath)}`);
      continue;
    }

    await client.create({
      package: packageName,
      source,
      file: path.basename(filePath),
    });
    console.log(`  ${c.green("+")} ${c.green("created")} ${pkg(packageName)} ${c.dim("from")} ${fmtPath(filePath)}`);
  }

  success(`pushed ${packages.length} package${packages.length === 1 ? "" : "s"}`);
}

async function runPackageCreate(
  options: ContractsClientOptions,
  packageName: string,
  args: string[]
): Promise<void> {
  const contractDir = resolveContractDir(args);
  const { source, filePath } = readPackageSource(packageName, args, contractDir);
  const client = createContractsClient(options);
  const entry = await client.create({
    package: packageName,
    source,
    file: path.basename(filePath),
  });
  success(`created ${pkg(entry.package)} ${c.dim(`(${entry.file})`)}`);
}

async function runPackageUpdate(
  options: ContractsClientOptions,
  packageName: string,
  args: string[]
): Promise<void> {
  const contractDir = resolveContractDir(args);
  const { source, filePath } = readPackageSource(packageName, args, contractDir);
  const client = createContractsClient(options);
  const entry = await client.update(packageName, source);
  success(`updated ${pkg(entry.package)} ${c.dim("from")} ${fmtPath(filePath)}`);
}

async function runPackageValidate(
  options: ContractsClientOptions,
  packageName: string,
  args: string[]
): Promise<void> {
  const contractDir = resolveContractDir(args);
  const { source } = readPackageSource(packageName, args, contractDir);
  const client = createContractsClient(options);
  const result = await client.validate({
    source,
    package: packageName,
    excludePackage: packageName,
  });

  if (result.valid) {
    success(`package ${pkg(packageName)} is valid`);
    return;
  }

  fail(`package ${packageName} has validation errors`);
  for (const diagnostic of result.diagnostics) {
    const icon = diagnostic.severity === "error" ? c.red("✗") : c.yellow("!");
    console.error(`  ${icon} ${diagnostic.message}`);
  }
  process.exit(1);
}

async function runPackageDelete(
  options: ContractsClientOptions,
  packageName: string
): Promise<void> {
  const client = createContractsClient(options);
  await client.delete(packageName);
  success(`deleted ${pkg(packageName)}`);
}

async function runPackage(command: string, args: string[]): Promise<void> {
  const { options, rest } = parseClientOptions(args);

  try {
    switch (command) {
      case "list":
        await runPackageList(options);
        return;
      case "get": {
        const packageName = positionalArgs(rest)[0];
        if (!packageName) {
          fail("package name required");
          process.exit(1);
        }
        await runPackageGet(options, packageName, rest);
        return;
      }
      case "pull":
        await runPackagePull(options, rest);
        return;
      case "push":
        await runPackagePush(options, rest);
        return;
      case "create": {
        const packageName = positionalArgs(rest)[0];
        if (!packageName) {
          fail("package name required");
          process.exit(1);
        }
        await runPackageCreate(options, packageName, rest);
        return;
      }
      case "update": {
        const packageName = positionalArgs(rest)[0];
        if (!packageName) {
          fail("package name required");
          process.exit(1);
        }
        await runPackageUpdate(options, packageName, rest);
        return;
      }
      case "validate": {
        const packageName = positionalArgs(rest)[0];
        if (!packageName) {
          fail("package name required");
          process.exit(1);
        }
        await runPackageValidate(options, packageName, rest);
        return;
      }
      case "delete": {
        const packageName = positionalArgs(rest)[0];
        if (!packageName) {
          fail("package name required");
          process.exit(1);
        }
        await runPackageDelete(options, packageName);
        return;
      }
      default:
        fail(`unknown package command "${command}"`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    if (error instanceof ContractsApiError) {
      printApiError(error);
      process.exit(1);
    }
    throw error;
  }
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (!command || hasFlag(argv, "--help") || hasFlag(argv, "-h")) {
    printUsage();
    process.exit(command ? 0 : 1);
  }

  if (command === "generate") {
    await runGenerate(argv.slice(1));
    return;
  }

  if (command === "create") {
    await runCreate(argv.slice(1));
    return;
  }

  if (command === "package" || command === "remote") {
    await runPackage(argv[1] ?? "", argv.slice(2));
    return;
  }

  fail(`unknown command "${command}"`);
  printUsage();
  process.exit(1);
}

await main();
