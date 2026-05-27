import assert from "node:assert/strict";
import test from "node:test";

import {
  createDefaultPayload,
  extractSkillSchemaPayload,
  normalizeSkillSchema,
  parameterMetadataToJSONSchema,
  transitionPayloadMode,
} from "./schema.mjs";

test("extractSkillSchemaPayload reads schema and ui schema aliases", () => {
  const skill = {
    name: "review",
    input_schema: { properties: { prompt: { type: "string" } } },
    uiSchema: { type: "VerticalLayout", elements: [] },
  };

  assert.deepEqual(extractSkillSchemaPayload(skill), {
    schema: { properties: { prompt: { type: "string" } } },
    uischema: { type: "VerticalLayout", elements: [] },
  });
});

test("normalizeSkillSchema parses string schemas and defaults object type from properties", () => {
  const result = normalizeSkillSchema(`{"properties":{"prompt":{"type":"string"}}}`);

  assert.equal(result.ok, true);
  assert.equal(result.schema.type, "object");
  assert.deepEqual(result.schema.properties.prompt, { type: "string" });
});

test("normalizeSkillSchema rejects invalid schema input", () => {
  const result = normalizeSkillSchema("{bad");

  assert.equal(result.ok, false);
  assert.match(result.error, /valid JSON/);
});

test("parameterMetadataToJSONSchema converts advertised parameter metadata", () => {
  assert.deepEqual(parameterMetadataToJSONSchema({
    required: [{ name: "repo", description: "Repository URL" }],
    optional: [
      { name: "prompt", description: "Task prompt" },
      { name: "repos", description: "Repository URLs" },
    ],
  }), {
    type: "object",
    properties: {
      repo: { type: "string", description: "Repository URL" },
      prompt: { type: "string", description: "Task prompt" },
      repos: { type: "array", items: { type: "string" }, description: "Repository URLs" },
    },
    required: ["repo"],
  });
});

test("normalizeSkillSchema accepts advertised parameter metadata", () => {
  const result = normalizeSkillSchema({
    format: "json",
    optional: [{ name: "prompt", description: "Task prompt" }],
    secret_policy: "forbidden",
  });

  assert.equal(result.ok, true);
  assert.equal(result.schema.type, "object");
  assert.deepEqual(result.schema.properties.prompt, { type: "string", description: "Task prompt" });
});

test("createDefaultPayload uses root and nested schema defaults", () => {
  assert.deepEqual(createDefaultPayload({
    type: "object",
    properties: {
      prompt: { type: "string", default: "Inspect logs" },
      options: {
        type: "object",
        properties: {
          limit: { type: "integer", default: 20 },
        },
      },
      skip: { type: "boolean" },
    },
  }), {
    prompt: "Inspect logs",
    options: { limit: 20 },
  });
});

test("transitionPayloadMode preserves form data when switching to JSON", () => {
  const result = transitionPayloadMode({
    toMode: "json",
    schema: { type: "object", properties: {} },
    currentData: { prompt: "Ship it" },
    textValue: "",
  });

  assert.equal(result.ok, true);
  assert.equal(result.mode, "json");
  assert.equal(result.textValue, "{\n  \"prompt\": \"Ship it\"\n}");
});

test("transitionPayloadMode hydrates form mode from valid JSON and rejects invalid JSON", () => {
  const schema = { type: "object", properties: {} };
  const hydrated = transitionPayloadMode({
    toMode: "form",
    schema,
    currentData: {},
    textValue: "{\"prompt\":\"Build\"}",
  });

  assert.equal(hydrated.ok, true);
  assert.equal(hydrated.mode, "form");
  assert.deepEqual(hydrated.data, { prompt: "Build" });

  const rejected = transitionPayloadMode({
    toMode: "form",
    schema,
    currentData: { prompt: "Build" },
    textValue: "{bad",
  });

  assert.equal(rejected.ok, false);
  assert.equal(rejected.mode, "json");
  assert.deepEqual(rejected.data, { prompt: "Build" });
});
