import { define } from "../../utils.ts";
import { getCache, setCache } from "../../libs/kvCache.ts";
import { isRunningSandbox, SERVER_APP_ENTRYPOINT, SERVER_APP_SANDBOX_OPTIONS, startServerAppSandbox } from "../../libs/sandboxImagemagick.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const file = form.get("file");
    const options = form.get("options");

    if (!(file instanceof File)) {
      return new Response(
        JSON.stringify({ error: "file is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log("Received file:", file.name, file.type, file.size);

    // 変換先サーバーのURLをKVから取得
    let target = await getCache<string>("server_app_public_url");
    if(target == null) {
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
        target = publicUrl;
        await setCache("server_app_public_url", publicUrl, 600);
        await setCache("server_app_sandbox_id", sandboxId, 600);
      }
    }
    
    console.log("Forwarding to target:", target);

    //const passphrase = Deno.env.get("CALLER_PASSPHRASE");
    const passphrase = await getCache<string>("server_app_path_phrase")
    if (!passphrase) {
      return new Response(
        JSON.stringify({ error: "missing CALLER_PASSPHRASE" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const forwardForm = new FormData();
    forwardForm.append("file", file);
    if (typeof options === "string" && options.trim().length > 0) {
      forwardForm.append("options", options.trim());
    }

    console.log("do request")
    const resp = await fetch(`${target}/convert`, {
      method: "POST",
      body: forwardForm,
      headers: {
        "X-App-Header": passphrase,
      },
    });

    if (!resp.ok) {
      const message = await resp.text();
      return new Response(
        JSON.stringify({ error: message || "convert failed" }),
        { status: 502, headers: { "Content-Type": "application/json" } },
      );
    }

    // Blobをそのまま返却
    const resultBlob = await resp.blob();
    const arrayBuffer = await resultBlob.arrayBuffer();
    const contentType = resultBlob.type || "application/octet-stream";

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline; filename=converted.png",
      },
    });
  },
});
