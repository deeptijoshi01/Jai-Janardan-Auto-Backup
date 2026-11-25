const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const { promisify } = require("util");
const bcrypt = require("bcrypt");
const { hashPassword, verifyPassword } = require("../utils/adminPassword");

test("admin passwords use bcrypt and are verified without storing plaintext", async () => {
  const password = "a-secure-test-password-123";
  const firstHash = await hashPassword(password);
  const secondHash = await hashPassword(password);

  assert.match(firstHash, /^\$2[aby]\$\d{2}\$/);
  assert.equal(await bcrypt.getRounds(firstHash), 12);
  assert.notEqual(firstHash, secondHash);
  assert.equal(await verifyPassword(password, firstHash), true);
  assert.equal(await verifyPassword("a-different-password", firstHash), false);
  assert.equal(await verifyPassword(password, "invalid"), false);
});

test("existing scrypt password records remain valid during the migration", async () => {
  const password = "previous-scrypt-admin-password";
  const salt = crypto.randomBytes(16);
  const key = await promisify(crypto.scrypt)(password, salt, 64);
  const legacyHash = `${salt.toString("hex")}:${key.toString("hex")}`;

  assert.equal(await verifyPassword(password, legacyHash), true);
  assert.equal(await verifyPassword("not-the-password", legacyHash), false);
});

test("bcrypt passwords over 72 UTF-8 bytes are rejected", async () => {
  const hash = await hashPassword("a".repeat(12));
  assert.equal(await verifyPassword("a".repeat(73), hash), false);
  await assert.rejects(hashPassword("a".repeat(73)), /72 UTF-8 bytes/);
});
