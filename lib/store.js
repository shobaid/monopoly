import { Redis } from "@upstash/redis";

let redis = null;
function getRedis() {
  if (redis) return redis;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN env vars. See README for setup."
    );
  }
  redis = new Redis({ url, token });
  return redis;
}

const TTL_SECONDS = 60 * 60 * 24; // 24h room expiry

export async function loadGame(roomId) {
  const r = getRedis();
  const data = await r.get(`monopoly:room:${roomId}`);
  if (!data) return null;
  return typeof data === "string" ? JSON.parse(data) : data;
}

export async function saveGame(game) {
  const r = getRedis();
  await r.set(`monopoly:room:${game.roomId}`, JSON.stringify(game), { ex: TTL_SECONDS });
}
