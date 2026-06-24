import { join } from "node:path";
import { test, expect } from "bun:test";
import express from "express";
import { buildContractDocs } from "../src/contract-docs.ts";
import { buildContractGraph } from "../rpc/docs/contract-graph.ts";
import { createSrpcDocsRouter } from "../rpc/docs/router.ts";
import { createSrpcPlaygroundRouter } from "../rpc/playground.ts";
import { createSrpcRouter, defineService } from "../rpc/index.ts";
import { UserService } from "../../example/generated/srpc-types.ts";
import type { SrpcHandlerContext } from "../rpc/context.ts";

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

test("buildContractDocs indexes packages from contracts", () => {
  const store = buildContractDocs({ contractDir });

  expect(store.index.packages.length).toBeGreaterThan(0);
  expect(store.index.packages.some(pkg => pkg.name === "user")).toBe(true);
});

test("getPackage returns structs, enums, and services", () => {
  const store = buildContractDocs({ contractDir });
  const user = store.getPackage("user");

  expect(user).toBeDefined();
  expect(user?.package).toBe("user");
  expect(user?.structs.some(struct => struct.name === "User")).toBe(true);
  expect(user?.services.some(service => service.name === "UserService")).toBe(
    true
  );

  const userStruct = store.getStruct("user", "User");
  expect(userStruct?.qualifiedName).toBe("user.User");

  const sortDir = store.getEnum("common", "SortDirection");
  expect(sortDir?.values).toContain("ASC");
});

test("getAllStructs and getAllEnums list every type", () => {
  const store = buildContractDocs({ contractDir });

  expect(store.getAllStructs().length).toBe(store.index.totalStructs);
  expect(store.getAllEnums().length).toBe(store.index.totalEnums);
  expect(store.getAllStructs().some(struct => struct.package === "common")).toBe(
    true
  );
});

test("getService returns method metadata from contract", () => {
  const store = buildContractDocs({ contractDir });
  const service = store.getService("user", "UserService");

  expect(service?.qualifiedName).toBe("user.UserService");
  expect(service?.methods.some(method => method.name === "getUser")).toBe(true);
  expect(
    service?.methods.find(method => method.name === "getUser")?.httpMethod
  ).toBe("GET");
});

test("buildContractGraph maps packages, services, and dependencies", () => {
  const store = buildContractDocs({ contractDir });
  const graph = buildContractGraph(store);

  expect(graph.stats.packages).toBe(store.index.packages.length);
  expect(graph.stats.services).toBe(store.index.totalServices);
  expect(graph.nodes.some(node => node.group === "package" && node.label === "user")).toBe(
    true
  );
  expect(
    graph.nodes.some(
      node =>
        node.group === "service" &&
        node.label === "UserService" &&
        node.package === "user" &&
        node.methodCount !== undefined &&
        node.methodsSummary
    )
  ).toBe(true);
  expect(graph.edges.some(edge => edge.dashes && edge.from === "pkg:user")).toBe(true);
  expect(graph.edges.some(edge => !edge.dashes && edge.label)).toBe(true);

  const packagesOnly = buildContractGraph(store, { includeServices: false });
  expect(packagesOnly.nodes.every(node => node.group === "package")).toBe(true);
  expect(packagesOnly.edges.every(edge => !edge.dashes)).toBe(true);
});

test("docs router serves HTML by default and JSON with ?format=json", async () => {
  const app = express();
  app.use("/docs", createSrpcDocsRouter({ contractDir }));

  await withServer(app, async baseUrl => {
    const indexRes = await fetch(`${baseUrl}/docs`);
    expect(indexRes.status).toBe(200);
    expect(indexRes.headers.get("content-type")).toContain("text/html");
    const indexHtml = await indexRes.text();
    expect(indexHtml).toContain("<title>Getting Started · SRPC API Docs</title>");
    expect(indexHtml).toContain("Quick start");
    expect(indexHtml).toContain("Browse all APIs");
    expect(indexHtml).toContain("Start here");
    expect(indexHtml).toContain("UserService");

    const indexJsonRes = await fetch(`${baseUrl}/docs?format=json`);
    const index = await indexJsonRes.json();
    expect(index.packages.some((pkg: { name: string }) => pkg.name === "user")).toBe(
      true
    );

    const packageRes = await fetch(`${baseUrl}/docs/user`);
    expect(packageRes.headers.get("content-type")).toContain("text/html");
    const packageHtml = await packageRes.text();
    expect(packageHtml).toContain("user package");
    expect(packageHtml).toContain("UserService");

    const packageJsonRes = await fetch(`${baseUrl}/docs/user?format=json`);
    const pkg = await packageJsonRes.json();
    expect(pkg.package).toBe("user");

    const serviceRes = await fetch(`${baseUrl}/docs/user/UserService`);
    expect(serviceRes.headers.get("content-type")).toContain("text/html");
    const serviceHtml = await serviceRes.text();
    expect(serviceHtml).toContain("user.UserService");
    expect(serviceHtml).toContain("getUser");
    expect(serviceHtml).toContain('href="/docs/user/structs/User"');

    const serviceJsonRes = await fetch(
      `${baseUrl}/docs/user/UserService?format=json`
    );
    const service = await serviceJsonRes.json();
    expect(service.qualifiedName).toBe("user.UserService");

    const typesRes = await fetch(`${baseUrl}/docs/types`);
    expect(typesRes.status).toBe(200);
    const typesHtml = await typesRes.text();
    expect(typesHtml).toContain("Data shapes");
    expect(typesHtml).toContain("common.SortDirection");

    const structRes = await fetch(`${baseUrl}/docs/user/structs/User`);
    expect(structRes.status).toBe(200);
    const structHtml = await structRes.text();
    expect(structHtml).toContain("user.User");

    const enumRes = await fetch(`${baseUrl}/docs/common/enums/SortDirection`);
    expect(enumRes.status).toBe(200);
    const enumHtml = await enumRes.text();
    expect(enumHtml).toContain("ASC");
    expect(enumHtml).toContain("DESC");

    const packageStructsRes = await fetch(`${baseUrl}/docs/user/structs`);
    expect(packageStructsRes.status).toBe(200);
    expect(await packageStructsRes.text()).toContain("user objects");

    const visualizerRes = await fetch(`${baseUrl}/docs/visualizer`);
    expect(visualizerRes.status).toBe(200);
    const visualizerHtml = await visualizerRes.text();
    expect(visualizerHtml).toContain("Contract visualizer");
    expect(visualizerHtml).toContain("contract-graph");
    expect(visualizerHtml).toContain("vis-network");
    expect(visualizerHtml).toMatch(/lines\.join\("\\n"\)/);

    const visualizerJsonRes = await fetch(`${baseUrl}/docs/visualizer?format=json`);
    const graph = await visualizerJsonRes.json();
    expect(graph.nodes.length).toBeGreaterThan(0);
    expect(graph.stats.packages).toBeGreaterThan(0);

    const missingRes = await fetch(`${baseUrl}/docs/unknown`);
    expect(missingRes.status).toBe(404);
    expect(await missingRes.text()).toContain("Page not found");
  });
});

