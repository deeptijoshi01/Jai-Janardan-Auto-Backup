const createRateLimiter = ({ limit, windowMs, message }) => {
  const requests = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const current = requests.get(key);
    const bucket =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + windowMs };

    bucket.count += 1;
    requests.set(key, bucket);
    if (requests.size > 10000) {
      for (const [address, entry] of requests) {
        if (entry.resetAt <= now) requests.delete(address);
      }
    }

    if (bucket.count > limit) {
      res.set("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
      return res.status(429).json({ success: false, message });
    }
    return next();
  };
};

module.exports = { createRateLimiter };
