import * as fs from "fs";
import * as path from "path";

const CONTRACT_EXTENSIONS = new Set([".ctr", ".rpc"]);

export interface ContractFile {
  absolutePath: string;
  relativePath: string;
  source: string;
}

export function scanContractFiles(contractDir: string): ContractFile[] {
  const absoluteDir = path.resolve(contractDir);
  const files: ContractFile[] = [];

  walkDirectory(absoluteDir, absoluteDir, files);
  files.sort((a, b) => a.relativePath.localeCompare(b.relativePath));

  return files;
}

function walkDirectory(
  rootDir: string,
  currentDir: string,
  files: ContractFile[]
): void {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".") || entry.name === "node_modules") {
      continue;
    }

    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      walkDirectory(rootDir, absolutePath, files);
      continue;
    }

    if (!CONTRACT_EXTENSIONS.has(path.extname(entry.name))) {
      continue;
    }

    files.push({
      absolutePath,
      relativePath: path.relative(rootDir, absolutePath).replace(/\\/g, "/"),
      source: fs.readFileSync(absolutePath, "utf8"),
    });
  }
}
