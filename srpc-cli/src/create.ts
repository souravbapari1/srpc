import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

export interface CreateProjectOptions {
  name: string;
  baseDir: string;
  git?: boolean;
}

export interface CreateProjectResult {
  projectDir: string;
  files: string[];
  gitInitialized: boolean;
}

function sanitizePackageName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "srpc-app";
}

function mkdirp(dir: string): void {
  mkdirSync(dir, { recursive: true });
}

function writeText(filePath: string, contents: string, files: string[]): void {
  mkdirp(path.dirname(filePath));
  writeFileSync(filePath, contents, "utf8");
  files.push(filePath);
}

function assertTargetIsCreatable(projectDir: string): void {
  if (!existsSync(projectDir)) {
    return;
  }

  const contents = readdirSync(projectDir);
  if (contents.length > 0) {
    throw new Error(`target directory already exists and is not empty: ${projectDir}`);
  }
}

function initGit(projectDir: string): boolean {
  const result = spawnSync("git", ["init", "-q"], {
    cwd: projectDir,
    stdio: "ignore",
  });

  return result.status === 0;
}

export function createStarterProject(options: CreateProjectOptions): CreateProjectResult {
  const appName = sanitizePackageName(options.name);
  const projectDir = path.resolve(options.baseDir, options.name);

  assertTargetIsCreatable(projectDir);
  mkdirp(projectDir);

  const files: string[] = [];

  writeText(
    path.join(projectDir, "package.json"),
    `{
  "name": "${appName}",
  "module": "index.ts",
  "type": "module",
  "private": true,
  "scripts": {
    "start": "bun run index.ts",
    "dev": "bun run generate && bun run --watch index.ts",
    "generate": "srpc generate --contract-dir ./contract --out ./generated/srpc-types.ts"
  },
  "devDependencies": {
    "@types/bun": "latest"
  },
  "peerDependencies": {
    "typescript": "^5"
  },
  "dependencies": {
    "express": "^5.2.1",
    "srpc-cli": "latest",
    "srpc-core": "latest"
  }
}
`,
    files
  );

  writeText(
    path.join(projectDir, "tsconfig.json"),
    `{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "skipLibCheck": true,
    "types": ["bun"]
  }
}
`,
    files
  );

  writeText(
    path.join(projectDir, ".gitignore"),
    `node_modules
.env
`,
    files
  );

  writeText(
    path.join(projectDir, "README.md"),
    `# ${options.name}

Starter SRPC app created with \`srpc create\`.

## Quick start

\`\`\`bash
bun install
bun run generate
bun run dev
\`\`\`

Open:

- Server: \`http://localhost:3100\`
- Contract docs: \`http://localhost:3100/docs\`
- Contract API: \`http://localhost:3100/api/contracts\`
`,
    files
  );

  writeText(
    path.join(projectDir, "index.ts"),
    `import express from "express";
import { createSrpcRouter } from "srpc-core/rpc";
import services from "./services/index.ts";

const PORT = Number(process.env.PORT ?? 3100);

const app = express();

app.use(
  createSrpcRouter({
    services,
    logger: true,
    docs: { contractDir: "./contract" },
  })
);

app.listen(PORT, () => {
  console.log(\`SRPC server listening on http://localhost:\${PORT}\`);
  console.log(\`Contract docs at http://localhost:\${PORT}/docs\`);
  console.log(\`Contract API at http://localhost:\${PORT}/api/contracts\`);
});
`,
    files
  );

  writeText(
    path.join(projectDir, "contract/demo.ctr"),
    `package demo

struct PingRequest {
    message: string
}

struct PingResponse {
    ok: boolean
    echo: string
}

service DemoService {
    @get ping(data: PingRequest) => PingResponse
}
`,
    files
  );

  writeText(
    path.join(projectDir, "services/demo.ts"),
    `import { defineService } from "srpc-core/rpc";
import { DemoService } from "../generated/srpc-types.ts";

export const demoService = defineService(DemoService, {
  ping({ message }) {
    return {
      ok: true,
      echo: message,
    };
  },
});
`,
    files
  );

  writeText(
    path.join(projectDir, "services/index.ts"),
    `import { demoService } from "./demo.ts";

export default [demoService];
export { demoService };
`,
    files
  );

  writeText(path.join(projectDir, "generated/.gitkeep"), "", files);

  const gitInitialized = options.git !== false ? initGit(projectDir) : false;

  return { projectDir, files, gitInitialized };
}
