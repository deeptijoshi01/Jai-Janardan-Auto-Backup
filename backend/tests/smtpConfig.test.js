const test = require("node:test");
const assert = require("node:assert/strict");
const { getSmtpConfiguration } = require("../utils/smtpConfig");

test("SMTP configuration lists missing variable names without values", () => {
  const result = getSmtpConfiguration({
    SMTP_HOST: "",
    SMTP_PORT: "",
    SMTP_USER: "",
    SMTP_PASS: "",
    MAIL_FROM: "",
    FRONTEND_URL: "",
  });

  assert.deepEqual(result.missing, [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "MAIL_FROM",
    "FRONTEND_URL",
  ]);
});

test("SMTP configuration validates port and production frontend protocol", () => {
  const base = {
    SMTP_HOST: "smtp.example.test",
    SMTP_PORT: "587",
    SMTP_USER: "mailer",
    SMTP_PASS: "not-returned",
    MAIL_FROM: "Auto <noreply@example.test>",
    FRONTEND_URL: "https://auto.example.test",
    NODE_ENV: "production",
  };

  assert.deepEqual(getSmtpConfiguration(base), {
    port: 587,
    frontendUrl: "https://auto.example.test",
    missing: [],
  });
  assert.match(
    getSmtpConfiguration({ ...base, SMTP_PORT: "invalid" }).missing[0],
    /SMTP_PORT/
  );
  assert.match(
    getSmtpConfiguration({ ...base, FRONTEND_URL: "http://auto.example.test" }).error,
    /HTTPS/
  );
});
