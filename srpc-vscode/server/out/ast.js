"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYWORD_DOCS = exports.KEYWORDS = exports.GENERIC_TYPE_KEYWORDS = exports.PRIMITIVE_TYPES = exports.SCALAR_TYPES = exports.HTTP_METHOD_DECORATORS = void 0;
exports.isScalarType = isScalarType;
exports.HTTP_METHOD_DECORATORS = {
    get: "GET",
    post: "POST",
    put: "PUT",
    patch: "PATCH",
    delete: "DELETE",
};
exports.SCALAR_TYPES = [
    "string",
    "number",
    "boolean",
    "datetime",
    "date",
    "int",
    "float",
    "bytes",
    "any",
    "null",
];
exports.PRIMITIVE_TYPES = exports.SCALAR_TYPES;
exports.GENERIC_TYPE_KEYWORDS = ["map", "list"];
exports.KEYWORDS = [
    "enum",
    "struct",
    "service",
    "map",
    "list",
    "package",
];
function isScalarType(name) {
    return exports.SCALAR_TYPES.includes(name);
}
exports.KEYWORD_DOCS = {
    enum: "**enum** defines a set of named constants.",
    struct: "**struct** defines a typed data shape with named fields.",
    service: "**service** groups RPC methods inside `{ }`.",
    package: "**package** sets the namespace for declarations in this file.",
    map: "**map\\<K, V\\>** key-value collection.",
    list: "**list\\<T\\>** ordered collection.",
    string: "UTF-8 string.",
    number: "Numeric value (alias).",
    int: "Integer number.",
    float: "Floating-point number.",
    boolean: "True or false.",
    bytes: "Binary data.",
    any: "Dynamic value.",
    null: "Null type (used in unions).",
    date: "Calendar date (no time).",
    datetime: "Date and time value.",
};
//# sourceMappingURL=ast.js.map