# srpc-cli

Command-line tool for SRPC contract codegen and remote package management.

## Install

```bash
bun install
```

Link in your app:

```json
{
  "dependencies": {
    "srpc-cli": "file:../srpc-cli"
  }
}
```

## Commands

```bash
srpc generate --contract-dir ./contract --out ./generated/srpc-types.ts

srpc package list
srpc package get <package> --dir ./contract
srpc package pull [package...] --dir ./contract
srpc package push [package...] --dir ./contract
srpc package validate <package> --dir ./contract
srpc package create <package> --dir ./contract
srpc package update <package> --dir ./contract
srpc package delete <package>
```

## Environment

| Variable | Description |
|----------|-------------|
| `SRPC_URL` | Contract API base URL (default `http://localhost:3100`) |
| `SRPC_API_KEY` | Bearer token for write operations |
| `SRPC_CONTRACT_DIR` | Default local contract directory |
| `NO_COLOR` | Disable ANSI colors |

## Test

```bash
bun test
```
