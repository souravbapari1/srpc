import express, { type Request, type Response, type Router } from "express";
import {
  buildContractDocs,
  type ContractDocsStore,
  type MethodDoc,
  type ServiceListing,
  type StructDoc,
} from "../src/contract-docs.ts";
import { escapeHtml } from "./docs/escape.ts";
import { icon } from "./docs/ui.ts";
import {
  buildMethodRequestSchema,
  buildPlaygroundTypeDefinitions,
  type JsonSchema,
} from "./playground-schema.ts";

export const SRPC_PLAYGROUND_PATH = "/playground";

export interface CreateSrpcPlaygroundOptions {
  contractDir: string;
  rpcPath?: string;
}

interface PlaygroundMethodMeta {
  package: string;
  service: string;
  qualifiedService: string;
  method: string;
  httpMethod: string;
  params: MethodDoc["params"];
  returnType: string;
  requestTemplate: {
    srpc: string;
    service: string;
    method: string;
    params: unknown;
  };
  requestSchema: JsonSchema;
}

interface PlaygroundPackageMeta {
  name: string;
  services: {
    name: string;
    qualifiedName: string;
    methods: PlaygroundMethodMeta[];
  }[];
}

interface PlaygroundBootstrap {
  contractDir: string;
  rpcPath: string;
  typeDefinitions: Record<string, JsonSchema>;
  packages: PlaygroundPackageMeta[];
}

export function createSrpcPlaygroundRouter(
  options: CreateSrpcPlaygroundOptions
): Router {
  const router = express.Router();
  const store = buildContractDocs({ contractDir: options.contractDir });
  const bootstrap = buildPlaygroundBootstrap(store, options.rpcPath ?? "srpc");

  router.get("/", (req, res) => {
    if (wantsJson(req)) {
      sendJson(res, bootstrap);
      return;
    }

    sendHtml(res, renderPlaygroundPage(bootstrap));
  });

  return router;
}

function buildPlaygroundBootstrap(
  store: ContractDocsStore,
  rpcPath: string
): PlaygroundBootstrap {
  const servicesByPackage = new Map<string, ServiceListing[]>();

  for (const service of store.getAllServices()) {
    const list = servicesByPackage.get(service.package) ?? [];
    list.push(service);
    servicesByPackage.set(service.package, list);
  }

  const typeDefinitions = buildPlaygroundTypeDefinitions(store);

  const packages = [...servicesByPackage.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([packageName, services]) => ({
      name: packageName,
      services: services
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(service => ({
          name: service.name,
          qualifiedName: service.qualifiedName,
          methods: service.methods.map(method => ({
            package: packageName,
            service: service.name,
            qualifiedService: service.qualifiedName,
            method: method.name,
            httpMethod: method.httpMethod,
            params: method.params,
            returnType: method.returnType,
            requestTemplate: {
              srpc: "1.0",
              service: service.qualifiedName,
              method: method.name,
              params: buildMethodParamsTemplate(store, packageName, method),
            },
            requestSchema: buildMethodRequestSchema(
              store,
              packageName,
              service.qualifiedName,
              method.name,
              method.params,
              typeDefinitions
            ),
          })),
        })),
    }));

  return {
    contractDir: store.index.contractDir,
    rpcPath,
    typeDefinitions,
    packages,
  };
}

function buildMethodParamsTemplate(
  store: ContractDocsStore,
  packageName: string,
  method: MethodDoc
): unknown {
  if (method.params.length === 0) {
    return {};
  }

  if (method.params.length === 1) {
    return buildValueTemplate(store, packageName, method.params[0]!.type, 0);
  }

  return Object.fromEntries(
    method.params.map(param => [
      param.name,
      buildValueTemplate(store, packageName, param.type, 0),
    ])
  );
}

