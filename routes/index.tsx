import { define } from "../utils.ts";
import ImageConvert from "../islands/ImageConvert.tsx";
import { isRunningSandbox, SERVER_APP_ENTRYPOINT, SERVER_APP_SANDBOX_OPTIONS, startServerAppSandbox } from "../libs/sandboxImagemagick.ts";
import { fetchCache, getCache, setCache } from "../libs/kvCache.ts";

export default define.page(async function Home() {

  console.log(await getCache("server_app_public_url"));

  if(await getCache("server_app_public_url") == null) {
    const sandboxId = await getCache<string>("server_app_sandbox_id");
    if(sandboxId == null || !await isRunningSandbox(sandboxId)){
      const pathPhrase = crypto.randomUUID();
      await setCache("server_app_path_phrase", pathPhrase, 600);

      console.log("Starting server app sandbox...");
      const {publicUrl, sandboxId} =  await startServerAppSandbox(
        SERVER_APP_ENTRYPOINT,
        {...SERVER_APP_SANDBOX_OPTIONS, env: { CALLER_PASSPHRASE: pathPhrase } }
      )
      console.log("serverAppPublicUrl:", publicUrl);
      await setCache("server_app_public_url", publicUrl, 600);
      await setCache("server_app_sandbox_id", sandboxId, 600);
    }
  }

  return (
    <div class="bg-base-200 items-start justify-center">
      <div class="hero-content flex-col items-center w-full pt-10">
        <ImageConvert />
      </div>
    </div>
  );
});
