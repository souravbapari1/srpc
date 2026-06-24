/// <reference types="bun" />

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "bun:test";
import express from "express";
import { createContractsApiRouter, createSrpcDevToolsAuth } from "srpc-core/rpc";
import { hasFlag, positionalArgs, readFlag, stripClientFlags } from "../src/args.ts";
import {
  listLocalPackages,
  localPackagePath,
  resolveContractDir,
  resolvePackageFile,
} from "../src/packages.ts";
import { createContractsClient } from "../src/client.ts";

const cliPath = join(import.meta.dir, "../cli.ts");
const tempDirs: string[] = [];

function makeTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function makeTempContractDir(files: Record<string, string>): string {
  const dir = makeTempDir("srpc-cli-contract-");
  for (const [file, source] of Object.entries(files)) {
    writeFileSync(join(dir, file), source, "utf8");
  }
  return dir;
}

async function runCli(args: string[], env: Record<string, string> = {}): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  const proc = Bun.spawn(["bun", cliPath, ...args], {
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...env },
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  return { exitCode, stdout, stderr };
}

async function withApiServer(
  contractDir: string,
  run: (baseUrl: string) => Promise<void>,
  apiKey?: string
): Promise<void> {
  const app = express();
  if (apiKey) {
    app.use("/api/contracts", createSrpcDevToolsAuth({ apiKey })!);
  }
  app.use("/api/contracts", createContractsApiRouter({ contractDir }));

  const server = await new Promise<ReturnType<typeof app.listen>>((resolve, reject) => {
    const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    listener.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Failed to bind test server");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    await run(baseUrl);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close(error => (error ? reject(error) : resolve()));
    });
  }
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("args", () => {
  test("readFlag and stripClientFlags remove only client options", () => {
    const args = [
      "package",
      "pull",
      "user",
      "--url",
      "http://example.test",
      "--api-key",
      "secret",
      "--dir",
      "/tmp/contracts",
    ];
    expect(readFlag(args, "--url")).toBe("http://example.test");
    expect(readFlag(args, "--dir")).toBe("/tmp/contracts");
    expect(stripClientFlags(args)).toEqual([
      "package",
      "pull",
      "user",
      "--dir",
      "/tmp/contracts",
    ]);
    expect(positionalArgs(["user", "--dir", "/tmp/contracts"])).toEqual(["user"]);
    expect(hasFlag(["--help"], "--help")).toBe(true);
  });
});

describe("packages", () => {
  test("resolveContractDir and local package paths", () => {
    const dir = makeTempContractDir({
      "user.ctr": "package user\n\nstruct User { id: string }\n",
    });

    const args = ["--dir", dir];
    expect(resolveContractDir(args)).toBe(dir);
    expect(localPackagePath(dir, "user")).toBe(join(dir, "user.ctr"));
    expect(listLocalPackages(dir)).toEqual(["user"]);
    expect(resolvePackageFile(dir, "user")).toBe(join(dir, "user.ctr"));
  });
});

describe("client", () => {
  test("createContractsClient lists and fetches packages", async () => {
    const contractDir = makeTempContractDir({
      "user.ctr": `package user

struct User {
    id: string
}
`,
    });

    await withApiServer(contractDir, async baseUrl => {
      const client = createContractsClient({ baseUrl });
      const list = await client.list();
      expect(list.contracts).toHaveLength(1);
      expect(list.contracts[0]?.package).toBe("user");

      const source = await client.getSource("user");
      expect(source).toContain("struct User");
    });
  });
});

