import assert from "node:assert/strict";
import test from "node:test";
import { auditHash } from "./foundation.js";

test("auditHash is deterministic for object key order", () => {
  const previous = "0".repeat(64);
  assert.equal(
    auditHash(previous, { action: "config.updated", details: { version: 2, name: "SITE_URL" } }),
    auditHash(previous, { details: { name: "SITE_URL", version: 2 }, action: "config.updated" }),
  );
});

test("auditHash changes when an event is altered", () => {
  const previous = "0".repeat(64);
  assert.notEqual(
    auditHash(previous, { action: "config.updated", version: 2 }),
    auditHash(previous, { action: "config.updated", version: 3 }),
  );
});

test("auditHash binds an event to the previous event", () => {
  const payload = { action: "config.created", resourceId: "config-1" };
  assert.notEqual(auditHash("0".repeat(64), payload), auditHash("1".repeat(64), payload));
});
