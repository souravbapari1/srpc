import { CodeBlock } from "@/components/code-block";
import { TypeReferenceTable } from "@/components/type-reference-table";
import { DocsList, DocsPage, DocsSection } from "@/components/docs-page";

export const metadata = {
  title: "Types reference",
};

const primitives: { name: string; description: string; example: string }[] = [
  { name: "string", description: "UTF-8 text", example: "email: string" },
  { name: "number", description: "Numeric alias", example: "score: number" },
  { name: "int", description: "Integer", example: "quantity: int" },
  { name: "float", description: "Floating-point", example: "latitude: float" },
  { name: "boolean", description: "True or false", example: "isActive: boolean" },
  { name: "date", description: "Calendar date", example: "birthDate: date" },
  { name: "datetime", description: "ISO timestamp", example: "createdAt: datetime" },
  { name: "bytes", description: "Binary data", example: "payload: bytes" },
  { name: "any", description: "Untyped value", example: "metadata: any" },
  { name: "null", description: "Null type", example: "value: null" },
];

const collections: { name: string; description: string; example: string }[] = [
  { name: "T[]", description: "Array shorthand", example: "tags: string[]" },
  { name: "list<T>", description: "Ordered collection", example: "items: list<OrderItem>" },
  { name: "map<K, V>", description: "Key-value map", example: "attributes: map<string, string>" },
];

const composites: { name: string; description: string; example: string }[] = [
  { name: "[T1, T2]", description: "Fixed-size tuple", example: "coords: [float, float]" },
  { name: "{ field: T }", description: "Inline struct", example: "filter: { status: OrderStatus }" },
  { name: "A | B", description: "Union type", example: "value: string | int" },
  { name: '"admin" | "user"', description: "String literal union", example: 'role: "admin" | "user"' },
  { name: "field?: T", description: "Optional struct field", example: "notes?: string" },
  { name: "package.Type", description: "Qualified reference", example: "price: common.Money" },
];

export default function TypesPage() {
  return (
    <DocsPage
      title="Types reference"
      description="Every type form supported by the SRPC contract parser — primitives, collections, composites, and cross-file references."
    >
      <DocsSection title="Primitives">
        <p>
          Scalar types map directly to TypeScript primitives and Date during
          codegen. Use <code>int</code> and <code>float</code> when you want
          explicit numeric semantics.
        </p>
        <TypeReferenceTable title="Scalar types" rows={primitives} />
      </DocsSection>

      <DocsSection title="Collections">
        <p>
          Arrays and lists both codegen to TypeScript arrays. Maps codegen to{" "}
          <code>Record&lt;K, V&gt;</code>.
        </p>
        <TypeReferenceTable title="Collection types" rows={collections} />
        <CodeBlock title="catalog.ctr">
          {`struct ProductVariant {
    attributes: map<string, string>
    imageIds: string[]
}

struct Product {
    categoryIds: string[]
    variants: ProductVariant[]
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Composites">
        <TypeReferenceTable title="Composite types" rows={composites} />
        <CodeBlock title="order.ctr (excerpt)">
          {`struct Order {
    items: OrderItem[]
    totals: OrderTotals
    couponCode?: string
    placedAt: datetime
    paidAt?: datetime
}

struct OrderListRequest {
    pagination: common.PaginationRequest
    userId?: string
    status?: OrderStatus
    dateRange?: common.DateRange
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Optional fields">
        <p>
          Append <code>?</code> after a struct field name to mark it optional.
          Optional fields are not allowed on service method parameters — wrap
          optional input in a request struct instead.
        </p>
        <CodeBlock>
          {`struct Address {
    id?: string
    line1: string
    line2?: string
    isDefault?: boolean
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Enums">
        <p>
          Enums are simple identifier lists. They codegen to TypeScript enums
          and can be used as field types or union members.
        </p>
        <CodeBlock title="order.ctr">
          {`enum OrderStatus {
    PENDING
    CONFIRMED
    PROCESSING
    SHIPPED
    DELIVERED
    CANCELLED
}

struct Order {
    status: OrderStatus
    paymentStatus: OrderPaymentStatus
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Qualified references">
        <p>
          Reference types from another package with <code>package.Type</code>.
          Unqualified names resolve within the current file&apos;s package first,
          then across all files in <code>contract/</code>.
        </p>
        <DocsList
          items={[
            "common.Money — money type from the common package",
            "common.PaginationRequest — shared pagination input",
            "common.IdRequest — single-id lookup pattern",
            "catalog.Product — cross-package struct reference",
          ]}
        />
        <CodeBlock title="common.ctr">
          {`struct Money {
    amount: int
    currency: CurrencyCode
}

struct PaginationRequest {
    page: int
    pageSize: int
    sortBy?: string
    sortDirection?: SortDirection
}`}
        </CodeBlock>
      </DocsSection>

      <DocsSection title="Unions and literals">
        <p>
          Union types combine multiple type forms. String literal unions are
          useful for discriminated string fields without defining a full enum.
        </p>
        <CodeBlock>
          {`struct ApiError {
    code: string
    message: string
    details?: map<string, string>
}

// String literal union (when supported in struct fields)
// role: "admin" | "user" | "guest"`}
        </CodeBlock>
      </DocsSection>
    </DocsPage>
  );
}
