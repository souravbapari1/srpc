# SRPC Docs

This app is the documentation site for the SRPC framework. It covers the full SRPC workflow: writing `.ctr` contracts, generating TypeScript, implementing handlers with `defineService()`, mounting the Express router, using `srpc-cli`, browsing system docs and contract APIs, and working with the VS Code extension.

Built with Next.js App Router.

## What lives here

- Marketing-style homepage in `app/page.tsx`
- Documentation pages under `app/docs/*`
- Shared docs navigation in `lib/docs-nav.ts`
- Reusable UI components in `components/*`

Current docs sections include:

- Introduction
- Full setup guide
- Writing contracts
- Types reference
- Defining services
- Codegen
- Contract CLI
- Building the server
- System docs & APIs
- Implementing handlers
- Protocol & errors
- VS Code extension

## Local development

From `docs/`:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Useful scripts:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Writing docs

Most docs pages are simple React/TSX files under `app/docs/`. Common building blocks:

- `DocsPage`, `DocsSection`, `DocsList` from `components/docs-page.tsx`
- `CodeBlock` for inline examples
- `FlowSteps` for multi-step walkthroughs

When adding a new page:

1. Create `app/docs/<slug>/page.tsx`
2. Add the page to `lib/docs-nav.ts`
3. Link it from nearby docs where useful

## Project structure

```text
docs/
├── app/
│   ├── page.tsx              # homepage
│   └── docs/                 # framework docs pages
├── components/               # shared docs UI
├── lib/                      # navigation + helpers
├── public/                   # static assets
├── package.json
└── README.md
```

## Notes

- The site documents the SRPC monorepo, especially `srpc-core`, `srpc-cli`, `srpc-mcp`, the example app, and the VS Code extension.
- If framework behavior changes, update the relevant page in `app/docs/*` and keep `lib/docs-nav.ts` in sync.
