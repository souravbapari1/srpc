import { escapeHtml } from "./escape.ts";
import { renderSidebar } from "./sidebar.ts";
import { renderDocsHead } from "./tailwind.ts";
import type { PageContext } from "./types.ts";
import { cls, icon } from "./ui.ts";

export function page(title: string, body: string, ctx: PageContext): string {
  return `<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
  ${renderDocsHead(title)}
</head>
<body class="min-h-full bg-zinc-100 font-sans text-zinc-900 antialiased">
  <div class="min-h-screen md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
    ${renderSidebar(ctx)}
    <main class="min-w-0 px-4 py-6 lg:px-8 lg:py-8">
      <div class="mx-auto max-w-5xl">
        ${body}
        <p class="${cls.footer}">${icon("file-contract")} Generated from SRPC contracts · ${icon("download")} <a href="?format=json" class="text-brand hover:text-brand-dark">Download JSON</a></p>
      </div>
    </main>
  </div>
</body>
</html>`;
}