describe("cli", () => {
  test("prints help", async () => {
    const result = await runCli(["--help"]);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("srpc package list");
    expect(result.stdout).toContain("SRPC_URL");
  });

  test("generate writes types from contracts", async () => {
    const contractDir = makeTempContractDir({
      "user.ctr": `package user

struct User {
    id: string
}
`,
    });
    const outDir = makeTempDir("srpc-cli-out-");
    const outputFile = join(outDir, "types.ts");

    const result = await runCli([
      "generate",
      "--contract-dir",
      contractDir,
      "--out",
      outputFile,
    ]);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("wrote");
    expect(existsSync(outputFile)).toBe(true);
    expect(readFileSync(outputFile, "utf8")).toContain("interface User");
  });

  test("create scaffolds a starter app", async () => {
    const parentDir = makeTempDir("srpc-cli-create-");

    const result = await runCli(["create", "hello-srpc", "--dir", parentDir]);

    const projectDir = join(parentDir, "hello-srpc");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("created starter app");
    expect(existsSync(join(projectDir, "package.json"))).toBe(true);
    expect(existsSync(join(projectDir, "index.ts"))).toBe(true);
    expect(existsSync(join(projectDir, "contract", "demo.ctr"))).toBe(true);
    expect(existsSync(join(projectDir, "services", "demo.ts"))).toBe(true);
    expect(existsSync(join(projectDir, ".git"))).toBe(true);

    const packageJson = readFileSync(join(projectDir, "package.json"), "utf8");
    expect(packageJson).toContain('"name": "hello-srpc"');
    expect(packageJson).toContain('"generate": "srpc generate --contract-dir ./contract --out ./generated/srpc-types.ts"');
  });

  test("package list connects to contract API", async () => {
    const contractDir = makeTempContractDir({
      "common.ctr": `package common

struct EmptyResponse {
    ok: boolean
}
`,
      "user.ctr": `package user

struct User {
    id: string
}
`,
    });

    await withApiServer(contractDir, async baseUrl => {
      const result = await runCli(["package", "list", "--url", baseUrl]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("common");
      expect(result.stdout).toContain("user");
      expect(result.stdout).toContain("package");
    });
  });

  test("package pull, push, validate, and delete roundtrip", async () => {
    const serverDir = makeTempContractDir({
      "common.ctr": `package common

struct EmptyResponse {
    ok: boolean
}
`,
    });
    const clientDir = makeTempDir("srpc-cli-client-");

    await withApiServer(serverDir, async baseUrl => {
      const pull = await runCli(["package", "pull", "--url", baseUrl, "--dir", clientDir]);
      expect(pull.exitCode).toBe(0);
      expect(existsSync(join(clientDir, "common.ctr"))).toBe(true);

      const validate = await runCli([
        "package",
        "validate",
        "common",
        "--url",
        baseUrl,
        "--dir",
        clientDir,
      ]);
      expect(validate.exitCode).toBe(0);
      expect(validate.stdout).toContain("valid");

      writeFileSync(
        join(clientDir, "billing.ctr"),
        `package billing

struct Invoice {
    id: string
    total: float
}
`,
        "utf8"
      );

      const push = await runCli(["package", "push", "billing", "--url", baseUrl, "--dir", clientDir]);
      expect(push.exitCode).toBe(0);
      expect(push.stdout).toContain("created");

      const get = await runCli(["package", "get", "billing", "--url", baseUrl, "--dir", clientDir]);
      expect(get.exitCode).toBe(0);
      expect(get.stdout).toContain("pulled");

      const del = await runCli(["package", "delete", "billing", "--url", baseUrl]);
      expect(del.exitCode).toBe(0);
      expect(del.stdout).toContain("deleted");
    });
  });

  test("remote alias works like package", async () => {
    const contractDir = makeTempContractDir({
      "user.ctr": `package user

struct User {
    id: string
}
`,
    });

    await withApiServer(contractDir, async baseUrl => {
      const result = await runCli(["remote", "list", "--url", baseUrl]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain("user");
    });
  });

  test("requires api key when configured", async () => {
    const contractDir = makeTempContractDir({
      "common.ctr": `package common

struct EmptyResponse {
    ok: boolean
}
`,
    });

    await withApiServer(
      contractDir,
      async baseUrl => {
        const denied = await runCli([
          "package",
          "push",
          "common",
          "--url",
          baseUrl,
          "--dir",
          contractDir,
        ]);
        expect(denied.exitCode).toBe(1);
        expect(denied.stderr).toContain("Invalid or missing credentials");

        const allowed = await runCli(
          [
            "package",
            "push",
            "common",
            "--url",
            baseUrl,
            "--dir",
            contractDir,
          ],
          { SRPC_API_KEY: "test-secret" }
        );
        expect(allowed.exitCode).toBe(0);
        expect(allowed.stdout).toContain("updated");
      },
      "test-secret"
    );
  });

  test("fails on unknown package", async () => {
    const contractDir = makeTempContractDir({
      "common.ctr": `package common

struct EmptyResponse {
    ok: boolean
}
`,
    });

    await withApiServer(contractDir, async baseUrl => {
      const result = await runCli(["package", "get", "missing", "--url", baseUrl]);
      expect(result.exitCode).toBe(1);
      expect(result.stderr.length).toBeGreaterThan(0);
    });
  });
});
