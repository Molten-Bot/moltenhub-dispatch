export const schemaAliases = [
  "schema",
  "input_schema",
  "payload_schema",
  "inputSchema",
  "payloadSchema",
  "parameters",
  "args_schema",
  "argsSchema",
];

export const uiSchemaAliases = ["ui_schema", "uischema", "uiSchema"];

export const isPlainObject = (value) => {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

export const deepClone = (value) => {
  if (value == null || typeof value !== "object") {
    return value;
  }
  return JSON.parse(JSON.stringify(value));
};

export const firstAliasValue = (source, aliases) => {
  if (!isPlainObject(source)) {
    return undefined;
  }
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(source, alias) && source[alias] != null) {
      return source[alias];
    }
  }
  return undefined;
};

export const extractSkillSchemaPayload = (skill) => ({
  schema: firstAliasValue(skill, schemaAliases),
  uischema: firstAliasValue(skill, uiSchemaAliases),
});

export const parseMaybeJSONString = (value, label = "value") => {
  if (typeof value !== "string") {
    return { ok: true, value };
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: false, error: `${label} is empty` };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) };
  } catch (error) {
    return {
      ok: false,
      error: `${label} must be valid JSON: ${error instanceof Error ? error.message : "parse failed"}`,
    };
  }
};

const parameterEntries = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return { name: entry.trim(), description: "" };
      }
      if (!isPlainObject(entry)) {
        return { name: "", description: "" };
      }
      return {
        name: typeof entry.name === "string" ? entry.name.trim() : "",
        description: typeof entry.description === "string" ? entry.description.trim() : "",
      };
    })
    .filter((entry) => entry.name !== "");
};

const schemaForParameter = (entry) => {
  const normalizedName = entry.name.toLowerCase();
  const description = entry.description || undefined;
  if (["images", "repos", "reviewers"].includes(normalizedName)) {
    return {
      type: "array",
      items: { type: "string" },
      ...(description ? { description } : {}),
    };
  }
  return {
    type: "string",
    ...(description ? { description } : {}),
  };
};

export const parameterMetadataToJSONSchema = (value) => {
  if (!isPlainObject(value)) {
    return null;
  }
  const required = parameterEntries(value.required);
  const optional = parameterEntries(value.optional);
  if (required.length === 0 && optional.length === 0) {
    return null;
  }
  const properties = {};
  for (const entry of [...required, ...optional]) {
    properties[entry.name] = schemaForParameter(entry);
  }
  return {
    type: "object",
    properties,
    ...(required.length > 0 ? { required: required.map((entry) => entry.name) } : {}),
  };
};

export const normalizeJSONSchema = (schemaInput) => {
  const parsed = parseMaybeJSONString(schemaInput, "schema");
  if (!parsed.ok) {
    return { ok: false, schema: null, error: parsed.error };
  }
  if (!isPlainObject(parsed.value)) {
    return { ok: false, schema: null, error: "schema must be a JSON object" };
  }
  const parameterSchema = parameterMetadataToJSONSchema(parsed.value);
  const schema = parameterSchema || deepClone(parsed.value);
  if (!schema.type && isPlainObject(schema.properties)) {
    schema.type = "object";
  }
  if (!schema.type && !schema.anyOf && !schema.oneOf && !schema.allOf && !schema.$ref) {
    return { ok: false, schema: null, error: "schema must declare a type or JSON Schema composition" };
  }
  return { ok: true, schema, error: "" };
};

export const normalizeUISchema = (uischemaInput) => {
  if (uischemaInput == null || (typeof uischemaInput === "string" && uischemaInput.trim() === "")) {
    return { ok: true, uischema: undefined, error: "" };
  }
  const parsed = parseMaybeJSONString(uischemaInput, "ui schema");
  if (!parsed.ok) {
    return { ok: false, uischema: undefined, error: parsed.error };
  }
  if (!isPlainObject(parsed.value)) {
    return { ok: false, uischema: undefined, error: "ui schema must be a JSON object" };
  }
  return { ok: true, uischema: deepClone(parsed.value), error: "" };
};

