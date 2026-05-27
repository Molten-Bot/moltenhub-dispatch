import React from "react";
import { createRoot } from "react-dom/client";
import { JsonForms } from "@jsonforms/react";
import { vanillaCells, vanillaRenderers } from "@jsonforms/vanilla-renderers";
import "./skill-payload-form.css";

import {
  createDefaultPayload,
  deepClone,
  normalizeSkillSchema,
  prettyJSONStringify,
  transitionPayloadMode,
} from "./schema.mjs";

const roots = new WeakMap();

function SkillPayloadForm({ schema, uischema, data, onChange }) {
  return (
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={vanillaRenderers}
      cells={vanillaCells}
      onChange={({ data: nextData, errors }) => {
        onChange({
          data: nextData == null ? {} : nextData,
          errors: Array.isArray(errors) ? errors : [],
        });
      }}
    />
  );
}

const renderForm = (element, options) => {
  if (!(element instanceof HTMLElement)) {
    return { ok: false, error: "form mount element is missing" };
  }
  const normalized = normalizeSkillSchema(options && options.schema, options && options.uischema);
  if (!normalized.ok) {
    return normalized;
  }
  const initialData = options && Object.prototype.hasOwnProperty.call(options, "data") && options.data != null
    ? deepClone(options.data)
    : createDefaultPayload(normalized.schema);
  let root = roots.get(element);
  if (!root) {
    root = createRoot(element);
    roots.set(element, root);
  }
  root.render(
    <SkillPayloadForm
      schema={normalized.schema}
      uischema={normalized.uischema}
      data={initialData}
      onChange={options && typeof options.onChange === "function" ? options.onChange : () => {}}
    />,
  );
  return {
    ok: true,
    schema: normalized.schema,
    uischema: normalized.uischema,
    data: initialData,
    error: "",
  };
};

const unmountForm = (element) => {
  const root = roots.get(element);
  if (!root) {
    return;
  }
  root.unmount();
  roots.delete(element);
};

window.MoltenHubSkillPayloadForm = {
  createDefaultPayload,
  normalizeSkillSchema,
  prettyJSONStringify,
  render: renderForm,
  transitionPayloadMode,
  unmount: unmountForm,
};
