import { test, expect } from "bun:test";
import { parseDocument } from "../server/src/parser";

const USER_TYPES_SOURCE = `
enum UserStatus {
    ACTIVE
    INACTIVE
}

struct Address {
    city: string
}

struct Activity {
    name: string
}

struct User {
    // Scalars
    name: string
    age: int
    salary: float
    active: boolean
    createdAt: datetime
    birthDate: date

    // Binary
    profileImage: bytes

    // Collections
    tags: string[]
    scores: int[]
    documents: bytes[]

    // Maps
    metadata: map<string, string>
    settings: map<string, any>

    // Nested Structs
    address: Address

    // Enums
    status: UserStatus

    // Optional
    phone?: string
    verifiedAt?: datetime

    // Nullable
    middleName: string | null

    // Union
    identifier: string | int

    // Tuples
    coordinates: [float, float]

    // Generic containers
    history: list<Activity>
    preferences: string[]

    // Recursive
    manager?: User

    // Dynamic
    extra: any

    // Literal values
    role: "admin" | "user" | "guest"
}
`;

test("parses full User type example", () => {
  const { document, diagnostics } = parseDocument(USER_TYPES_SOURCE, {
    resolveType: () => true,
  });

  const errors = diagnostics.filter(d => d.severity === "error");
  expect(errors).toEqual([]);

  const user = document.declarations.find(
    d => d.kind === "struct" && d.name === "User"
  );

  expect(user?.kind).toBe("struct");
  if (user?.kind === "struct") {
    expect(user.fields.length).toBeGreaterThan(20);

    const role = user.fields.find(f => f.name === "role");
    expect(role?.type.kind).toBe("union");

    const coordinates = user.fields.find(f => f.name === "coordinates");
    expect(coordinates?.type.kind).toBe("tuple");

    const history = user.fields.find(f => f.name === "history");
    expect(history?.type.kind).toBe("list");

    const birthDate = user.fields.find(f => f.name === "birthDate");
    expect(birthDate?.type.kind).toBe("primitive");
    if (birthDate?.type.kind === "primitive") {
      expect(birthDate.type.name).toBe("date");
    }
  }
});