test("createSrpcRouter mounts docs when enabled", async () => {
  const app = express();
  app.use(
    createSrpcRouter({
      services: [
        defineService(UserService, {
          getUser: ({ id }: { id: string }, _ctx: SrpcHandlerContext) => ({ id }),
        }),
      ],
      docs: { contractDir },
    })
  );

  await withServer(app, async baseUrl => {
    const res = await fetch(`${baseUrl}/docs/user/UserService?format=json`);
    expect(res.status).toBe(200);
    const service = await res.json();
    const getUser = service.methods.find(
      (method: { name: string; implemented?: boolean }) => method.name === "getUser"
    );
    expect(getUser?.implemented).toBe(true);
    expect(
      service.methods.find(
        (method: { name: string; implemented?: boolean }) => method.name === "createUser"
      )?.implemented
    ).toBe(false);

    const contractsRes = await fetch(`${baseUrl}/api/contracts`);
    expect(contractsRes.status).toBe(200);
    const contracts = await contractsRes.json();
    expect(contracts.contracts.some((entry: { package: string }) => entry.package === "user")).toBe(
      true
    );
  });
});

test("playground router serves HTML by default and JSON bootstrap with ?format=json", async () => {
  const app = express();
  app.use("/playground", createSrpcPlaygroundRouter({ contractDir, rpcPath: "/srpc" }));

  await withServer(app, async baseUrl => {
    const htmlRes = await fetch(`${baseUrl}/playground`);
    expect(htmlRes.status).toBe(200);
    expect(htmlRes.headers.get("content-type")).toContain("text/html");
    const html = await htmlRes.text();
    expect(html).toContain("SRPC Playground");
    expect(html).toContain('id="pg-app"');
    expect(html).toContain("tailwindcss.com");
    expect(html).toContain("request-editor");
    expect(html).toContain("monaco-editor");
    expect(html).toContain("> Send</button>");

    const jsonRes = await fetch(`${baseUrl}/playground?format=json`);
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("content-type")).toContain("application/json");
    const body = await jsonRes.json();
    expect(body.rpcPath).toBe("/srpc");
    expect(body.packages.some((pkg: { name: string }) => pkg.name === "demo")).toBe(
      true
    );

    const demoPkg = body.packages.find((pkg: { name: string }) => pkg.name === "demo");
    expect(demoPkg).toBeDefined();
    const demoService = demoPkg.services.find(
      (service: { name: string }) => service.name === "DemoService"
    );
    expect(demoService).toBeDefined();
    const pingMethod = demoService.methods.find(
      (method: { method: string }) => method.method === "ping"
    );
    expect(pingMethod.httpMethod).toBe("GET");
    expect(pingMethod.requestTemplate.service).toBe("demo.DemoService");
    expect(pingMethod.requestTemplate.params.message).toBe("");
    expect(pingMethod.requestSchema.properties.params).toEqual({
      type: "object",
      properties: { message: { type: "string" } },
      required: ["message"],
    });
  });
});

test("createSrpcRouter mounts playground when enabled", async () => {
  const app = express();
  app.use(
    createSrpcRouter({
      services: [
        defineService(UserService, {
          getUser: ({ id }: { id: string }, _ctx: SrpcHandlerContext) => ({ id }),
        }),
      ],
      docs: { contractDir },
      playground: { contractDir },
    })
  );

  await withServer(app, async baseUrl => {
    const res = await fetch(`${baseUrl}/playground?format=json`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rpcPath).toBe("/srpc");
    expect(body.packages.some((pkg: { name: string }) => pkg.name === "user")).toBe(
      true
    );
  });
});
