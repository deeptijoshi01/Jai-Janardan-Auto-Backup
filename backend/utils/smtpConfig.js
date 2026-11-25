const REQUIRED_SMTP_VARIABLES = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "MAIL_FROM",
  "FRONTEND_URL",
];

const getSmtpConfiguration = (environment = process.env) => {
  const missing = REQUIRED_SMTP_VARIABLES.filter(
    (name) => !environment[name]?.trim()
  );
  const port = Number(environment.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    missing.push(
      environment.SMTP_PORT?.trim()
        ? "SMTP_PORT (valid port required)"
        : "SMTP_PORT"
    );
  }
  if (missing.length) return { missing: [...new Set(missing)] };

  let frontend;
  try {
    frontend = new URL(environment.FRONTEND_URL);
  } catch {
    return { error: "FRONTEND_URL must be a valid absolute URL." };
  }
  if (
    !["http:", "https:"].includes(frontend.protocol) ||
    (environment.NODE_ENV === "production" && frontend.protocol !== "https:")
  ) {
    return {
      error:
        "FRONTEND_URL must use HTTP or HTTPS and must use HTTPS in production.",
    };
  }
  return { port, frontendUrl: frontend.origin, missing: [] };
};

module.exports = { getSmtpConfiguration };
