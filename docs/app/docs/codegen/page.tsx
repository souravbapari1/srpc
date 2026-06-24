import { CodeBlock } from "@/components/code-block";
import Link from "next/link";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Codegen",
};

export default function CodegenPage() {
  return (
    <DocsPage
      title="Codegen"
      description="srpc-core reads contract files and emits TypeScript interfaces, enums, and service metadata."
    >
      <DocsSection title="CLI">
        <p>
          Use <code>srpc-cli</code> (recommended) or <code>srpc-core</code> directly.
          The example app uses the <code>srpc</code> command:
        </p>
        <CodeBlock title="terminal">
          {`bun add srpc-cli srpc-core
bun run generate`}
        </CodeBlock>
        <p>Custom paths:</p>
        <CodeBlock title="terminal">
          {`srpc generate --contract-dir ./contract --out ./generated/srpc-types.ts
# or
srpc-core generate --contract-dir ./contract --out ./generated/srpc-types.ts`}
        </CodeBlock>
        <p>
          See the{" "}
          <Link href="/docs/cli" className="text-accent-bright hover:underline">
            Contract CLI
          </Link>{" "}
          page for remote package sync commands.
        </p>
      </DocsSection>

      <DocsSection title="Output mapping">
        <DocsList
          items={[
            "struct → export interface",
            "enum → export enum",
            "service → export interface with method signatures + SrpcServiceMeta",
            "Qualified names like catalog.Product map to global TypeScript names",
          ]}
        />
      </DocsSection>

      <DocsSection title="Programmatic API">
        <CodeBlock title="generate.ts">
          {`import { generateFromContracts } from "srpc-core";

const result = generateFromContracts({
  contractDir: "contract",
  outputFile: "generated/srpc-types.ts",
});

console.log(result.filesRead);
console.log(result.errors);`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="When to regenerate">
        <p>
          Run codegen after any contract change — new structs, renamed fields,
          added service methods, or updated HTTP decorators. Server handlers
          depend on the generated types and <code>SrpcServiceMeta</code> for{" "}
          <code>defineService()</code>.
        </p>
      </DocsSection>

      <DocsSection title="Next steps">
        <p>
          After generating types, implement handlers with{" "}
          <code>defineService()</code> — see Implementing handlers.
        </p>
      </DocsSection>
    </DocsPage>
  );
}
