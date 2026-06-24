import type { ContractDocsStore, MethodDoc } from "../../src/contract-docs.ts";
import { codeBlock } from "./code-block.ts";
import { icon } from "./ui.ts";

export interface StarterMethod {
  packageName: string;
  serviceName: string;
  qualifiedService: string;
  method: MethodDoc;
}

export function findStarterMethod(store: ContractDocsStore): StarterMethod | undefined {
  const demo = store.getService("demo", "DemoService");
  const ping = demo?.methods.find(method => method.name === "ping");
  if (demo && ping) {
    return {
      packageName: "demo",
      serviceName: demo.name,
      qualifiedService: demo.qualifiedName,
      method: ping,
    };
  }

  const first = store.getAllServices()[0];
  const method = first?.methods[0];
  if (!first || !method) {
    return undefined;
  }

  return {
    packageName: first.package,
    serviceName: first.name,
    qualifiedService: first.qualifiedName,
    method,
  };
}

export function describeMethod(methodName: string): string {
  const name = methodName;
  if (name === "ping") {
    return "The easiest API to try first — send a message and get it echoed back.";
  }
  if (name.startsWith("get")) {
    const subject = humanize(name.slice(3)) || "a record";
    return `Gets ${withArticle(subject)}.`;
  }
  if (name.startsWith("list")) {
    return `Lists ${humanize(name.slice(4)) || "items"}.`;
  }
  if (name.startsWith("create")) {
    return `Creates ${withArticle(humanize(name.slice(6)) || "item")}.`;
  }
  if (name.startsWith("update")) {
    return `Updates ${withArticle(humanize(name.slice(6)) || "item")}.`;
  }
  if (name.startsWith("delete") || name.startsWith("remove")) {
    return `Removes ${withArticle(humanize(name.replace(/^(delete|remove)/, "")) || "item")}.`;
  }
  if (name.startsWith("search")) {
    return `Searches ${humanize(name.slice(6)) || "the catalog"}.`;
  }
  return `Runs the ${name} action on this service.`;
}

function humanize(value: string): string {
  if (!value) return "";
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

function withArticle(phrase: string): string {
  if (!phrase) return "a record";
  return /^[aeiou]/.test(phrase) ? `an ${phrase}` : `a ${phrase}`;
}

export function renderQuickStart(store: ContractDocsStore): string {
  const starter = findStarterMethod(store);
  const example = starter
    ? {
        service: starter.qualifiedService,
        method: starter.method.name,
        params:
          starter.method.name === "ping"
            ? { message: "hello" }
            : starter.method.params.length === 1 &&
                starter.method.params[0]!.type.includes("IdRequest")
              ? { id: "example-id" }
              : { example: true },
        link: `/docs/${starter.packageName}/${starter.serviceName}#${starter.method.name}`,
        label: `${starter.qualifiedService}.${starter.method.name}`,
      }
    : {
        service: "user.UserService",
        method: "getUser",
        params: { id: "user-1" },
        link: "/docs",
        label: "user.UserService.getUser",
      };

  return `<article class="mb-6 rounded-xl border border-brand/20 bg-brand/5 p-6 shadow-sm">
    <h2 class="mb-2 flex items-center gap-2 text-lg font-semibold text-zinc-900">${icon("rocket", "text-brand")} Quick start (4 steps)</h2>
    <p class="mb-5 text-sm leading-relaxed text-zinc-600">New to SRPC? Follow these steps once, then explore any API below.</p>
    <ol class="space-y-4 text-sm text-zinc-700">
      <li class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">1</span>
        <span><strong>Pick an API.</strong> Start with <a href="${example.link}" class="font-medium text-brand hover:text-brand-dark">${example.label}</a> or open the <a href="/playground" class="font-medium text-brand hover:text-brand-dark">Playground</a> to try calls in your browser.</span>
      </li>
      <li class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">2</span>
        <span><strong>Copy the request body.</strong> Every method page includes a ready-to-use JSON example.</span>
      </li>
      <li class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">3</span>
        <span><strong>Send it to</strong> <code class="rounded bg-white px-1.5 py-0.5 font-mono text-xs ring-1 ring-zinc-200">POST /srpc</code> (or use GET for read-only methods).</span>
      </li>
      <li class="flex gap-3">
        <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">4</span>
        <span><strong>Read the JSON response.</strong> A successful call returns your data. Errors explain what went wrong.</span>
      </li>
    </ol>
    <div class="mt-5">
      <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Your first request</p>
      ${codeBlock(
        JSON.stringify(
          {
            srpc: "1.0",
            service: example.service,
            method: example.method,
            params: example.params,
          },
          null,
          2
        )
      )}
    </div>
  </article>`;
}

export function renderKeyConcepts(): string {
  return `<article class="mb-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
    <h2 class="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900">${icon("lightbulb", "text-brand")} Key ideas (30 seconds)</h2>
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="rounded-lg bg-zinc-50 p-4">
        <p class="text-sm font-semibold text-zinc-900">Package</p>
        <p class="mt-1 text-sm text-zinc-600">A group of related APIs — like a folder. Example: <code class="font-mono text-xs">user</code>, <code class="font-mono text-xs">cart</code>.</p>
      </div>
      <div class="rounded-lg bg-zinc-50 p-4">
        <p class="text-sm font-semibold text-zinc-900">Service</p>
        <p class="mt-1 text-sm text-zinc-600">One API surface inside a package. Example: <code class="font-mono text-xs">UserService</code> handles user actions.</p>
      </div>
      <div class="rounded-lg bg-zinc-50 p-4">
        <p class="text-sm font-semibold text-zinc-900">Method</p>
        <p class="mt-1 text-sm text-zinc-600">A single action you can call — like <code class="font-mono text-xs">getUser</code> or <code class="font-mono text-xs">createOrder</code>.</p>
      </div>
      <div class="rounded-lg bg-zinc-50 p-4">
        <p class="text-sm font-semibold text-zinc-900">Params</p>
        <p class="mt-1 text-sm text-zinc-600">The input JSON for a call. Each method page shows exactly which fields to send.</p>
      </div>
    </div>
  </article>`;
}

export function renderPlaygroundCallout(): string {
  return `<div class="mb-6 flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p class="font-semibold text-zinc-900">${icon("flask")} Prefer clicking over curl?</p>
      <p class="mt-1 text-sm text-zinc-600">Use the Playground to pick a method, edit the JSON, and send a live request — no extra tools needed.</p>
    </div>
    <a href="/playground" class="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-dark">Open Playground</a>
  </div>`;
}

export function describeParams(method: MethodDoc): string {
  if (method.params.length === 0) {
    return "Nothing — send an empty <code class=\"rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm\">params</code> object.";
  }
  if (method.params.length === 1 && method.params[0]!.name === "data") {
    return "A JSON object with the fields shown in the example below.";
  }
  if (method.params.length === 1) {
    return `One value: <code class="rounded bg-zinc-100 px-1 py-0.5 font-mono text-sm">${method.params[0]!.name}</code>.`;
  }
  return `${method.params.length} named fields — see the example below.`;
}
