# SRPC — VS Code Extension

Language support for **SRPC** contract files (`.ctr`, `.rpc`). Provides syntax highlighting, autocomplete, diagnostics, go-to-definition, rename, and formatting via a built-in language server.

## Features

- **Syntax highlighting** for `.ctr` and `.rpc` files
- **Autocomplete** for keywords, types, and workspace symbols
- **Hover** documentation for keywords and symbols
- **Diagnostics** for syntax errors, unknown types, and duplicate names
- **Go to definition** across files in the workspace
- **Rename** with cross-file reference updates
- **Document formatting**
- **Workspace-wide type resolution** — no `import` statements required
- **Auto package** — inserts a unique `package` line in new empty files
- **File icons** (optional) for contract files

## Quick start

### Install from source

```bash
cd srpc-vscode
bun install
bun run compile
bunx @vscode/vsce package --allow-missing-repository
```

Install the generated `.vsix` from VS Code: **Extensions → … → Install from VSIX**.

### Development

```bash
cd srpc-vscode
bun install
bun run compile   # or: bun run watch
```

Open the repo root in VS Code and press **F5** to launch an Extension Development Host with the language server loaded.

Run tests:

```bash
bun test tests/
```

## Language overview

### Package

Every file with declarations should declare a package at the top:

```srpc
package user
```

New empty `.ctr` / `.rpc` files get a unique package name automatically (based on the filename) when `srpc.autoPackage` is enabled.

### Struct

```srpc
struct User {
    id: string
    name: string
    age?: int
}
```

### Enum

```srpc
enum Role {
    ADMIN
    USER
}
```

### Service

Services use braces. Methods use `=>` for the return type:

```srpc
service UserService {
    getUser(
        id: string
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

Types from other contract files resolve automatically across the workspace. Use a simple name when it is unique, or a package-qualified name:

```srpc
products: products.Product[]
owner: meradhan.user.User
```

`import` statements are **not** supported. If present, the extension reports that they are unnecessary.

## Naming rules

These names share a **single global namespace** across all contract files in the workspace:

- `package` names
- `struct` names
- `enum` names
- `service` names

If `Product` is defined as a struct in `products.ctr`, you cannot reuse `Product` as a struct, enum, service, or package name in another file. The editor shows an error on duplicates.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `srpc.autoPackage` | `true` | Auto-insert a unique `package` declaration in new empty files |
| `srpc.enableFileIcons` | `true` | Use SRPC file icons for `.ctr` and `.rpc` |

To enable file icons manually: **File → Preferences → File Icon Theme → SRPC File Icons**.

## Project layout

```
srpc-vscode/
├── client/src/          # VS Code extension host (starts the language client)
├── server/src/          # Language server (parser, workspace index, LSP handlers)
├── syntaxes/            # TextMate grammar
├── icons/               # File icon theme
├── tests/               # Bun test suite
└── scripts/build.mjs    # esbuild bundle for client + server
```

## Example workspace

```
contract/
├── user.ctr       # package user — User, UserService, …
└── products.ctr   # package products — Product
```

`user.ctr` can reference `products.Product` without imports because both files are indexed by the language server.

## Requirements

- VS Code `^1.85.0`
- [Bun](https://bun.sh) (for development and tests)
