import { Ajv, type ErrorObject } from "ajv/dist/ajv.js";

const ajv = new Ajv({ allErrors: true, strict: false });

export type ConfigKind = "text" | "number" | "boolean" | "json";

export function parseConfigValue(value: string, kind: string): unknown {
  if (kind === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error("Valor numérico inválido");
    return parsed;
  }
  if (kind === "boolean") {
    if (value !== "true" && value !== "false") throw new Error("Booleano deve ser true ou false");
    return value === "true";
  }
  if (kind === "json") return JSON.parse(value);
  return value;
}

export function validateVariable(body: Record<string, unknown>) {
  const name = String(body.name || "").trim().toUpperCase();
  const value = String(body.value ?? "");
  const kind = String(body.kind || "text");
  const description = String(body.description || "").trim();
  const scopeType = String(body.scopeType || "global");
  const scopeKey = scopeType === "global" ? "global" : String(body.scopeKey || "").trim().toLowerCase();
  const sensitivity = String(body.sensitivity || "internal");
  const ownerName = String(body.ownerName || "").trim();
  const schemaJson = body.schemaJson ? JSON.parse(String(body.schemaJson)) : null;
  const expiresAt = body.expiresAt ? new Date(String(body.expiresAt)) : null;

  if (!/^[A-Z][A-Z0-9_]{0,79}$/.test(name)) throw new Error("Use nome como MINHA_VARIAVEL");
  if (!["text", "number", "boolean", "json"].includes(kind)) throw new Error("Tipo inválido. Segredos devem usar o módulo Cofre");
  if (description.length > 240) throw new Error("Descrição muito longa");
  if (!["global", "space", "environment"].includes(scopeType)) throw new Error("Escopo inválido");
  if (!/^[a-z0-9][a-z0-9_-]{0,79}$/.test(scopeKey)) throw new Error("Informe uma chave de escopo válida");
  if (!["low", "internal", "confidential"].includes(sensitivity)) throw new Error("Classificação inválida");
  if (ownerName.length > 120) throw new Error("Responsável muito longo");
  if (expiresAt && Number.isNaN(expiresAt.getTime())) throw new Error("Expiração inválida");
  if (schemaJson !== null && (typeof schemaJson !== "object" || Array.isArray(schemaJson))) throw new Error("Schema JSON precisa ser um objeto");

  const parsedValue = parseConfigValue(value, kind);
  if (schemaJson !== null) {
    let validate;
    try {
      validate = ajv.compile(schemaJson);
    } catch (error) {
      throw new Error(`Schema JSON inválido: ${error instanceof Error ? error.message : "não foi possível compilar"}`);
    }
    if (!validate(parsedValue)) {
      const reason = validate.errors?.map((item: ErrorObject) => `${item.instancePath || "/"} ${item.message}`).join("; ") || "valor incompatível";
      throw new Error(`O valor não atende ao schema: ${reason}`);
    }
  }

  return { name, value, kind, description, scopeType, scopeKey, sensitivity, ownerName, schemaJson, expiresAt };
}