function buildValueTemplate(
  store: ContractDocsStore,
  packageName: string,
  rawType: string,
  depth: number
): unknown {
  const type = normalizeType(rawType);

  if (!type) {
    return "";
  }

  if (depth > 1) {
    return {};
  }

  if (type.includes("|")) {
    return buildValueTemplate(store, packageName, type.split("|")[0]!.trim(), depth);
  }

  if (type.endsWith("[]") || /^list<.+>$/.test(type)) {
    return [];
  }

  if (/^map<.+>$/.test(type)) {
    return {};
  }

  if (/^\[.*\]$/.test(type)) {
    return [];
  }

  if (type.startsWith("{") && type.endsWith("}")) {
    return {};
  }

  switch (type) {
    case "string":
    case "bytes":
    case "date":
    case "datetime":
    case "any":
      return "";
    case "number":
    case "int":
    case "float":
      return 0;
    case "boolean":
      return true;
    case "null":
      return null;
  }

  const enumDoc = resolveEnum(store, packageName, type);
  if (enumDoc) {
    return enumDoc.values[0] ?? "";
  }

  const struct = resolveStruct(store, packageName, type);
  if (struct) {
    return Object.fromEntries(
      struct.fields.map(field => [
        field.name,
        buildValueTemplate(store, packageName, field.type, depth + 1),
      ])
    );
  }

  return "";
}

function normalizeType(type: string): string {
  return type.trim().replace(/\?$/, "");
}

function resolveStruct(
  store: ContractDocsStore,
  packageName: string,
  type: string
): StructDoc | undefined {
  if (type.includes(".")) {
    const [pkg, name] = splitQualified(type);
    if (!pkg || !name) {
      return undefined;
    }
    return store.getStruct(pkg, name);
  }

  const local = store.getStruct(packageName, type);
  if (local) {
    return local;
  }

  const matches = store.getAllStructs().filter(struct => struct.name === type);
  return matches.length === 1 ? matches[0] : undefined;
}

function resolveEnum(
  store: ContractDocsStore,
  packageName: string,
  type: string
) {
  if (type.includes(".")) {
    const [pkg, name] = splitQualified(type);
    if (!pkg || !name) {
      return undefined;
    }
    return store.getEnum(pkg, name);
  }

  const local = store.getEnum(packageName, type);
  if (local) {
    return local;
  }

  const matches = store.getAllEnums().filter(enumDoc => enumDoc.name === type);
  return matches.length === 1 ? matches[0] : undefined;
}

function splitQualified(type: string): [string | undefined, string | undefined] {
  const parts = type.split(".");
  if (parts.length < 2) {
    return [undefined, undefined];
  }
  return [parts[0], parts[parts.length - 1]];
}

const MONACO_FONT = '"JetBrains Mono", ui-monospace, Menlo, Monaco, Consolas, monospace';

const MONACO_EDITOR_STYLES = `
  .pg-monaco .monaco-editor,
  .pg-monaco .monaco-editor .margin,
  .pg-monaco .monaco-editor .view-lines,
  .pg-monaco .monaco-editor .view-line,
  .pg-monaco .monaco-editor .inputarea {
    font-family: ${MONACO_FONT} !important;
    font-size: 13px !important;
    font-weight: 400 !important;
    font-style: normal !important;
    letter-spacing: normal !important;
    text-transform: none !important;
    font-variant-ligatures: none !important;
  }
`;

const MONACO_SUGGEST_STYLES = `
  .monaco-editor .suggest-widget .monaco-list .monaco-list-row .main {
    padding: 0;
    width: auto;
    margin: 0;
    max-width: none;
  }
  .monaco-editor .suggest-widget .tree {
    white-space: unset;
    padding-bottom: 0;
  }
  .monaco-editor .suggest-widget .monaco-list-row .contents > .main {
    display: flex;
    flex-direction: row;
    align-items: center;
    overflow: hidden;
  }
  .monaco-editor .suggest-widget .monaco-list-row .left {
    display: flex;
    flex-direction: row;
    align-items: center;
  }
  .monaco-editor .suggest-widget .monaco-list-row .label-name,
  .monaco-editor .suggest-widget .monaco-list-row .monaco-highlighted-label {
    color: #3b3b3b;
    opacity: 1;
    font-family: ${MONACO_FONT};
    font-size: 13px;
    line-height: 1.4;
  }
  .monaco-editor .suggest-widget .monaco-list-row.focused .label-name,
  .monaco-editor .suggest-widget .monaco-list-row.focused .monaco-highlighted-label {
    color: #ffffff;
  }
`;

