import { escapeHtml } from "./escape.ts";
import { renderSidebar } from "./sidebar.ts";
import { DOCS_STYLES } from "./styles.ts";
import type { PageContext } from "./types.ts";
import { icon } from "./ui.ts";

export function page(title: string, body: string, ctx: PageContext): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · SRPC API Docs</title>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <style>${DOCS_STYLES}</style>
</head>
<body>
  <div class="layout">
    ${renderSidebar(ctx)}
    <main class="main">
      ${body}
      <p class="footer">${icon("file-contract")} Generated from SRPC contracts · ${icon("download")} <a href="?format=json">Download JSON</a></p>
    </main>
  </div>
</body>
</html>`;
}
