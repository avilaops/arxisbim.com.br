import assert from "node:assert/strict";
import test from "node:test";
import { parseConfigValue, validateVariable } from "./config.js";

test("parseConfigValue rejects invalid numbers and booleans", () => {
  assert.throws(() => parseConfigValue("NaN", "number"), /numérico inválido/);
  assert.throws(() => parseConfigValue("sim", "boolean"), /true ou false/);
});

test("validateVariable accepts a value compatible with its JSON Schema", () => {
  const result = validateVariable({
    name: "RETRY_LIMIT",
    value: "5",
    kind: "number",
    schemaJson: JSON.stringify({ type: "number", minimum: 1, maximum: 10 }),
  });
  assert.equal(result.name, "RETRY_LIMIT");
  assert.equal(result.value, "5");
});

test("validateVariable rejects a value incompatible with its JSON Schema", () => {
  assert.throws(() => validateVariable({
    name: "RETRY_LIMIT",
    value: "15",
    kind: "number",
    schemaJson: JSON.stringify({ type: "number", maximum: 10 }),
  }), /não atende ao schema/);
});

test("validateVariable rejects secrets disguised as a config type", () => {
  assert.throws(() => validateVariable({ name: "API_TOKEN", value: "secret", kind: "secret" }), /módulo Cofre/);
});
