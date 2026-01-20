import { getCache, setCache } from "./kvCache.ts";
import {
  isRunningSandbox,
  SERVER_APP_ENTRYPOINT,
  SERVER_APP_SANDBOX_OPTIONS,
  startServerAppSandbox,
} from "./sandboxImagemagick.ts";

export type SandboxConnectInfo = {
  publicUrl: string;
  passPhrase: string;
};

export type SandboxRequestState = {
  server_app_public_url: string;
  server_app_pass_phrase: string;
};

async function refreshSandbox(): Promise<SandboxConnectInfo> {
  const passPhrase = crypto.randomUUID();
  await setCache("server_app_path_phrase", passPhrase, 600_000);

  const { publicUrl, sandboxId } = await startServerAppSandbox(
    SERVER_APP_ENTRYPOINT,
    { ...SERVER_APP_SANDBOX_OPTIONS, env: { CALLER_PASSPHRASE: passPhrase } },
  );

  await setCache("server_app_public_url", publicUrl, 600_000);
  await setCache("server_app_sandbox_id", sandboxId, 600_000);

  return { publicUrl, passPhrase };
}

export async function ensureServerAppReady(): Promise<SandboxConnectInfo> {
  const cachedUrl = await getCache<string>("server_app_public_url");
  const cachedId = await getCache<string>("server_app_sandbox_id");
  const cachedPass = await getCache<string>("server_app_path_phrase");

  if (cachedUrl && cachedId && cachedPass && await isRunningSandbox(cachedId)) {
    return { publicUrl: cachedUrl, passPhrase: cachedPass };
  }

  return refreshSandbox();
}

export async function fetchSandboxApi(
  state: SandboxRequestState,
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-App-Header", state.server_app_pass_phrase);
  headers.set("accept", "application/json");

  let body: BodyInit | undefined = init.body ?? undefined;

  if (init.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(init.json);
  }

  return await fetch(`${state.server_app_public_url}${path}`, {
    ...init,
    headers,
    body,
  });
}