const PLAYGROUND_STYLES = `
  ${MONACO_EDITOR_STYLES}
  ${MONACO_SUGGEST_STYLES}
  select { background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.25rem; padding-right: 2rem; }
`;

function renderPlaygroundPage(bootstrap: PlaygroundBootstrap): string {
  const monacoVersion = "0.52.2";
  const serviceCount = bootstrap.packages.reduce(
    (n, pkg) => n + pkg.services.length,
    0
  );

  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SRPC Playground</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ["Inter", "system-ui", "sans-serif"],
            mono: ["JetBrains Mono", "ui-monospace", "monospace"],
          },
          colors: {
            brand: { DEFAULT: "#0d9488", dark: "#0f766e", light: "#ccfbf1" },
          },
        },
      },
    };
  </script>
  <style>${PLAYGROUND_STYLES}</style>
</head>
<body class="h-full overflow-hidden bg-zinc-100 font-sans text-zinc-900 antialiased">
  <div id="pg-app" class="flex h-full flex-col">
    <header class="z-10 flex shrink-0 items-center gap-4 border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
      <div class="flex items-center gap-2 text-sm font-semibold text-brand">
        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">${icon("flask")}</span>
        <span>SRPC Playground</span>
      </div>
      <div class="hidden min-w-0 flex-1 items-center gap-2 text-sm text-zinc-500 sm:flex">
        <span class="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-xs text-zinc-600">${icon("route")} ${escapeHtml(bootstrap.rpcPath)}</span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs">${icon("box")} ${bootstrap.packages.length} packages</span>
        <span class="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs">${icon("plug")} ${serviceCount} services</span>
      </div>
      <nav class="ml-auto flex items-center gap-1">
        <a href="/docs" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-brand">${icon("book-open")} Docs</a>
        <a href="?format=json" class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-brand">${icon("download")} JSON</a>
      </nav>
    </header>

    <div class="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside class="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-b border-zinc-200 bg-white p-4 md:w-72 md:border-b-0 md:border-r">
        <div class="space-y-3">
          <div>
            <label for="pkg" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Package</label>
            <select id="pkg" class="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"></select>
          </div>
          <div>
            <label for="svc" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Service</label>
            <select id="svc" class="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"></select>
          </div>
          <div>
            <label for="method" class="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-400">Method</label>
            <select id="method" class="w-full appearance-none rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"></select>
          </div>
        </div>

        <dl class="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm">
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Qualified service</dt>
            <dd id="qualified-service" class="mt-1 break-words font-mono text-xs text-zinc-700">—</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-zinc-400">HTTP</dt>
            <dd id="http-method" class="mt-1">—</dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Params</dt>
            <dd class="mt-1"><code id="params-type" class="font-mono text-xs text-zinc-700">—</code></dd>
          </div>
          <div>
            <dt class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Returns</dt>
            <dd class="mt-1"><code id="return-type" class="font-mono text-xs text-zinc-700">—</code></dd>
          </div>
        </dl>
      </aside>

      <section class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div class="flex shrink-0 flex-wrap items-center gap-2 border-b border-zinc-200 bg-white px-4 py-3">
          <button type="button" id="send" class="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30">${icon("paper-plane")} Send</button>
          <button type="button" id="reset" class="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:border-brand hover:text-brand focus:outline-none focus:ring-2 focus:ring-brand/20">${icon("rotate-left")} Reset</button>
          <div class="ml-auto flex items-center gap-3 text-sm text-zinc-500">
            <span id="request-status">Ready</span>
            <span id="request-time"></span>
            <kbd class="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-xs text-zinc-400">⌘↵</kbd>
          </div>
        </div>

        <div class="grid min-h-0 flex-1 grid-rows-2 xl:grid-cols-2 xl:grid-rows-none">
          <div class="flex min-h-0 flex-col border-b border-zinc-200 bg-white xl:border-b-0 xl:border-r">
            <div class="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <span class="inline-flex items-center gap-1.5">${icon("code")} Request</span>
              <span class="font-normal normal-case text-zinc-400">JSON envelope</span>
            </div>
            <div class="relative min-h-0 flex-1">
              <div id="request-editor" class="pg-monaco absolute inset-0"></div>
            </div>
          </div>
          <div class="flex min-h-0 flex-col bg-white">
            <div class="flex shrink-0 items-center justify-between border-b border-zinc-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
              <span class="inline-flex items-center gap-1.5">${icon("terminal")} Response</span>
              <span id="response-status" class="font-normal normal-case text-zinc-400">—</span>
            </div>
            <div class="relative min-h-0 flex-1">
              <div id="response-editor" class="pg-monaco absolute inset-0"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <script id="playground-bootstrap" type="application/json">${serializeForScript(bootstrap)}</script>
  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@${monacoVersion}/min/vs/loader.js"></script>
  <script>
    (function () {
      const bootstrap = JSON.parse(document.getElementById("playground-bootstrap").textContent || "{}");
      const REQUEST_MODEL_URI = "inmemory://srpc/playground-request.json";
      const RESPONSE_MODEL_URI = "inmemory://srpc/playground-response.json";
      const monacoBase = "https://cdn.jsdelivr.net/npm/monaco-editor@${monacoVersion}/min";

      const packageSelect = document.getElementById("pkg");
      const serviceSelect = document.getElementById("svc");
      const methodSelect = document.getElementById("method");
      const requestStatus = document.getElementById("request-status");
      const requestTime = document.getElementById("request-time");
      const responseStatus = document.getElementById("response-status");
      const qualifiedService = document.getElementById("qualified-service");
      const httpMethod = document.getElementById("http-method");
      const paramsType = document.getElementById("params-type");
      const returnType = document.getElementById("return-type");
      const sendButton = document.getElementById("send");
      const resetButton = document.getElementById("reset");

      let requestEditor = null;
      let responseEditor = null;
      let monacoApi = null;

      const STATUS = {
        ok: "font-medium text-emerald-600",
        error: "font-medium text-rose-600",
        muted: "text-zinc-500",
        kbd: "font-normal text-zinc-400",
      };

      function httpMethodBadge(verb) {
        const method = (verb || "POST").toUpperCase();
        const colors = {
          GET: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
          POST: "bg-blue-50 text-blue-700 ring-blue-600/20",
          PUT: "bg-amber-50 text-amber-700 ring-amber-600/20",
          PATCH: "bg-violet-50 text-violet-700 ring-violet-600/20",
          DELETE: "bg-rose-50 text-rose-700 ring-rose-600/20",
        };
        const color = colors[method] || "bg-brand/10 text-brand ring-brand/20";
        return '<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ' + color + '">' + method + "</span>";
      }

      function option(value, label) {
        const el = document.createElement("option");
        el.value = value;
        el.textContent = label;
        return el;
      }

      function getPackageMeta(name) {
        return (bootstrap.packages || []).find(pkg => pkg.name === name);
      }

      function getServiceMeta(pkgName, serviceName) {
        const pkg = getPackageMeta(pkgName);
        return pkg && pkg.services.find(service => service.name === serviceName);
      }

      function getMethodMeta(pkgName, serviceName, methodName) {
        const service = getServiceMeta(pkgName, serviceName);
        return service && service.methods.find(method => method.method === methodName);
      }

      function fillPackageOptions() {
        packageSelect.innerHTML = "";
        (bootstrap.packages || []).forEach(pkg => {
          packageSelect.appendChild(option(pkg.name, pkg.name));
        });
      }

      function fillServiceOptions() {
        serviceSelect.innerHTML = "";
        const pkg = getPackageMeta(packageSelect.value);
        (pkg?.services || []).forEach(service => {
          serviceSelect.appendChild(option(service.name, service.name));
        });
      }

      function fillMethodOptions() {
        methodSelect.innerHTML = "";
        const service = getServiceMeta(packageSelect.value, serviceSelect.value);
        (service?.methods || []).forEach(method => {
          methodSelect.appendChild(option(method.method, method.method));
        });
      }

      let requestModelUri = null;

      function applyRequestSchema(method) {
        if (!monacoApi || !method?.requestSchema || !requestEditor) return;

        const schemaUri = requestModelUri.toString();
        monacoApi.languages.json.jsonDefaults.setDiagnosticsOptions({
          validate: true,
          allowComments: false,
          enableSchemaRequest: false,
          schemas: [{
            uri: schemaUri,
            fileMatch: [schemaUri],
            schema: method.requestSchema,
          }],
        });
      }

      function setRequestValue(value) {
        if (!requestEditor) return;
        requestEditor.setValue(value);
      }

      function setResponseValue(value) {
        if (!responseEditor) return;
        responseEditor.setValue(value);
        try {
          JSON.parse(value);
          responseEditor.getAction("editor.action.formatDocument")?.run();
        } catch {
          // keep plain text for errors and status messages
        }
      }

      function setEditorFromMethod() {
        const method = getMethodMeta(packageSelect.value, serviceSelect.value, methodSelect.value);
        if (!method) return;

        applyRequestSchema(method);
        setRequestValue(JSON.stringify(method.requestTemplate, null, 2));
        qualifiedService.textContent = method.qualifiedService;
        httpMethod.innerHTML = httpMethodBadge(method.httpMethod);
        paramsType.textContent = method.params.length === 0
          ? "none"
          : method.params.length === 1
            ? method.params[0].type
            : method.params.map(param => param.name + ": " + param.type).join(", ");
        returnType.textContent = method.returnType;
        requestStatus.textContent = "Ready";
        requestStatus.className = STATUS.muted;
        requestTime.textContent = "";
        responseStatus.textContent = "—";
        responseStatus.className = STATUS.kbd;
        setResponseValue("Send a request to see the response.");
      }

      function syncFromQuery() {
        const query = new URLSearchParams(window.location.search);
        const pkgName = query.get("package");
        const serviceName = query.get("service");
        const methodName = query.get("method");

        if (pkgName && getPackageMeta(pkgName)) {
          packageSelect.value = pkgName;
        }
        fillServiceOptions();

        if (serviceName && getServiceMeta(packageSelect.value, serviceName)) {
          serviceSelect.value = serviceName;
        }
        fillMethodOptions();

        if (methodName && getMethodMeta(packageSelect.value, serviceSelect.value, methodName)) {
          methodSelect.value = methodName;
        }
      }

      function updateQuery() {
        const query = new URLSearchParams(window.location.search);
        query.set("package", packageSelect.value);
        query.set("service", serviceSelect.value);
        query.set("method", methodSelect.value);
        const next = window.location.pathname + "?" + query.toString();
        window.history.replaceState({}, "", next);
      }

      async function sendRequest() {
        const method = getMethodMeta(packageSelect.value, serviceSelect.value, methodSelect.value);
        if (!method || !requestEditor) return;

        let payload;
        try {
          payload = JSON.parse(requestEditor.getValue());
        } catch (error) {
          requestStatus.textContent = "Invalid JSON";
          requestStatus.className = STATUS.error;
          responseStatus.textContent = "Parse error";
          responseStatus.className = STATUS.error;
          setResponseValue(String(error));
          return;
        }

        const started = performance.now();
        requestStatus.textContent = "Sending...";
        requestStatus.className = STATUS.muted;
        requestTime.textContent = "";
        responseStatus.textContent = "Waiting…";
        responseStatus.className = STATUS.kbd;
        setResponseValue("Waiting for response...");

        try {
          const verb = (method.httpMethod || "POST").toUpperCase();
          let response;

          if (verb === "GET") {
            const url = new URL(bootstrap.rpcPath, window.location.href);
            url.searchParams.set("srpc", payload.srpc || "1.0");
            url.searchParams.set("service", payload.service || method.qualifiedService);
            url.searchParams.set("method", payload.method || method.method);
            url.searchParams.set("params", JSON.stringify(payload.params ?? {}));
            if (payload.id) {
              url.searchParams.set("id", String(payload.id));
            }
            response = await fetch(url.toString(), { method: "GET" });
          } else {
            response = await fetch(bootstrap.rpcPath, {
              method: verb,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          }

          const text = await response.text();
          let parsed;
          try {
            parsed = JSON.parse(text);
          } catch {
            parsed = text;
          }

          const elapsed = Math.round(performance.now() - started);
          requestStatus.textContent = response.ok ? "Success" : "Request failed";
          requestStatus.className = response.ok ? STATUS.ok : STATUS.error;
          requestTime.textContent = response.status + " in " + elapsed + "ms";
          responseStatus.textContent = String(response.status);
          responseStatus.className = response.ok ? STATUS.ok : STATUS.error;
          setResponseValue(typeof parsed === "string"
            ? parsed
            : JSON.stringify(parsed, null, 2));
        } catch (error) {
          const elapsed = Math.round(performance.now() - started);
          requestStatus.textContent = "Network error";
          requestStatus.className = STATUS.error;
          requestTime.textContent = elapsed + "ms";
          responseStatus.textContent = "Error";
          responseStatus.className = STATUS.error;
          setResponseValue(String(error));
        }
      }

      function initEditors(monaco) {
        monacoApi = monaco;

        monaco.languages.json.jsonDefaults.setModeConfiguration({
          documentFormattingEdits: true,
          documentRangeFormattingEdits: true,
          completionItems: true,
          hovers: true,
          documentSymbols: true,
          tokens: true,
          colors: true,
          foldingRanges: true,
          diagnostics: true,
        });

        requestModelUri = monaco.Uri.parse(REQUEST_MODEL_URI);

        requestEditor = monaco.editor.create(document.getElementById("request-editor"), {
          model: monaco.editor.createModel("", "json", requestModelUri),
          theme: "vs",
          language: "json",
          fontFamily: ${JSON.stringify(MONACO_FONT)},
          fontSize: 13,
          fontLigatures: false,
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: false,
          formatOnType: false,
          quickSuggestions: { strings: true, other: true, comments: false },
          suggestOnTriggerCharacters: true,
          wordBasedSuggestions: "off",
          suggest: {
            showProperties: true,
            showKeywords: true,
            preview: true,
            snippetsPreventQuickSuggestions: false,
          },
        });

        responseEditor = monaco.editor.create(document.getElementById("response-editor"), {
          model: monaco.editor.createModel("Send a request to see the response.", "json", monaco.Uri.parse(RESPONSE_MODEL_URI)),
          theme: "vs",
          language: "json",
          readOnly: true,
          fontFamily: ${JSON.stringify(MONACO_FONT)},
          fontSize: 13,
          fontLigatures: false,
          minimap: { enabled: false },
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          formatOnPaste: false,
          formatOnType: false,
        });

        requestEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, sendRequest);

        fillPackageOptions();
        fillServiceOptions();
        fillMethodOptions();
        syncFromQuery();
        setEditorFromMethod();
        updateQuery();

        packageSelect.addEventListener("change", function () {
          fillServiceOptions();
          fillMethodOptions();
          setEditorFromMethod();
          updateQuery();
        });

        serviceSelect.addEventListener("change", function () {
          fillMethodOptions();
          setEditorFromMethod();
          updateQuery();
        });

        methodSelect.addEventListener("change", function () {
          setEditorFromMethod();
          updateQuery();
        });

        resetButton.addEventListener("click", setEditorFromMethod);
        sendButton.addEventListener("click", sendRequest);
      }

      require.config({ paths: { vs: monacoBase + "/vs" } });
      require(["vs/editor/editor.main"], initEditors);
    })();
  </script>
</body>
</html>`;
}

function serializeForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function wantsJson(req: Request): boolean {
  const format = req.query.format;
  if (format === "json") {
    return true;
  }

  if (format === "html") {
    return false;
  }

  const accept = req.get("accept") ?? "";
  return (
    accept.includes("application/json") &&
    !accept.includes("text/html") &&
    !accept.includes("*/*")
  );
}

function sendHtml(res: Response, html: string): void {
  res.status(200);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
}

function sendJson(res: Response, body: unknown): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(200).json(body);
}
