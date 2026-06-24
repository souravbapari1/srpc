import express, { type Request, type Response, type Router } from "express";
import {
  buildContractDocs,
  type ContractDocsStore,
  type MethodDoc,
  type ServiceListing,
} from "../src/contract-docs.ts";
import { escapeHtml } from "./docs/escape.ts";
import { icon } from "./docs/ui.ts";
import {
  buildMethodRequestSchema,
  buildPlaygroundTypeDefinitions,
  type JsonSchema,
} from "./playground-schema.ts";
import { buildMethodParamsSample } from "./sample-values.ts";

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
              params: buildMethodParamsSample(store, packageName, method),
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
    color: #e2e8f0;
    opacity: 1;
    font-family: ${MONACO_FONT};
    font-size: 13px;
    line-height: 1.4;
  }
  .monaco-editor .suggest-widget .monaco-list-row.focused .label-name,
  .monaco-editor .suggest-widget .monaco-list-row.focused .monaco-highlighted-label {
    color: #f8fafc;
  }
`;

const PLAYGROUND_STYLES = `
  ${MONACO_EDITOR_STYLES}
  ${MONACO_SUGGEST_STYLES}
  :root {
    --pg-bg: #0d1117;
    --pg-sidebar: #161b22;
    --pg-panel: #1c2128;
    --pg-primary: #3b82f6;
    --pg-cyan: #06b6d4;
    --pg-accent: #8b5cf6;
    --pg-success: #22c55e;
    --pg-warning: #f59e0b;
    --pg-danger: #ef4444;
    --pg-text: #f8fafc;
    --pg-text-muted: #94a3b8;
    --pg-border: #30363d;
    --pg-editor: #0d1117;
  }
  body, body * { border-radius: 0 !important; }
  body { background: var(--pg-bg); color: var(--pg-text); }
  input, button, select, table, th, td { border: none; }
  select {
    background-color: rgba(255, 255, 255, 0.04);
    color: var(--pg-text);
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.625rem center;
    background-repeat: no-repeat;
    background-size: 1.125rem;
    padding-right: 2rem;
  }
  select:focus { outline: 2px solid rgba(59, 130, 246, 0.35); }
  .pg-logo {
    background: linear-gradient(135deg, #3b82f6 0%, #06b6d4 50%, #8b5cf6 100%);
    box-shadow: 0 0 24px rgba(59, 130, 246, 0.25);
  }
  .pg-surface { background: var(--pg-panel); }
  .pg-sidebar { background: var(--pg-sidebar); }
  .pg-muted { color: var(--pg-text-muted); }
  .pg-text { color: var(--pg-text); }
  .pg-input {
    background: rgba(255, 255, 255, 0.04);
    color: var(--pg-text);
  }
  .pg-input:focus { outline: 2px solid rgba(59, 130, 246, 0.3); }
  .pg-input::placeholder { color: #64748b; }
  .pg-btn-primary {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    color: #fff;
  }
  .pg-btn-primary:hover { filter: brightness(1.08); }
  .pg-btn-ghost {
    background: rgba(255, 255, 255, 0.04);
    color: var(--pg-text);
  }
  .pg-btn-ghost:hover { background: rgba(255, 255, 255, 0.08); }
  .pg-chip {
    background: rgba(59, 130, 246, 0.12);
    color: #93c5fd;
  }
  .pg-method-btn { color: var(--pg-text); }
  .pg-method-btn:hover { background: rgba(255, 255, 255, 0.04); }
  .pg-method-btn[aria-current="true"] {
    background: rgba(59, 130, 246, 0.14);
    color: #dbeafe;
  }
  .pg-tab { color: var(--pg-text-muted); }
  .pg-tab:hover { color: var(--pg-text); background: rgba(255, 255, 255, 0.04); }
  .pg-tab[aria-selected="true"] {
    color: #bfdbfe;
    background: rgba(59, 130, 246, 0.14);
  }
  .pg-tab-count {
    background: rgba(255, 255, 255, 0.06);
    color: var(--pg-text-muted);
  }
  .pg-editor-bg { background: var(--pg-editor); }
  .pg-link { color: #60a5fa; }
  .pg-link:hover { color: #93c5fd; }
  .pg-http-get { background: rgba(34, 197, 94, 0.16); color: #22c55e; }
  .pg-http-post { background: rgba(59, 130, 246, 0.16); color: #3b82f6; }
  .pg-http-put { background: rgba(245, 158, 11, 0.16); color: #f59e0b; }
  .pg-http-patch { background: rgba(168, 85, 247, 0.16); color: #a855f7; }
  .pg-http-delete { background: rgba(239, 68, 68, 0.16); color: #ef4444; }
  .pg-http-default { background: rgba(59, 130, 246, 0.16); color: #60a5fa; }
  .pg-status-ok { background: rgba(34, 197, 94, 0.14); color: #4ade80; }
  .pg-status-error { background: rgba(239, 68, 68, 0.14); color: #f87171; }
  .pg-status-pending { background: rgba(245, 158, 11, 0.14); color: #fbbf24; }
  .pg-status-muted { background: rgba(255, 255, 255, 0.04); color: var(--pg-text-muted); }
  .pg-response-panel[data-state="ok"] .pg-response-accent { background: var(--pg-success); }
  .pg-response-panel[data-state="error"] .pg-response-accent { background: var(--pg-danger); }
  .pg-response-panel[data-state="pending"] .pg-response-accent { background: var(--pg-warning); }
  .pg-response-panel .pg-response-accent { background: rgba(255, 255, 255, 0.08); }
  .pg-nav-btn { color: var(--pg-text-muted); }
  .pg-nav-btn:hover { color: #93c5fd; background: rgba(255, 255, 255, 0.04); }
  .pg-code { background: rgba(255, 255, 255, 0.06); color: #cbd5e1; }
`;

function renderPlaygroundPage(bootstrap: PlaygroundBootstrap): string {
  const monacoVersion = "0.52.2";
  const methodCount = bootstrap.packages.reduce(
    (total, pkg) => total + pkg.services.reduce((n, svc) => n + svc.methods.length, 0),
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
            pg: {
              bg: "#0D1117",
              sidebar: "#161B22",
              panel: "#1C2128",
              primary: "#3B82F6",
              cyan: "#06B6D4",
              accent: "#8B5CF6",
              border: "#30363D",
              muted: "#94A3B8",
              text: "#F8FAFC",
            },
          },
        },
      },
    };
  </script>
  <style>${PLAYGROUND_STYLES}</style>
</head>
<body class="h-full overflow-hidden font-sans antialiased">
  <div id="pg-app" class="flex h-full flex-col">
    <header class="flex shrink-0 items-center gap-3 px-4 py-3" style="background: var(--pg-sidebar)">
      <a href="/docs" class="flex items-center gap-2.5">
        <span class="pg-logo flex h-9 w-9 items-center justify-center text-white">${icon("flask")}</span>
        <span>
          <span class="block text-sm font-semibold leading-tight pg-text">SRPC Playground</span>
          <span class="block text-xs pg-muted">API client for your contracts</span>
        </span>
      </a>
      <div class="ml-4 hidden items-center gap-2 lg:flex">
        <span class="pg-chip px-2 py-1 font-mono text-xs">${escapeHtml(bootstrap.rpcPath)}</span>
        <span class="text-xs pg-muted">${bootstrap.packages.length} packages · ${methodCount} methods</span>
      </div>
      <nav class="ml-auto flex items-center gap-1">
        <a href="/docs" class="pg-nav-btn px-2.5 py-1.5 text-sm transition">${icon("book-open")} Docs</a>
        <a href="?format=json" class="pg-nav-btn px-2.5 py-1.5 text-sm transition">${icon("download")} Export</a>
      </nav>
    </header>

    <div class="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside class="pg-sidebar flex w-full shrink-0 flex-col lg:w-72">
        <div class="px-4 py-3">
          <p class="text-[11px] font-semibold uppercase tracking-wider pg-muted">Explorer</p>
          <div class="mt-3 space-y-2">
            <div>
              <label for="pkg" class="mb-1 block text-[11px] font-medium pg-muted">Package</label>
              <select id="pkg" class="w-full appearance-none px-3 py-2 text-sm outline-none transition"></select>
            </div>
            <div>
              <label for="svc" class="mb-1 block text-[11px] font-medium pg-muted">Service</label>
              <select id="svc" class="w-full appearance-none px-3 py-2 text-sm outline-none transition"></select>
            </div>
          </div>
        </div>

        <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          <p class="px-1 text-[11px] font-medium pg-muted">Methods</p>
          <div id="method-list" class="mt-2 space-y-1"></div>
        </div>

        <div class="mt-auto p-4 pt-3" style="background: rgba(0,0,0,0.12)">
          <dl class="space-y-2 text-xs">
            <div>
              <dt class="font-medium pg-muted">Returns</dt>
              <dd class="mt-0.5"><code id="return-type" class="break-all font-mono text-slate-300">—</code></dd>
            </div>
            <div>
              <dt class="font-medium pg-muted">Params</dt>
              <dd class="mt-0.5"><code id="params-type" class="break-all font-mono text-slate-300">—</code></dd>
            </div>
          </dl>
          <a id="docs-link" href="/docs" class="pg-link mt-3 inline-flex items-center gap-1.5 text-xs font-medium">${icon("arrow-up-right-from-square")} Open in docs</a>
        </div>
      </aside>

      <main class="flex min-h-0 min-w-0 flex-1 flex-col">
        <div class="pg-surface px-4 py-3">
          <div class="flex flex-wrap items-center gap-3">
            <span id="http-method">—</span>
            <div class="min-w-0 flex-1">
              <p id="method-title" class="truncate text-base font-semibold pg-text">Select a method</p>
              <p class="truncate font-mono text-xs pg-muted">
                <span id="qualified-service">—</span><span class="text-slate-600"> · </span><span id="method-name-label">—</span>
              </p>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" id="send" class="pg-btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold transition">${icon("paper-plane")} Send</button>
            <button type="button" id="reset" class="pg-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition">${icon("rotate-left")} Reset</button>
            <button type="button" id="copy-request" class="pg-btn-ghost inline-flex items-center gap-2 px-3 py-2 text-sm font-medium transition">${icon("copy")} Copy JSON</button>
            <div class="ml-auto flex items-center gap-2 text-sm">
              <span id="request-status" class="pg-status-muted px-2 py-1 text-xs">Ready</span>
              <span id="request-time" class="font-mono text-xs pg-muted"></span>
              <kbd class="pg-code px-1.5 py-0.5 font-mono text-[10px]">⌘↵</kbd>
            </div>
          </div>
        </div>

        <div class="grid min-h-0 flex-1 grid-rows-2 xl:grid-cols-2 xl:grid-rows-none">
          <section class="pg-surface pg-split-left flex min-h-0 flex-col">
            <div class="flex shrink-0 items-center justify-between px-4 py-2">
              <div class="flex items-center gap-1">
                <button type="button" id="tab-body" class="pg-tab px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition" aria-selected="true">${icon("code")} Body</button>
                <button type="button" id="tab-headers" class="pg-tab px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition" aria-selected="false">${icon("list")} Headers <span id="header-count" class="pg-tab-count ml-1 px-1.5 py-0.5 font-mono text-[10px]">0</span></button>
              </div>
              <span id="request-panel-hint" class="text-xs pg-muted">JSON envelope</span>
            </div>
            <div id="panel-body" class="pg-editor-bg relative min-h-0 flex-1">
              <div id="request-editor" class="pg-monaco absolute inset-0"></div>
            </div>
            <div id="panel-headers" class="pg-editor-bg hidden min-h-0 flex-1 overflow-y-auto p-4">
              <p class="mb-3 text-xs pg-muted">Headers are sent with every request. Use <code class="pg-code px-1 py-0.5 font-mono text-[11px]">Authorization</code> for auth tokens.</p>
              <div id="headers-list" class="space-y-2"></div>
              <button type="button" id="add-header" class="pg-btn-ghost mt-3 inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition">${icon("plus")} Add header</button>
            </div>
          </section>

          <section class="pg-response-panel pg-surface flex min-h-0 flex-col" data-state="idle">
            <div class="flex shrink-0 items-center">
              <span class="pg-response-accent w-1 self-stretch"></span>
              <div class="flex flex-1 items-center justify-between px-4 py-2">
                <span class="text-xs font-semibold uppercase tracking-wide pg-muted">${icon("terminal")} Response</span>
                <span id="response-status" class="pg-status-muted px-2 py-0.5 font-mono text-xs">—</span>
              </div>
            </div>
            <div class="pg-editor-bg relative min-h-0 flex-1">
              <div id="response-editor" class="pg-monaco absolute inset-0"></div>
            </div>
          </section>
        </div>
      </main>
    </div>
  </div>

  <select id="method" class="sr-only" aria-hidden="true" tabindex="-1"></select>

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
      const methodList = document.getElementById("method-list");
      const requestStatus = document.getElementById("request-status");
      const requestTime = document.getElementById("request-time");
      const responseStatus = document.getElementById("response-status");
      const responsePanel = document.querySelector(".pg-response-panel");
      const qualifiedService = document.getElementById("qualified-service");
      const methodTitle = document.getElementById("method-title");
      const methodNameLabel = document.getElementById("method-name-label");
      const httpMethod = document.getElementById("http-method");
      const paramsType = document.getElementById("params-type");
      const returnType = document.getElementById("return-type");
      const docsLink = document.getElementById("docs-link");
      const sendButton = document.getElementById("send");
      const resetButton = document.getElementById("reset");
      const copyButton = document.getElementById("copy-request");
      const tabBody = document.getElementById("tab-body");
      const tabHeaders = document.getElementById("tab-headers");
      const panelBody = document.getElementById("panel-body");
      const panelHeaders = document.getElementById("panel-headers");
      const headersList = document.getElementById("headers-list");
      const addHeaderButton = document.getElementById("add-header");
      const headerCount = document.getElementById("header-count");
      const requestPanelHint = document.getElementById("request-panel-hint");
      const HEADERS_STORAGE_KEY = "srpc-playground-headers";

      let requestEditor = null;
      let responseEditor = null;
      let monacoApi = null;
      let headerRows = [];

      const STATUS = {
        ok: "pg-status-ok px-2 py-1 text-xs font-medium",
        error: "pg-status-error px-2 py-1 text-xs font-medium",
        muted: "pg-status-muted px-2 py-1 text-xs",
        pending: "pg-status-pending px-2 py-1 text-xs font-medium",
        kbd: "pg-status-muted px-2 py-0.5 font-mono text-xs",
      };

      function setResponseState(state) {
        if (responsePanel) {
          responsePanel.dataset.state = state;
        }
      }

      function setRequestTab(tab) {
        const isBody = tab === "body";
        tabBody.setAttribute("aria-selected", isBody ? "true" : "false");
        tabHeaders.setAttribute("aria-selected", isBody ? "false" : "true");
        panelBody.classList.toggle("hidden", !isBody);
        panelBody.classList.toggle("flex-1", isBody);
        panelBody.classList.toggle("relative", isBody);
        panelHeaders.classList.toggle("hidden", isBody);
        panelHeaders.classList.toggle("flex-1", !isBody);
        requestPanelHint.textContent = isBody ? "JSON envelope" : "Key-value request headers";
        if (isBody && requestEditor) {
          requestEditor.layout();
        }
      }

      function defaultHeaders() {
        return [
          { key: "Authorization", value: "Bearer " },
          { key: "Accept", value: "application/json" },
        ];
      }

      function loadHeaders() {
        try {
          const raw = localStorage.getItem(HEADERS_STORAGE_KEY);
          if (!raw) return defaultHeaders();
          const parsed = JSON.parse(raw);
          if (!Array.isArray(parsed) || parsed.length === 0) return defaultHeaders();
          return parsed.map(row => ({
            key: String(row.key ?? ""),
            value: String(row.value ?? ""),
          }));
        } catch {
          return defaultHeaders();
        }
      }

      function saveHeaders() {
        const rows = collectHeaderRows();
        headerRows = rows;
        localStorage.setItem(HEADERS_STORAGE_KEY, JSON.stringify(rows));
        updateHeaderCount();
      }

      function collectHeaderRows() {
        if (!headersList) return [];
        return [...headersList.querySelectorAll(".pg-header-row")].map(row => ({
          key: row.querySelector(".header-key")?.value.trim() ?? "",
          value: row.querySelector(".header-value")?.value ?? "",
        }));
      }

      function collectRequestHeaders() {
        const headers = {};
        for (const row of collectHeaderRows()) {
          if (!row.key) continue;
          headers[row.key] = row.value;
        }
        return headers;
      }

      function updateHeaderCount() {
        const count = collectHeaderRows().filter(row => row.key).length;
        if (headerCount) {
          headerCount.textContent = String(count);
        }
      }

      function createHeaderRow(key, value) {
        const row = document.createElement("div");
        row.className = "pg-header-row grid grid-cols-[1fr_1.4fr_auto] gap-2";
        row.innerHTML =
          '<input type="text" class="header-key pg-input px-3 py-2 font-mono text-xs outline-none transition" placeholder="Header name" value="' +
          escapeAttr(key) +
          '" />' +
          '<input type="text" class="header-value pg-input px-3 py-2 font-mono text-xs outline-none transition" placeholder="Value" value="' +
          escapeAttr(value) +
          '" />' +
          '<button type="button" class="remove-header inline-flex h-9 w-9 items-center justify-center transition hover:bg-red-500/10 hover:text-red-400" style="color: #94a3b8" title="Remove header">${icon("xmark")}</button>';

        row.querySelector(".header-key")?.addEventListener("input", saveHeaders);
        row.querySelector(".header-value")?.addEventListener("input", saveHeaders);
        row.querySelector(".remove-header")?.addEventListener("click", function () {
          row.remove();
          if (headersList && headersList.children.length === 0) {
            addHeaderRow("", "");
          }
          saveHeaders();
        });
        return row;
      }

      function escapeAttr(value) {
        return String(value)
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;");
      }

      function addHeaderRow(key, value) {
        if (!headersList) return;
        headersList.appendChild(createHeaderRow(key ?? "", value ?? ""));
        saveHeaders();
      }

      function renderHeaders() {
        if (!headersList) return;
        headersList.innerHTML = "";
        headerRows = loadHeaders();
        if (headerRows.length === 0) {
          headerRows = defaultHeaders();
        }
        for (const row of headerRows) {
          headersList.appendChild(createHeaderRow(row.key, row.value));
        }
        updateHeaderCount();
      }

      function httpMethodClass(verb) {
        const method = (verb || "POST").toUpperCase();
        const classes = {
          GET: "pg-http-get",
          POST: "pg-http-post",
          PUT: "pg-http-put",
          PATCH: "pg-http-patch",
          DELETE: "pg-http-delete",
        };
        return classes[method] || "pg-http-default";
      }

      function httpMethodColor(verb) {
        const method = (verb || "POST").toUpperCase();
        const colors = {
          GET: "#22C55E",
          POST: "#3B82F6",
          PUT: "#F59E0B",
          PATCH: "#A855F7",
          DELETE: "#EF4444",
        };
        return colors[method] || "#3B82F6";
      }

      function httpMethodBadge(verb) {
        const method = (verb || "POST").toUpperCase();
        return '<span class="inline-flex items-center px-2.5 py-1 text-xs font-bold ' + httpMethodClass(verb) + '">' + method + "</span>";
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
        renderMethodList();
      }

      function renderMethodList() {
        if (!methodList) return;
        methodList.innerHTML = "";
        const service = getServiceMeta(packageSelect.value, serviceSelect.value);
        const methods = service?.methods || [];

        if (methods.length === 0) {
          methodList.innerHTML = '<p class="px-2 py-3 text-xs pg-muted">No methods in this service.</p>';
          return;
        }

        methods.forEach(method => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "pg-method-btn flex w-full items-center gap-2 px-2 py-2 text-left text-sm transition";
          btn.dataset.method = method.method;
          const verb = (method.httpMethod || "POST").toUpperCase();
          btn.innerHTML =
            '<span class="shrink-0 text-[10px] font-bold uppercase" style="color:' + httpMethodColor(method.httpMethod) + '">' +
            verb +
            '</span><span class="truncate font-medium text-slate-200">' +
            method.method +
            "</span>";
          btn.setAttribute("aria-current", method.method === methodSelect.value ? "true" : "false");
          btn.addEventListener("click", function () {
            methodSelect.value = method.method;
            setEditorFromMethod();
            updateQuery();
          });
          methodList.appendChild(btn);
        });
      }

      function highlightSelectedMethod() {
        if (!methodList) return;
        methodList.querySelectorAll(".pg-method-btn").forEach(btn => {
          btn.setAttribute("aria-current", btn.dataset.method === methodSelect.value ? "true" : "false");
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
        methodTitle.textContent = method.method;
        methodNameLabel.textContent = method.method;
        httpMethod.innerHTML = httpMethodBadge(method.httpMethod);
        paramsType.textContent = method.params.length === 0
          ? "none"
          : method.params.length === 1
            ? method.params[0].type
            : method.params.map(param => param.name + ": " + param.type).join(", ");
        returnType.textContent = method.returnType;
        docsLink.href = "/docs/" + encodeURIComponent(method.package) + "/" + encodeURIComponent(method.service) + "#" + encodeURIComponent(method.method);
        highlightSelectedMethod();
        requestStatus.textContent = "Ready";
        requestStatus.className = STATUS.muted;
        requestTime.textContent = "";
        responseStatus.textContent = "—";
        responseStatus.className = STATUS.kbd;
        setResponseState("idle");
        setResponseValue("// Send a request to see the response here.\\n// Press Send or use ⌘↵");
      }

      async function copyRequestJson() {
        if (!requestEditor) return;
        const text = requestEditor.getValue();
        try {
          await navigator.clipboard.writeText(text);
          const original = copyButton.innerHTML;
          copyButton.innerHTML = '${icon("check")} Copied';
          window.setTimeout(function () {
            copyButton.innerHTML = original;
          }, 1500);
        } catch {
          copyButton.innerHTML = '${icon("triangle-exclamation")} Copy failed';
        }
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
          setResponseState("error");
          setResponseValue(String(error));
          return;
        }

        const started = performance.now();
        requestStatus.textContent = "Sending…";
        requestStatus.className = STATUS.pending;
        requestTime.textContent = "";
        responseStatus.textContent = "…";
        responseStatus.className = STATUS.pending;
        setResponseState("pending");
        setResponseValue("// Waiting for response...");

        try {
          const verb = (method.httpMethod || "POST").toUpperCase();
          const customHeaders = collectRequestHeaders();
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
            response = await fetch(url.toString(), {
              method: "GET",
              headers: customHeaders,
            });
          } else {
            response = await fetch(bootstrap.rpcPath, {
              method: verb,
              headers: {
                "Content-Type": "application/json",
                ...customHeaders,
              },
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
          requestStatus.textContent = response.ok ? "Success" : "Failed";
          requestStatus.className = response.ok ? STATUS.ok : STATUS.error;
          requestTime.textContent = response.status + " · " + elapsed + "ms";
          responseStatus.textContent = String(response.status);
          responseStatus.className = response.ok ? STATUS.ok : STATUS.error;
          setResponseState(response.ok ? "ok" : "error");
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
          setResponseState("error");
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
          theme: "vs-dark",
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
          model: monaco.editor.createModel("// Send a request to see the response here.\\n// Press Send or use ⌘↵", "json", monaco.Uri.parse(RESPONSE_MODEL_URI)),
          theme: "vs-dark",
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
        renderHeaders();
        syncFromQuery();
        setEditorFromMethod();
        updateQuery();

        tabBody.addEventListener("click", function () { setRequestTab("body"); });
        tabHeaders.addEventListener("click", function () { setRequestTab("headers"); });
        addHeaderButton.addEventListener("click", function () { addHeaderRow("", ""); });

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
        copyButton.addEventListener("click", copyRequestJson);
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
