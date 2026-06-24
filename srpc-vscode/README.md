# SRPC for VS Code

Edit **SRPC contract files** (`.ctr`, `.rpc`) with syntax highlighting, autocomplete, inline errors, go-to-definition, rename, and formatting — all built into VS Code.

SRPC contracts describe your API: structs, enums, and RPC services. This extension understands the whole contract folder in your workspace so you can reference types across files without `import` statements.

## Install

### From a `.vsix` package

1. Build or obtain `srpc-vscode-*.vsix`
2. In VS Code: **Extensions** → **…** → **Install from VSIX…**
3. Reload the window if prompted

### From source (monorepo)

```bash
cd srpc-vscode
bun install
bun run package
```

Install the generated `.vsix` as above.

### Requirements

- VS Code **1.85** or newer
- A workspace folder containing `.ctr` or `.rpc` files

The extension activates automatically when you open a contract file or when your workspace contains one.

---

## Getting started

1. **Open your project** in VS Code (for example, a repo with `contract/` or `contracts/`).
2. **Open a contract file** — e.g. `contract/user.ctr`.
3. Start typing. The language server indexes all contract files in the same scope and offers completions, hovers, and diagnostics as you work.

### Recommended folder layout

```
my-app/
└── contract/          # or contracts/
    ├── common.ctr     # shared types
    ├── user.ctr
    └── catalog.ctr
```

If your files live under `contract/` or `contracts/`, the extension groups them together for cross-file type resolution. Files outside those folders are scoped to the workspace folder they belong to.

### New empty files

When you create a new `.ctr` or `.rpc` file, the extension can automatically insert a unique `package` line at the top (based on the filename). This is on by default — see [Settings](#settings).

---

## What you get

| Feature | What it does |
|---------|----------------|
| **Syntax highlighting** | Keywords, types, decorators, strings, and comments are colorized |
| **Autocomplete** | Keywords, scalar types, structs, enums, and services from your workspace |
| **Snippets** | Tab-complete `struct`, `enum`, `service`, and `package` blocks |
| **Hover** | Docs for keywords and symbol definitions |
| **Diagnostics** | Syntax errors, unknown types, duplicate names, and naming conflicts |
| **Go to definition** | Jump to a struct, enum, service, or field definition (`F12` / Cmd+click) |
| **Rename** | Rename a symbol and update references across all contract files (`F2`) |
| **Format document** | Format the whole file (`Shift+Alt+F` / **Format Document**) |

### Autocomplete tips

- At the **top level** of a file, start typing `struct`, `enum`, `service`, or `package` for snippets.
- After **`:`** or **`=>`**, you get type suggestions from your workspace (e.g. `User`, `common.Address`, `string[]`).
- Inside a **service**, method snippets include HTTP decorators: `@get`, `@post`, `@put`, `@patch`, `@delete`.
- Trigger characters include `:`, `<`, `.`, and space.

### Errors you might see

| Message | Meaning |
|---------|---------|
| `Unknown type '…'` | The type name does not exist in the indexed contract scope |
| `Duplicate declaration '…'` | Same name used twice in one file |
| `Duplicate struct/enum/service/package '…'` | Name collision across files in the same scope |
| `import` statements are unnecessary | SRPC does not use imports — remove them; types resolve by name |

Hover over a squiggle or open **Problems** (`Ctrl+Shift+M`) for details.

---

## Writing contracts

### Package

Every file with declarations should start with a package name:

```srpc
package user
```

Package names must be unique across all contract files in the same scope.

### Struct

```srpc
struct User {
    id: string
    name: string
    age?: int
}
```

Optional fields use `?`. Use `//` for line comments.

### Enum

```srpc
enum UserRole {
    CUSTOMER
    ADMIN
}
```

### Service

Services group RPC methods. Methods use `=>` for the return type and optional HTTP verb decorators:

```srpc
service UserService {
    @get getUser(
        data: UserRequest
    ) => User

    @post createUser(
        data: RegisterUserRequest
    ) => User
}
```

### Types

| Kind | Examples |
|------|----------|
| Scalars | `string`, `number`, `boolean`, `int`, `float`, `bytes`, `any`, `null`, `date`, `datetime` |
| Collections | `T[]`, `list<T>`, `map<K, V>` |
| Other | unions (`A \| B`), tuples (`[float, float]`), inline structs, optional fields (`?`) |

### Cross-file references

No `import` lines. Reference types from other packages by name:

```srpc
// In package user — references types from package common
addresses: common.Address[]
currency: common.CurrencyCode
```

Use a **simple name** when it is unique in scope, or a **qualified name** (`package.Type`) when needed:

```srpc
owner: user.User
items: catalog.Product[]
```

**Go to definition** and **rename** work across files in the same contract scope.

### Global naming

These share **one namespace** per contract scope (all files in the same `contract/` folder or workspace):

- package names
- struct names
- enum names
- service names

If `Product` is a struct in `catalog.ctr`, you cannot reuse `Product` as an enum, service, or package elsewhere in that scope.

---

## Settings

Open **Settings** and search for `srpc`, or add to `.vscode/settings.json`:

| Setting | Default | Description |
|---------|---------|-------------|
| `srpc.autoPackage` | `true` | Insert a unique `package` line when you open a new empty `.ctr` / `.rpc` file |

---

## Example workspace

The SRPC monorepo includes a full e-commerce contract set:

```
example/contract/
├── common.ctr
├── user.ctr
├── catalog.ctr
├── cart.ctr
└── …
```

Open the `srpc` repo root in VS Code, browse `example/contract/`, and try go-to-definition on `common.Address` or `catalog.Product` from `user.ctr`.

---

## Troubleshooting

**Extension does not activate**

- Confirm the file ends in `.ctr` or `.rpc`
- Reload the window: **Developer: Reload Window**

**Autocomplete or diagnostics missing**

- Save the file and wait a moment for the language server to index
- Check **Output → SRPC Language Server** for errors
- Ensure contract files are in the same `contract/` / `contracts/` folder (or same workspace folder)

**Go to definition does not cross files**

- Verify both files are in the same scoped folder (see [Getting started](#getting-started))
- Check for typos in package-qualified names (`common.Address`, not `Common.Address`)

**Language server failed to start**

- Reload VS Code
- If developing from source, run `bun run compile` in `srpc-vscode/` first

---

## Related tools

| Tool | Role |
|------|------|
| `srpc-cli` | Generate server/client code from contracts |
| `srpc-mcp` | Expose contract docs to AI assistants via MCP |
| `example` | Runnable demo app with sample contracts |

---

## For contributors

```bash
cd srpc-vscode
bun install
bun run compile   # or: bun run watch
```

Press **F5** in VS Code to launch an Extension Development Host.

```bash
bun test tests/
```

### Project layout

```
srpc-vscode/
├── client/src/       # VS Code extension (starts language client)
├── server/src/       # Language server (parser, index, LSP)
├── syntaxes/         # TextMate grammar
└── tests/            # Test suite
```
