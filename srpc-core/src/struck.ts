type Token = {
    kind: "enum" | "struct";
    name: string;
    body: string;
};

function mapType(type: string): string {
    const trimmed = type.trim();

    const scalarMap: Record<string, string> = {
        string: "string",
        number: "number",
        boolean: "boolean",
        int: "number",
        float: "number",
        bytes: "Uint8Array",
        any: "any",
        null: "null",
        date: "Date",
        datetime: "Date",
    };

    if (scalarMap[trimmed]) {
        return scalarMap[trimmed];
    }

    if (trimmed.endsWith("[]")) {
        return `${mapType(trimmed.slice(0, -2))}[]`;
    }

    const listMatch = trimmed.match(/^list<(.+)>$/);
    if (listMatch?.[1]) {
        return `${mapType(listMatch[1])}[]`;
    }

    const mapMatch = trimmed.match(/^map<(.+),\s*(.+)>$/);
    if (mapMatch?.[1] && mapMatch[2]) {
        return `Record<${mapType(mapMatch[1])}, ${mapType(mapMatch[2])}>`;
    }

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        const inner = trimmed.slice(1, -1);
        return `[${inner.split(",").map(part => mapType(part)).join(", ")}]`;
    }

    if (trimmed.includes("|")) {
        return trimmed
            .split("|")
            .map(part => mapType(part))
            .join(" | ");
    }

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed;
    }

    return trimmed;
}

function generateEnum(name: string, body: string) {
    const values = body
        .split("\n")
        .map(v => v.trim())
        .filter(Boolean);

    return `
  export enum ${name} {
  ${values.map(v => `  ${v} = "${v}"`).join(",\n")}
  }
  `;
}

function generateStruct(name: string, body: string) {
    const fields = body
        .split("\n")
        .map(v => v.trim())
        .filter(Boolean)
        .filter(line => !line.startsWith("//"));

    const props = fields.map(line => {
        const [rawName, rawType] = line.split(":");

        if (!rawName || !rawType) {
            return "";
        }

        const optional = rawName.endsWith("?");

        const fieldName = rawName.replace("?", "").trim();

        return `  ${fieldName}${optional ? "?" : ""}: ${mapType(
            rawType.trim()
        )};`;
    });

    return `
  export interface ${name} {
  ${props.join("\n")}
  }
  `;
}

export function generateTypes(source: string) {
    const regex =
        /(enum|struct)\s+(\w+)\s*\{([\s\S]*?)\}/g;

    let match;

    const output: string[] = [];

    while ((match = regex.exec(source))) {
        const kind = match[1];
        const name = match[2];
        const body = match[3];

        if (!kind || !name || !body) {
            continue;
        }

        if (kind === "enum") {
            output.push(generateEnum(name, body));
        } else {
            output.push(generateStruct(name, body));
        }
    }

    return output.join("\n");
}
