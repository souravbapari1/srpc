export interface DocNavItem {
  title: string;
  href: string;
  description?: string;
}

export const docNav: DocNavItem[] = [
  {
    title: "Introduction",
    href: "/docs",
    description: "What SRPC is and how the pieces fit together",
  },
  {
    title: "Full setup guide",
    href: "/docs/setup",
    description: "Install packages, run the server, CLI, and VS Code extension",
  },
  {
    title: "Writing contracts",
    href: "/docs/contracts",
    description: "Package, declarations, cross-file refs, and naming rules",
  },
  {
    title: "Types reference",
    href: "/docs/types",
    description: "Primitives, collections, unions, and qualified references",
  },
  {
    title: "Defining services",
    href: "/docs/services",
    description: "Service methods, HTTP decorators, and request/response patterns",
  },
  {
    title: "Codegen",
    href: "/docs/codegen",
    description: "Generate TypeScript types from contracts",
  },
  {
    title: "Contract CLI",
    href: "/docs/cli",
    description: "srpc-cli — codegen and remote package sync",
  },
  {
    title: "Building the server",
    href: "/docs/server",
    description: "Express router, docs, playground, CORS, and logging",
  },
  {
    title: "DevTools authentication",
    href: "/docs/auth",
    description: "Protect /docs, /playground, and /api/contracts",
  },
  {
    title: "System docs & APIs",
    href: "/docs/system",
    description: "Contract docs, playground, contract API, MCP, and use cases",
  },
  {
    title: "Implementing handlers",
    href: "/docs/handlers",
    description: "defineService, handler logic, context, and errors",
  },
  {
    title: "Protocol & errors",
    href: "/docs/protocol",
    description: "Request/response envelope, dispatch flow, and error codes",
  },
  {
    title: "VS Code extension",
    href: "/docs/vscode",
    description: "Language server, diagnostics, and editor workflow",
  },
];
