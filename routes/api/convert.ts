import { define } from "../../utils.ts";
import { errorResponse } from "../../libs/http.ts";
import {
  ensureServerAppReady,
  fetchSandboxApi,
} from "../../libs/connectSandboxImagemagick.ts";

export const handler = define.handlers({
  async POST(ctx) {
    const form = await ctx.req.formData();
    const file = form.get("file");
    const options = form.get("options");

    if (!(file instanceof File)) {
      return errorResponse("file is required", 400);
    }

    const { publicUrl, passPhrase } = ctx.state.server_app_public_url
      ? {
        publicUrl: ctx.state.server_app_public_url,
        passPhrase: ctx.state.server_app_pass_phrase,
      }
      : await ensureServerAppReady();

    const forwardForm = new FormData();
    forwardForm.append("file", file);
    if (typeof options === "string" && options.trim().length > 0) {
      forwardForm.append("options", options.trim());
    }

    const resp = await fetchSandboxApi(
      {
        server_app_pass_phrase: passPhrase,
        server_app_public_url: publicUrl,
      },
      "/convert",
      { method: "POST", body: forwardForm },
    );

    if (!resp.ok) {
      const message = await resp.text();
      return errorResponse(message || "convert failed", 502);
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
