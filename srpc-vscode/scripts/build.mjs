import * as esbuild from "esbuild";

const shared = {
  bundle: true,
  platform: "node",
  format: "cjs",
  sourcemap: true,
  logLevel: "info",
};

await esbuild.build({
  ...shared,
  entryPoints: ["server/src/server.ts"],
  outfile: "server/out/server.js",
});

await esbuild.build({
  ...shared,
  entryPoints: ["client/src/extension.ts"],
  outfile: "client/out/extension.js",
  external: ["vscode"],
});
