import Link from "next/link";
import { CodeBlock } from "@/components/code-block";

const MARKETPLACE_URL =
  "https://marketplace.visualstudio.com/items?itemName=srpc.srpc-vscode";

const features = [
  "Syntax highlighting and formatting for .ctr and .rpc",
  "Autocomplete, hover docs, and real-time diagnostics",
  "Go to definition and rename across the whole workspace",
  "Cross-file types resolve automatically — no imports",
];

export function VscodeSection() {
  return (
    <section className="vscode-section">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <div className="vscode-panel">
          <div className="vscode-grid">
            <div className="vscode-copy">
              <p className="feature-label">VS Code</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Your contract editor, fully wired
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">
                Search <span className="font-medium text-foreground">SRPC</span> in
                Extensions and start writing — the language server catches errors
                before codegen runs.
              </p>

              <ul className="vscode-features">
                {features.map(item => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <div className="vscode-install">
                <div className="vscode-install-meta">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Marketplace
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">srpc.srpc-vscode</p>
                </div>
                <Link
                  href={MARKETPLACE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary shrink-0 px-5 py-2.5 text-sm font-medium"
                >
                  Install extension
                </Link>
              </div>
            </div>

            <div className="vscode-demo">
              <CodeBlock title="contract/user.ctr" fill>
                {`package user

struct User {
    id: string
    email: string
    orders: order.Order[]
}

service UserService {
    @get getUser(data: common.IdRequest) => User
    @post createUser(data: RegisterUserRequest) => User
}`}
              </CodeBlock>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
