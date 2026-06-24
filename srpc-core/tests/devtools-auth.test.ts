import { join } from "node:path";
import { test, expect } from "bun:test";
import express from "express";
import { createContractsApiRouter } from "../rpc/contracts-router.ts";
import { createSrpcDevToolsAuth } from "../rpc/devtools-auth.ts";

const contractDir = join(import.meta.dir, "../../example/contract");

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

test("devtools auth accepts bearer api key", async () => {
  const app = express();
  app.use(
    "/secure",
    createSrpcDevToolsAuth({ apiKey: "secret-key" })!,
    (_req, res) => {
      res.status(200).json({ ok: true });
    }
  );

  await withServer(app, async baseUrl => {
    const denied = await fetch(`${baseUrl}/secure`);
    expect(denied.status).toBe(401);

    const allowed = await fetch(`${baseUrl}/secure`, {
      headers: { Authorization: "Bearer secret-key" },
    });
    expect(allowed.status).toBe(200);
  });
});

test("devtools auth accepts basic auth", async () => {
  const app = express();
  app.use(
    "/secure",
    createSrpcDevToolsAuth({
      basicAuth: { username: "admin", password: "secret" },
    })!,
    (_req, res) => {
      res.status(200).send("ok");
    }
  );

  await withServer(app, async baseUrl => {
    const denied = await fetch(`${baseUrl}/secure`);
    expect(denied.status).toBe(401);

    const allowed = await fetch(`${baseUrl}/secure`, {
      headers: {
        Authorization: `Basic ${Buffer.from("admin:secret").toString("base64")}`,
      },
    });
    expect(allowed.status).toBe(200);
    expect(await allowed.text()).toBe("ok");
  });
});

test("contracts API requires api key for reads and writes when configured", async () => {
  const app = express();
  app.use(
    "/api/contracts",
    createContractsApiRouter({ contractDir, apiKey: "secret-key" })
  );

  await withServer(app, async baseUrl => {
    const listDenied = await fetch(`${baseUrl}/api/contracts`);
    expect(listDenied.status).toBe(401);

    const listAllowed = await fetch(`${baseUrl}/api/contracts`, {
      headers: { Authorization: "Bearer secret-key" },
    });
    expect(listAllowed.status).toBe(200);

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
