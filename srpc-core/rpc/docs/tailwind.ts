import { escapeHtml } from "./escape.ts";

export const DOCS_TAILWIND_CONFIG = `
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
`;

export const DOCS_EXTRA_STYLES = `
  .contract-graph {
    width: 100%;
    height: 32rem;
    margin-top: 0.75rem;
    background:
      radial-gradient(circle at 1px 1px, #e4e4e7 1px, transparent 0) 0 0 / 20px 20px,
      #ffffff;
    border: 1px solid #e4e4e7;
    border-radius: 0.75rem;
  }
  .viz-stage { position: relative; }
  .viz-stage:fullscreen {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 1rem;
    background: #f4f4f5;
    box-sizing: border-box;
  }
  .viz-stage:fullscreen .contract-graph {
    flex: 1;
    height: auto;
    min-height: 0;
    margin-top: 0;
  }
  .viz-fullscreen-exit {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    z-index: 2;
  }
  .code-block { margin: 1rem 0; }
  .code-pre {
    margin: 0;
    overflow-x: auto;
    border-radius: 0.75rem;
    border: 1px solid #1e293b;
    background: #0f1419;
    padding: 1.25rem 1.5rem;
    font-family: "JetBrains Mono", ui-monospace, Menlo, Monaco, Consolas, monospace;
    font-size: 0.8125rem;
    line-height: 1.75;
    color: #e2e8f0;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }
  .code-pre code {
    font-family: inherit;
    font-size: inherit;
    line-height: inherit;
    white-space: pre;
  }
  .json-key { color: #7dd3fc; }
  .json-string { color: #86efac; }
  .json-number { color: #fcd34d; }
  .json-literal { color: #c4b5fd; }
`;

export function renderDocsHead(title: string): string {
  return `<meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} · SRPC API Docs</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" />
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer" />
  <script src="https://cdn.tailwindcss.com"></script>
  <script>${DOCS_TAILWIND_CONFIG}</script>
  <style>${DOCS_EXTRA_STYLES}</style>`;
}
