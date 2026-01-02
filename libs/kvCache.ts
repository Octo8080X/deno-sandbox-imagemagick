//// <reference lib="deno.unstable" />
const CACHE_KEY = `kvCache` as const;

const store = await Deno.openKv(":memory:");

export async function getCacheKey(key: string): Promise<string[]> {
  const parentKey = await store.get(["KV_CACHE_PARENT_KEY"]);
  if (parentKey!== null && parentKey.value != null) {
    return [parentKey.value, CACHE_KEY, key];
  }
  const parentKeyValue = crypto.randomUUID();
  await store.set(["KV_CACHE_PARENT_KEY"], parentKeyValue, { expireIn: 600 });
  return [parentKeyValue, CACHE_KEY, key];
}
export async function setCache<T>(
  id: string,
  content: T | string | string[],
  expireIn: number = 120,
): Promise<void> {
  const key = await getCacheKey(id);
  await store.set(key, content, { expireIn });
}

export async function getCache<T>(id: string): Promise<T | null> {
  const key = await getCacheKey(id);
  const val = await store.get<string>(key);

  return val.value ?? null;
}

export async function fetchCache<T>(
  key: string,
  expireIn: number = 120,
  func: () => Promise<T | null>,
) {
  console.log("fetchCache key:", key);
  let res = await getCache<T | string[] | string>(key);
  console.log("fetchCache res:", res);

  if (!res) {
    res = await func();
    if (res == null) {
      return null;
    }
    await setCache(key, res, expireIn);
  }
  return res;
}
