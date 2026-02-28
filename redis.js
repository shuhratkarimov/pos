const { createClient } = require("redis");

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.on("error", (err) => console.error("Redis error:", err));

redis.connect().then(() => console.log("Redis connected"));

module.exports = redis;
