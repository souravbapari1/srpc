import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { TypeReferenceTable } from "@/components/type-reference-table";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Defining services",
};

const httpDecorators = [
  {
    name: "@get",
    description: "Read operations — params sent as query string on GET /srpc",
    example: "@get getUser(data: UserRequest) => User",
  },
  {
    name: "@post",
    description: "Create or action endpoints — JSON body on POST /srpc",
    example: "@post createUser(data: RegisterUserRequest) => User",
  },
  {
    name: "@put",
    description: "Full replacement updates — JSON body on PUT /srpc",
    example: "@put updateUser(data: UpdateProfileRequest) => User",
  },
  {
    name: "@patch",
    description: "Partial updates — JSON body on PATCH /srpc",
    example: "@patch updateUserStatus(data: UserRequest) => User",
  },
  {
    name: "@delete",
    description: "Delete operations — JSON body on DELETE /srpc",
    example: "@delete deleteUser(data: UserRequest) => common.EmptyResponse",
  },
];

export default function ServicesPage() {
  return (
    <DocsPage
      title="Defining services"
      description="Services group RPC methods in contract files. Each method declares its HTTP verb, parameters, and return type."
    >
      <DocsSection title="Service declaration">
        <p>
          A <code>service</code> block contains method signatures. Each method
          follows the pattern <code>(@verb)? name(params) =&gt; ReturnType</code>.
        </p>
        <CodeBlock title="user.ctr">
          {`package user

service UserService {
    @get getUser(data: UserRequest) => User
    @post createUser(data: RegisterUserRequest) => User
    @put updateUser(data: UpdateProfileRequest) => User
    @delete deleteUser(data: UserRequest) => common.EmptyResponse
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="HTTP decorators">
        <p>
          Annotate methods with <code>@get</code>, <code>@post</code>,{" "}
          <code>@put</code>, <code>@patch</code>, or <code>@delete</code>.
          Codegen records the verb in service metadata; the runtime enforces it
          on every request.
        </p>
        <TypeReferenceTable title="HTTP method decorators" rows={httpDecorators} />
        <p className="mt-4">
          <strong>Default verb:</strong> Methods without a decorator default to{" "}
          <code>POST</code> at runtime. Always add an explicit decorator for
          clarity.
        </p>
      </DocsSection>

      <DocsSection title="Method parameters">
        <p>
          Methods take named parameters with types. The common pattern is a
          single <code>data</code> parameter wrapping a request struct:
        </p>
        <CodeBlock>
          {`@get getUser(data: UserRequest) => User
@post createUser(data: RegisterUserRequest) => User`}
        </CodeBlock>
        <p>
          At runtime, the client sends the param object as{" "}
          <code>params</code> in the SRPC envelope. Handlers receive the
          unwrapped object — e.g.{" "}
          <code>{"getUser({ id }, ctx)"}</code> when{" "}
          <code>UserRequest</code> has an <code>id</code> field.
        </p>
      </DocsSection>

      <DocsSection title="Request/response conventions">
        <DocsList
          items={[
            "FooRequest — input struct for a single operation",
            "FooResponse or FooListResponse — output with items + pagination meta",
            "common.IdRequest — standard single-id lookup",
            "common.EmptyResponse — success flag for delete/logout operations",
            "Return the entity directly for single-resource reads and writes",
          ]}
        />
        <CodeBlock title="user.ctr">
          {`struct UserListRequest {
    pagination: common.PaginationRequest
    role?: UserRole
    status?: UserStatus
    query?: string
}

struct UserListResponse {
    items: User[]
    meta: common.PaginationMeta
}

@get listUsers(data: UserListRequest) => UserListResponse`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Multiple services per file">
        <p>
          A single contract file can declare multiple services. Each gets its
          own runtime key: <code>package.ServiceName</code>.
        </p>
        <CodeBlock title="user.ctr">
          {`service UserService {
    @get getUser(data: UserRequest) => User
    @post createUser(data: RegisterUserRequest) => User
}

service AuthService {
    @post register(data: RegisterUserRequest) => LoginResponse
    @post login(data: LoginRequest) => LoginResponse
    @post logout(data: RefreshTokenRequest) => common.EmptyResponse
}`}
        </CodeBlock>
        <p>
          Runtime keys: <code>user.UserService</code> and{" "}
          <code>user.AuthService</code>.
        </p>
      </DocsSection>

      <DocsSection title="Full CRUD example">
        <p>
          The user contract demonstrates a complete CRUD surface with mixed HTTP
          verbs:
        </p>
        <CodeBlock title="user.ctr">
          {`service UserService {
    @get getUser(data: UserRequest) => User
    @get listUsers(data: UserListRequest) => UserListResponse
    @post createUser(data: RegisterUserRequest) => User
    @put updateUser(data: UpdateProfileRequest) => User
    @patch updateUserStatus(data: UserRequest) => User
    @delete deleteUser(data: UserRequest) => common.EmptyResponse
    @post addAddress(data: AddAddressRequest) => User
    @put updateAddress(data: UpdateAddressRequest) => User
    @delete removeAddress(data: UpdateAddressRequest) => User
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Next steps">
        <p>
          After defining services, run codegen and implement handlers. See{" "}
          <Link href="/docs/codegen" className="text-accent-bright hover:underline">
            Codegen
          </Link>{" "}
          and{" "}
          <Link href="/docs/handlers" className="text-accent-bright hover:underline">
            Implementing handlers
          </Link>
          .
        </p>
      </DocsSection>
    </DocsPage>
  );
}
