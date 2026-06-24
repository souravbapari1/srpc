import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { TypeReferenceTable } from "@/components/type-reference-table";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Writing contracts",
};

const limitations = [
  {
    name: "No import statements",
    description: "Types resolve across files in contract/ automatically",
    example: "// import is rejected",
  },
  {
    name: "No optional method params",
    description: "Use ? only on struct fields, not service method parameters",
    example: "data: FooRequest  // not data?: FooRequest",
  },
  {
    name: "No semicolons",
    description: "Statements are newline-terminated",
    example: "id: string  // not id: string;",
  },
  {
    name: "No default enum values",
    description: "Enums are simple name lists without assignments",
    example: "ACTIVE  // not ACTIVE = 1",
  },
  {
    name: "Single contract folder",
    description: "Struct, enum, and service names must be unique per contract/ directory",
    example: "One User struct across all files",
  },
];

export default function ContractsPage() {
  return (
    <DocsPage
      title="Writing contracts"
      description="SRPC contracts are plain .ctr or .rpc files that describe data models and service methods. Each file declares a package namespace."
    >
      <DocsSection title="File format">
        <DocsList
          items={[
            "Use .ctr or .rpc extension inside a contract/ folder",
            "Line comments with // — block comments are not supported",
            "No semicolons at end of declarations",
            "Start with package <name> — dotted names like example.user are valid",
          ]}
        />
        <CodeBlock title="common.ctr">
          {`package common

enum SortDirection {
    ASC
    DESC
}

struct Address {
    id?: string
    line1: string
    city: string
    postalCode: string
    country: string
}

struct IdRequest {
    id: string
}

struct EmptyResponse {
    success: boolean
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Declaration kinds">
        <p>Each contract file can contain three top-level declaration types:</p>
        <DocsList
          items={[
            "enum — named constants (e.g. UserStatus { ACTIVE, INACTIVE })",
            "struct — typed data shapes with named fields",
            "service — RPC method groups inside { } blocks",
          ]}
        />
        <p>
          See the{" "}
          <Link href="/docs/types" className="text-accent-bright hover:underline">
            Types reference
          </Link>{" "}
          for every field type, and{" "}
          <Link href="/docs/services" className="text-accent-bright hover:underline">
            Defining services
          </Link>{" "}
          for method syntax and HTTP decorators.
        </p>
      </DocsSection>

      <DocsSection title="Cross-file type resolution">
        <p>
          Types in the same <code>contract/</code> folder resolve automatically.
          Reference types from other packages with <code>package.Type</code>{" "}
          qualified names. Import statements are explicitly rejected by the
          parser.
        </p>
        <CodeBlock title="catalog.ctr (excerpt)">
          {`package catalog

struct ProductVariant {
    price: common.Money
    attributes: map<string, string>
}

service ProductService {
    @get getProduct(data: common.IdRequest) => Product
    @delete deleteProduct(data: common.IdRequest) => common.EmptyResponse
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Naming and uniqueness">
        <DocsList
          items={[
            "Package names are unique per file — one package declaration per file",
            "Struct, enum, and service names must be globally unique within a contract/ folder",
            "Runtime service key is package.ServiceName — e.g. user.UserService",
            "Method names must be unique within a service block",
          ]}
        />
      </DocsSection>

      <DocsSection title="Full example">
        <p>
          The example app splits contracts across multiple files.{" "}
          <code>common.ctr</code> holds shared types; <code>catalog.ctr</code>{" "}
          defines three services in one file.
        </p>
        <CodeBlock title="catalog.ctr (services)">
          {`service ProductService {
    @get listProducts(data: ProductListRequest) => ProductListResponse
    @get getProduct(data: common.IdRequest) => Product
    @post createProduct(data: CreateProductRequest) => Product
    @put updateProduct(data: UpdateProductRequest) => Product
    @delete deleteProduct(data: common.IdRequest) => common.EmptyResponse
}

service CategoryService {
    @get listCategories(data: common.PaginationRequest) => CategoryListResponse
    @post createCategory(data: CreateCategoryRequest) => Category
}

service BrandService {
    @get listBrands(data: common.PaginationRequest) => BrandListResponse
    @post createBrand(data: CreateBrandRequest) => Brand
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Limitations">
        <TypeReferenceTable title="Current DSL limitations" rows={limitations} />
      </DocsSection>
    </DocsPage>
  );
}
