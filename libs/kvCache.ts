/// <reference lib="deno.unstable" />

const CACHE_KEY = "kvCache" as const;

// Use persistent KV only for prod; in-memory for all other environments (dev, test, etc.).
const store = Deno.env.get("APP_ENV") === "prod"
  ? await Deno.openKv()
  : await Deno.openKv("tmp/memory");

export function getCacheKey(key: string): string[] {
  return [CACHE_KEY, key];
}

export async function setCache<T>(
  id: string,
  content: T | string | string[],
  expireIn = 120,
): Promise<void> {
  const key = getCacheKey(id);
  await store.set(key, content, { expireIn });
}

export async function getCache<T>(id: string): Promise<T | null> {
  const key = getCacheKey(id);
  const val = await store.get<T>(key);
  return (val.value ?? null) as T | null;
}

export async function deleteCache(id: string): Promise<void> {
  const key = getCacheKey(id);
  await store.delete(key);
}

export async function fetchCache<T>(
  key: string,
  expireIn = 120,
  func: () => Promise<T | null>,
): Promise<T | null> {
  let res = await getCache<T | string[] | string>(key);

  if (!res) {
    res = await func();
    if (res == null) {
      return null;
    }
    await setCache(key, res, expireIn);
  }
  return res as T;
}