export const normalizeSkillSchema = (schemaInput, uischemaInput) => {
  if (schemaInput == null || (typeof schemaInput === "string" && schemaInput.trim() === "")) {
    return { ok: false, schema: null, uischema: undefined, error: "schema is empty" };
  }
  const schemaResult = normalizeJSONSchema(schemaInput);
  if (!schemaResult.ok) {
    return { ok: false, schema: null, uischema: undefined, error: schemaResult.error };
  }
  const uiSchemaResult = normalizeUISchema(uischemaInput);
  if (!uiSchemaResult.ok) {
    return { ok: false, schema: null, uischema: undefined, error: uiSchemaResult.error };
  }
  return {
    ok: true,
    schema: schemaResult.schema,
    uischema: uiSchemaResult.uischema,
    error: "",
  };
};

const schemaTypes = (schema) => {
  if (!isPlainObject(schema)) {
    return [];
  }
  if (Array.isArray(schema.type)) {
    return schema.type.filter((type) => typeof type === "string");
  }
  return typeof schema.type === "string" ? [schema.type] : [];
};

export const createDefaultPayload = (schema) => {
  if (!isPlainObject(schema)) {
    return {};
  }
  if (Object.prototype.hasOwnProperty.call(schema, "default")) {
    return deepClone(schema.default);
  }
  const types = schemaTypes(schema);
  if (types.includes("array")) {
    return [];
  }
  if (types.includes("object") || isPlainObject(schema.properties)) {
    const output = {};
    const properties = isPlainObject(schema.properties) ? schema.properties : {};
    for (const [key, propertySchema] of Object.entries(properties)) {
      if (!isPlainObject(propertySchema)) {
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(propertySchema, "default")) {
        output[key] = deepClone(propertySchema.default);
        continue;
      }
      const nestedDefault = createNestedDefault(propertySchema);
      if (nestedDefault.hasDefault) {
        output[key] = nestedDefault.value;
      }
    }
    return output;
  }
  return {};
};

const createNestedDefault = (schema) => {
  if (!isPlainObject(schema)) {
    return { hasDefault: false, value: undefined };
  }
  if (Object.prototype.hasOwnProperty.call(schema, "default")) {
    return { hasDefault: true, value: deepClone(schema.default) };
  }
  const types = schemaTypes(schema);
  if (types.includes("object") || isPlainObject(schema.properties)) {
    const value = createDefaultPayload(schema);
    return Object.keys(value).length > 0
      ? { hasDefault: true, value }
      : { hasDefault: false, value: undefined };
  }
  if (types.includes("array") && isPlainObject(schema.items)) {
    const itemDefault = createNestedDefault(schema.items);
    if (itemDefault.hasDefault) {
      return { hasDefault: true, value: [itemDefault.value] };
    }
  }
  return { hasDefault: false, value: undefined };
};

export const prettyJSONStringify = (value) => JSON.stringify(value == null ? {} : value, null, 2);

export const parseJSONPayload = (value) => {
  const trimmed = String(value || "").trim();
  if (trimmed === "") {
    return { ok: true, data: {}, error: "" };
  }
  try {
    return { ok: true, data: JSON.parse(trimmed), error: "" };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: error instanceof Error ? error.message : "payload must be valid JSON",
    };
  }
};

export const transitionPayloadMode = ({ toMode, textValue, currentData, schema }) => {
  if (toMode === "json") {
    return {
      ok: true,
      mode: "json",
      data: currentData == null ? createDefaultPayload(schema) : deepClone(currentData),
      textValue: prettyJSONStringify(currentData == null ? createDefaultPayload(schema) : currentData),
      error: "",
    };
  }
  if (toMode === "form") {
    const parsed = parseJSONPayload(textValue);
    if (!parsed.ok) {
      return {
        ok: false,
        mode: "json",
        data: currentData == null ? createDefaultPayload(schema) : deepClone(currentData),
        textValue,
        error: parsed.error,
      };
    }
    return {
      ok: true,
      mode: "form",
      data: parsed.data == null ? createDefaultPayload(schema) : parsed.data,
      textValue: prettyJSONStringify(parsed.data == null ? createDefaultPayload(schema) : parsed.data),
      error: "",
    };
  }
  return {
    ok: false,
    mode: "json",
    data: currentData == null ? createDefaultPayload(schema) : deepClone(currentData),
    textValue,
    error: "payload mode must be form or json",
  };
};
