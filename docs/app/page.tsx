import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { FeatureRow } from "@/components/feature-row";
import { VscodeSection } from "@/components/vscode-section";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { docNav } from "@/lib/docs-nav";

const pipeline = [
  { step: "contract/", desc: "Declare types & services" },
  { step: "srpc generate", desc: "Generate TypeScript" },
  { step: "defineService()", desc: "Implement handlers" },
  { step: "POST /srpc", desc: "Agents invoke methods" },
];

const capabilities = [
  "Structs, enums, and services in .ctr files",
  "Cross-file type resolution — no imports",
  "HTTP decorators on every method",
  "Typed handlers with request context",
  "Versioned /srpc request envelope",
  "Structured errors with message + detail",
];

export default function HomePage() {
  return (
    <div className="home min-h-full">
      <SiteHeader />
      <main>
        <section className="hero-shell">
          <div className="hero-grid-bg" aria-hidden />
          <div className="hero-inner mx-auto max-w-6xl px-6 py-16 sm:py-24">
            <div className="hero-grid">
              <div className="hero-copy">
                <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-foreground sm:text-5xl lg:text-[3.25rem]">
                  The contract stack for{" "}
                  <span className="text-accent">agents</span> and developers.
                </h1>
                <p className="mt-5 max-w-lg text-lg leading-8 text-muted-foreground">
                  SRPC is batteries-included contract-first RPC — write .ctr files,
                  generate types, implement handlers, and expose typed services over
                  HTTP.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link href="/docs/setup" className="btn-primary px-6 py-2.5 text-sm font-medium">
                    Full setup guide
                  </Link>
                  <Link href="/docs/contracts" className="btn-outline px-6 py-2.5 text-sm font-medium">
                    View framework docs
                  </Link>
                </div>
              </div>

              <div className="hero-code">
                <CodeBlock title="user.ctr" fill>
                  {`package user

struct User {
    id: string
    email: string
    profile: UserProfile
    createdAt: datetime
}

struct RegisterUserRequest {
    email: string
    password: string
    profile: UserProfile
}

service UserService {
    @get getUser(data: common.IdRequest) => User
    @post createUser(data: RegisterUserRequest) => User
    @put updateUser(data: UpdateProfileRequest) => User
    @delete deleteUser(data: common.IdRequest) => common.EmptyResponse
}`}
                </CodeBlock>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-6 py-16">
          <p className="text-center text-sm text-muted-foreground">
            From contract to live endpoint
          </p>
          <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {pipeline.map(item => (
              <div key={item.step} className="pipeline-item relative text-center lg:text-left">
                <p className="font-mono text-sm font-medium text-accent">{item.step}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="home-band">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Ship agent-callable services with the contract-first framework
              </h2>
              <p className="mt-3 text-lg text-muted-foreground">
                We&apos;re ready when you&apos;re ready.
              </p>
            </div>

            <div className="mt-16 space-y-20 sm:space-y-28">
              <FeatureRow
                label="Framework"
                title="A framework for developers and agents"
                description="SRPC has opinions on everything: service shapes, HTTP verbs, request envelopes, and error formats. That's hundreds of decisions an agent doesn't have to make."
                bullets={capabilities}
                link="/docs/vscode"
                linkLabel="VS Code extension"
              >
                <CodeBlock title="catalog.ctr">
                  {`service ProductService {
    @get listProducts(data: ProductListRequest) => ProductListResponse
    @post createProduct(data: CreateProductRequest) => Product
    @put updateProduct(data: UpdateProductRequest) => Product
    @delete deleteProduct(data: common.IdRequest) => common.EmptyResponse
}`}
                </CodeBlock>
              </FeatureRow>

              <FeatureRow
                reverse
                label="Handlers"
                title="Implement business logic in TypeScript"
                description="Each contract method maps to one typed handler. Agents call through the SRPC envelope — your code receives structured params and returns contract-shaped results."
                link="/docs/handlers"
                linkLabel="Implement handlers"
              >
                <CodeBlock title="services/user.ts" language="typescript">
                  {`export const userService = defineService(UserService, {
  async getUser({ id }, ctx) {
    const token = ctx.getBearerToken();
    if (!token) throw new Error("Unauthorized");
    return requireEntity(store.users.get(id), "User", id);
  },

  createUser({ email, profile }) {
    return createUserFromRegister(email, profile);
  },
});`}
                </CodeBlock>
              </FeatureRow>

              <FeatureRow
                label="Protocol"
                title="One endpoint, predictable envelopes"
                description="Every call hits /srpc with a versioned payload. Success returns result; failures return a user-friendly message and a developer detail field."
                link="/docs/protocol"
                linkLabel="Protocol & errors"
              >
                <CodeBlock title="request.json" language="json">
                  {`{
  "srpc": "1.0",
  "service": "user.UserService",
  "method": "getUser",
  "id": "req-1",
  "params": { "id": "user-1" }
}`}
                </CodeBlock>
              </FeatureRow>

              <FeatureRow
                reverse
                label="Server"
                title="Mount the router and ship"
                description="Pass your defineService results to createSrpcRouter(). HTTP verbs from contracts are enforced automatically. Enable request logging in one line."
                link="/docs/server"
                linkLabel="Building the server"
              >
                <CodeBlock title="index.ts" language="typescript">
                  {`import express from "express";
import { createSrpcRouter } from "srpc-core/rpc";
import services from "./services";

const app = express();
app.use(createSrpcRouter({ services, logger: true }));
app.listen(3100);`}
                </CodeBlock>
              </FeatureRow>
            </div>
          </div>
        </section>

        <VscodeSection />

        <section className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need in the docs
            </h2>
            <p className="mt-3 text-muted-foreground">
              Contracts, CLI, server, VS Code extension, handlers, protocol — step by step.
            </p>
          </div>
          <div className="mx-auto mt-12 max-w-3xl divide-y divide-border">
            {docNav.map(item => (
              <Link key={item.href} href={item.href} className="doc-link group">
                <h3 className="text-sm font-medium text-foreground transition group-hover:text-accent">
                  {item.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="home-cta mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Create without limits.
            <br />
            What will you ship?
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/docs/setup" className="btn-primary px-6 py-2.5 text-sm font-medium">
              Full setup guide
            </Link>
            <Link href="/docs/contracts" className="btn-outline px-6 py-2.5 text-sm font-medium">
              Write your first contract
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter minimal />
    </div>
  );
}
