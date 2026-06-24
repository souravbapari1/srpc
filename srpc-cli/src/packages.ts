import * as fs from "node:fs";
import * as path from "node:path";
import { readFlag } from "./args.ts";
import type { ContractListResponse } from "./client.ts";
import { fail, path as fmtPath, pkg } from "./ui.ts";

export function resolveContractDir(args: string[]): string {
  return path.resolve(
    readFlag(args, "--dir") ??
    process.env.SRPC_CONTRACT_DIR ??
    "contract"
  );
}

export function packageFileName(packageName: string): string {
  return `${packageName}.ctr`;
}

export function localPackagePath(contractDir: string, packageName: string): string {
  return path.join(contractDir, packageFileName(packageName));
}

export function resolvePackageFile(
  contractDir: string,
  packageName: string,
  remote?: ContractListResponse,
  explicitFile?: string
): string {
  if (explicitFile) {
    return path.resolve(explicitFile);
  }

  const remoteEntry = remote?.contracts.find(entry => entry.package === packageName);
  if (remoteEntry) {
    return path.join(contractDir, remoteEntry.file);
  }

  return localPackagePath(contractDir, packageName);
}

export function readPackageSource(
  packageName: string,
  args: string[],
  contractDir = resolveContractDir(args)
): { source: string; filePath: string } {
  const filePath = path.resolve(
    readFlag(args, "--file") ?? localPackagePath(contractDir, packageName)
  );

  if (!fs.existsSync(filePath)) {
    fail(`contract file not found for package ${pkg(packageName)}: ${fmtPath(filePath)}`);
    process.exit(1);
  }

  return {
    source: fs.readFileSync(filePath, "utf8"),
    filePath,
  };
}

export function writePackageSource(filePath: string, source: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, source, "utf8");
}

export function listLocalPackages(contractDir: string): string[] {
  if (!fs.existsSync(contractDir)) {
    return [];
  }

  return fs
    .readdirSync(contractDir)
    .filter(name => /\.(ctr|rpc)$/i.test(name))
    .map(name => name.replace(/\.(ctr|rpc)$/i, ""))
    .sort();
}
