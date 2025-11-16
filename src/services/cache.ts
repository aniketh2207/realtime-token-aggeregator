import Redis from "ioredis";

const connectionUrl = process.env.REDIS_URL || "redis://localhost:6379";

const redisClient = new Redis(connectionUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redisClient.on("connect", () => {
  console.log("Successfully connected to redis server");
});

redisClient.on("error", (err) => {
  console.log("Could not connect to redis server:", err);
});

export default redisClient;
