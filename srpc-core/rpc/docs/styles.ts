import { DOCS_THEME } from "./theme.ts";

export const DOCS_STYLES = `
    *, *::before, *::after { box-sizing: border-box; border-radius: 0; }
    :root {
      --sidebar-width: 16rem;
      --teal: ${DOCS_THEME.teal};
      --teal-dark: ${DOCS_THEME.tealDark};
      --blue: ${DOCS_THEME.blue};
      --indigo: ${DOCS_THEME.indigo};
      --purple: ${DOCS_THEME.purple};
      --orange: ${DOCS_THEME.orange};
      --rose: ${DOCS_THEME.rose};
      --green: ${DOCS_THEME.green};
      --amber: ${DOCS_THEME.amber};
      --slate: ${DOCS_THEME.slate};
      --text: ${DOCS_THEME.text};
      --text-muted: ${DOCS_THEME.textMuted};
      --border: ${DOCS_THEME.border};
      --border-muted: ${DOCS_THEME.borderMuted};
      --border-strong: ${DOCS_THEME.borderStrong};
      --bg: ${DOCS_THEME.bg};
      --bg-muted: ${DOCS_THEME.bgMuted};
      --bg-active: ${DOCS_THEME.bgActive};
    }
    body {
      margin: 0;
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      font-size: 15px;
      line-height: 1.65;
      color: #18181b;
      background: #fafafa;
      -webkit-font-smoothing: antialiased;
    }
    a { color: var(--teal); text-decoration: none; }
    a:hover { color: var(--teal-dark); text-decoration: underline; }
    .layout { min-height: 100vh; }
    .sidebar {
      background: #ffffff;
      padding: 1.5rem 1rem 2rem;
    }
    @media (min-width: 960px) {
      .sidebar {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10;
        width: var(--sidebar-width);
        height: 100vh;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
    }
    .sidebar-brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8125rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--teal);
      margin-bottom: 1.25rem;
      padding: 0;
    }
    .sidebar-brand a { color: inherit; display: flex; align-items: center; gap: 0.5rem; }
    .sidebar-brand a:hover { text-decoration: none; color: var(--teal-dark); }
    .sidebar h2 {
      margin: 1.25rem 0 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #a1a1aa;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .sidebar h2:first-of-type { margin-top: 0; }
    .nav-list { list-style: none; margin: 0; padding: 0; }
    .nav-list li { margin: 0; }
    .nav-list a {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.5rem;
      font-size: 0.8125rem;
      color: var(--slate);
    }
    .nav-list a:hover { color: var(--teal); background: #fafafa; text-decoration: none; }
    .nav-list a.active { color: var(--teal); font-weight: 600; background: #f4f4f5; }
    .nav-list .pkg { margin-top: 0.75rem; }
    .nav-list .pkg > a {
      font-size: 0.75rem;
      font-weight: 700;
      color: #18181b;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .nav-list .nav-icon { width: 1rem; text-align: center; font-size: 0.7rem; color: #a1a1aa; }
    .main { padding: 1.25rem 1rem 3rem; width: 100%; }
    @media (min-width: 640px) {
      .main { padding: 1.5rem 1.5rem 3.5rem; }
    }
    @media (min-width: 960px) {
      .main {
        margin-left: var(--sidebar-width);
        padding: 2rem 2rem 4rem;
        width: calc(100% - var(--sidebar-width));
        max-width: none;
      }
    }
    .panel {
      width: 100%;
      max-width: none;
      background: #ffffff;
      padding: 1.5rem 1.25rem;
    }
    @media (min-width: 640px) { .panel { padding: 1.75rem 1.5rem; } }
    @media (min-width: 960px) { .panel { padding: 2rem; } }
    .panel + .panel { margin-top: 1.25rem; }
    @media (min-width: 640px) { .panel + .panel { margin-top: 1.5rem; } }
    .panel-callout { background: #fafafa; }
    h1 {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.2;
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }
    h1 .title-icon { color: var(--teal); font-size: 1.25rem; }
    h2, .panel-title {
      margin: 0 0 1rem;
      font-size: 1.0625rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .panel-icon { color: var(--teal); font-size: 0.95rem; }
    h3 { margin: 0 0 0.5rem; font-size: 0.9375rem; font-weight: 600; }
    p.lead { margin: 0.75rem 0 0; color: #52525b; font-size: 1rem; max-width: none; }
    p.meta { margin: 0.5rem 0 0; color: #71717a; font-size: 0.875rem; }
    .stats {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.875rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
    }
    @media (min-width: 768px) {
      .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; }
    }
    @media (min-width: 1100px) {
      .stats { grid-template-columns: repeat(5, minmax(0, 1fr)); }
    }
    .stat {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-height: 5.5rem;
      padding: 1rem 0.25rem 0.5rem;
      background: transparent;
    }
    .stat-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.5rem;
    }
    .stat-label {
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #71717a;
      line-height: 1.3;
    }
    .stat-label a { color: inherit; font-weight: inherit; }
    .stat-label a:hover { color: var(--teal); text-decoration: none; }
    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      font-size: 0.875rem;
      flex-shrink: 0;
      color: #a1a1aa;
    }
    .stat-value {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1;
      letter-spacing: -0.03em;
      color: #18181b;
    }
    .callout {
      padding: 1rem 0;
      background: transparent;
    }
    .callout h2 { margin-bottom: 0.5rem; font-size: 0.875rem; }
    .callout p { margin: 0 0 0.75rem; font-size: 0.875rem; color: #52525b; }
    pre {
      margin: 0;
      padding: 1rem 1.25rem;
      overflow-x: auto;
      background: #f4f4f5;
      font-family: ui-monospace, Menlo, monospace;
      font-size: 0.8125rem;
      line-height: 1.6;
      color: #18181b;
    }
    code, .mono { font-family: ui-monospace, Menlo, monospace; font-size: 0.85em; }
    .type, a.type { color: #0550ae; font-weight: 500; }
    a.type:hover { color: var(--teal); }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0;
      font-size: 0.6875rem;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #52525b;
      background: none;
    }
    .badge.http-get,
    .badge.http-post,
    .badge.http-put,
    .badge.http-patch,
    .badge.http-delete,
    .badge.http { color: var(--teal); }
    .badge.ok { color: var(--teal); }
    .badge.missing { color: #a1a1aa; }
    .pkg-section { margin-top: 2rem; }
    .pkg-section:first-child { margin-top: 0; }
    .pkg-section h3 {
      margin-bottom: 0.75rem;
      font-size: 0.8125rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #71717a;
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }
    .service-card {
      padding: 1rem 0;
      margin-bottom: 0.75rem;
      background: transparent;
    }
    .service-card h4 { margin: 0 0 0.35rem; font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 0.45rem; }
    .service-card h4 a { color: inherit; }
    .service-card h4 a:hover { color: var(--teal); text-decoration: none; }
    .service-card .card-icon { color: #a1a1aa; font-size: 0.85rem; }
    .service-card .qualified { font-size: 0.8125rem; color: #71717a; margin-bottom: 0.75rem; }
    .method-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
    .method-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0;
      font-size: 0.75rem;
      color: #52525b;
      background: none;
    }
    .method-chip .verb { font-weight: 600; font-size: 0.625rem; color: var(--teal); }
    .method-block {
      padding: 1.25rem 0;
      margin-bottom: 1rem;
      background: transparent;
    }
    .method-block:last-child { margin-bottom: 0; }
    .method-head { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1rem; margin-bottom: 0.75rem; }
    .method-head h3 { margin: 0; font-size: 1.0625rem; display: flex; align-items: center; gap: 0.45rem; }
    .method-head .method-icon { color: #a1a1aa; font-size: 0.9rem; }
    .method-desc { margin: 0 0 1rem; font-size: 0.875rem; color: #52525b; }
    .detail-grid { display: grid; gap: 0.75rem; margin-bottom: 1rem; font-size: 0.875rem; }
    @media (min-width: 640px) { .detail-grid { grid-template-columns: 6.5rem 1fr; } }
    .detail-grid dt { color: #71717a; font-weight: 600; display: flex; align-items: center; gap: 0.35rem; }
    .detail-grid dt .dt-icon { width: 0.9rem; text-align: center; color: #a1a1aa; }
    .detail-grid dd { margin: 0; color: #18181b; }
    .type-grid { display: grid; gap: 0.75rem; }
    @media (min-width: 640px) { .type-grid { grid-template-columns: 1fr 1fr; } }
    .type-card {
      padding: 1rem 0;
      background: transparent;
    }
    .type-card h4 { margin: 0 0 0.5rem; font-size: 0.875rem; display: flex; align-items: center; gap: 0.4rem; }
    .type-card .type-icon.struct,
    .type-card .type-icon.enum { color: #a1a1aa; }
    ul.fields { margin: 0; padding: 0; list-style: none; }
    ul.fields li { padding: 0.2rem 0; font-size: 0.8125rem; color: #52525b; }
    ul.fields .name { color: #18181b; font-weight: 500; }
    table.fields-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    table.fields-table th,
    table.fields-table td {
      text-align: left;
      padding: 0.5rem 0.75rem 0.5rem 0;
    }
    table.fields-table th {
      background: transparent;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #71717a;
    }
    table.fields-table td { color: #52525b; }
    .type-link-list { list-style: none; margin: 0; padding: 0; }
    .type-link-list li { margin: 0; }
    .type-link-list a {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.4rem 0;
      font-size: 0.875rem;
      color: #52525b;
    }
    .type-link-list a:hover { color: var(--teal); text-decoration: none; }
    .type-link-list .qualified { font-size: 0.75rem; color: #a1a1aa; margin-left: auto; }
    .footer { margin-top: 2rem; font-size: 0.8125rem; color: #a1a1aa; display: flex; align-items: center; gap: 0.4rem; }
    .empty { color: #a1a1aa; font-size: 0.875rem; }
    .contract-graph {
      width: 100%;
      height: 32rem;
      margin-top: 1rem;
      background:
        radial-gradient(circle at 1px 1px, #e4e4e7 1px, transparent 0) 0 0 / 20px 20px,
        #ffffff;
      border: 1px solid #e4e4e7;
    }
    .viz-stage {
      position: relative;
    }
    .viz-stage:fullscreen {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 1rem;
      background: #fafafa;
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
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.75rem;
      font-size: 0.8125rem;
      font-family: inherit;
      font-weight: 600;
      color: #18181b;
      background: #ffffff;
      border: 1px solid #e4e4e7;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
    }
    .viz-fullscreen-exit:hover { color: var(--teal); }
    .viz-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 1rem 1.5rem;
      margin-bottom: 0.75rem;
    }
    .viz-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      font-size: 0.875rem;
      color: #52525b;
      cursor: pointer;
    }
    .viz-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.65rem;
      font-size: 0.8125rem;
      font-family: inherit;
      color: #18181b;
      background: #f4f4f5;
      border: 1px solid #e4e4e7;
      cursor: pointer;
    }
    .viz-btn:hover { background: #fafafa; color: var(--teal); }
    .viz-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 1.5rem;
      margin-top: 1rem;
      font-size: 0.8125rem;
      color: #71717a;
    }
    .viz-legend span { display: inline-flex; align-items: center; gap: 0.45rem; }
    .viz-swatch {
      display: inline-block;
      width: 0.85rem;
      height: 0.85rem;
      border: 2px solid #a1a1aa;
    }
    .viz-swatch.package {
      background: var(--bg);
      border-color: var(--teal);
    }
    .viz-swatch.service {
      background: var(--bg-muted);
      border-color: var(--border);
    }
    .viz-line {
      display: inline-block;
      width: 1.25rem;
      height: 0;
      border-top: 2px solid var(--teal);
    }
    .viz-line.dashed { border-top-style: dashed; border-color: #d4d4d8; }
`;
