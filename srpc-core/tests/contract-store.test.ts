import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, expect, test } from "bun:test";
import express from "express";
import { createContractStore } from "../src/contract-store.ts";
import { createContractsApiRouter } from "../rpc/contracts-router.ts";
import { createSrpcDevToolsAuth } from "../rpc/devtools-auth.ts";

const tempDirs: string[] = [];

function makeTempContractDir(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), "srpc-contract-store-"));
  tempDirs.push(dir);

  for (const [file, source] of Object.entries(files)) {
    writeFileSync(join(dir, file), source, "utf8");
  }

  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

test("createContractStore reads and lists contract sources", () => {
  const dir = makeTempContractDir({
    "user.ctr": `package user

struct User {
    id: string
}
`,
  });

  const store = createContractStore({ contractDir: dir });
  const sources = store.listSources();

  expect(sources).toHaveLength(1);
  expect(sources[0]?.package).toBe("user");
  expect(store.getSource("user")?.source).toContain("struct User");
});

test("createContract creates and updates contracts with validation", () => {
  const dir = makeTempContractDir({
    "common.ctr": `package common

struct EmptyResponse {
    ok: boolean
}
`,
  });

  const store = createContractStore({ contractDir: dir });

  store.createContract({
    package: "billing",
    source: `package billing

struct Invoice {
    id: string
    total: float
}
`,
  });

  expect(store.getSource("billing")?.source).toContain("struct Invoice");

  store.updateContract("billing", {
    source: `package billing

struct Invoice {
    id: string
    total: float
    currency: billing.CurrencyCode
}

enum CurrencyCode {
    USD
    EUR
}
`,
  });

  expect(store.getSource("billing")?.source).toContain("CurrencyCode");
});

test("createContract rejects invalid source", () => {
  const dir = makeTempContractDir({});
  const store = createContractStore({ contractDir: dir });

  expect(() =>
    store.createContract({
      package: "broken",
      source: "package broken\n\nstruct {",
    })
  ).toThrow();
});

async function withServer(
  app: express.Express,
  run: (baseUrl: string) => Promise<void>
): Promise<void> {
  const server = app.listen(0);
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to bind test server");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
  }
}

test("contracts API supports list, get, create, update, and delete", async () => {
  const dir = makeTempContractDir({
    "common.ctr": `package common

struct EmptyResponse {
    ok: boolean
}
`,
  });

  const app = express();
  app.use("/api/contracts", createContractsApiRouter({ contractDir: dir }));

  await withServer(app, async baseUrl => {
    const listRes = await fetch(`${baseUrl}/api/contracts`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(list.contracts.some((entry: { package: string }) => entry.package === "common")).toBe(
      true
    );

    const createRes = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: "billing",
        source: `package billing

struct Invoice {
    id: string
}
`,
      }),
    });
    expect(createRes.status).toBe(201);

    const getRes = await fetch(`${baseUrl}/api/contracts/billing/source`);
    expect(getRes.status).toBe(200);
    expect(await getRes.text()).toContain("struct Invoice");

    const updateRes = await fetch(`${baseUrl}/api/contracts/billing`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: `package billing

struct Invoice {
    id: string
    total: float
}
`,
      }),
    });
    expect(updateRes.status).toBe(200);

    const deleteRes = await fetch(`${baseUrl}/api/contracts/billing`, {
      method: "DELETE",
    });
    expect(deleteRes.status).toBe(204);

    const missingRes = await fetch(`${baseUrl}/api/contracts/billing`);
    expect(missingRes.status).toBe(404);
  });
});

test("contracts API requires api key for writes when configured", async () => {
  const dir = makeTempContractDir({
    "common.ctr": `package common

struct EmptyResponse {
    ok: boolean
}
`,
  });

  const app = express();
  app.use(
    "/api/contracts",
    createSrpcDevToolsAuth({ apiKey: "secret-key" })!,
    createContractsApiRouter({ contractDir: dir })
  );

  await withServer(app, async baseUrl => {
    const denied = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        package: "billing",
        source: "package billing\n",
      }),
    });
    expect(denied.status).toBe(401);

    const allowed = await fetch(`${baseUrl}/api/contracts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer secret-key",
      },
      body: JSON.stringify({
        package: "billing",
        source: `package billing

struct Invoice {
    id: string
}
`,
      }),
    });
    expect(allowed.status).toBe(201);
  });
});
