const crypto = require("crypto");
const { promisify } = require("util");
const bcrypt = require("bcrypt");

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const BCRYPT_ROUNDS = 12;

const hashPassword = async (password) => {
  if (Buffer.byteLength(password, "utf8") > 72) {
    throw new Error("Passwords cannot exceed 72 UTF-8 bytes when using bcrypt.");
  }
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

const verifyPassword = async (password, storedHash) => {
  const bcryptHash = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(
    String(storedHash || "")
  );
  if (bcryptHash) {
    if (Buffer.byteLength(password, "utf8") > 72) return false;
    return bcrypt.compare(password, storedHash);
  }

  const [saltHex, keyHex, extra] = String(storedHash || "").split(":");
  if (
    extra ||
    !/^[a-f0-9]{32}$/i.test(saltHex || "") ||
    !/^[a-f0-9]{128}$/i.test(keyHex || "")
  ) {
    return false;
  }
  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), KEY_LENGTH);
  return crypto.timingSafeEqual(actual, expected);
};

module.exports = { hashPassword, verifyPassword };
