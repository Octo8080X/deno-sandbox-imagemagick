import { Hono } from "@hono/hono";

const HEADER_KEY = "X-App-Header";
const PASSPHRASE_ENV = "CALLER_PASSPHRASE"; // 呼び出し元パスフレーズを格納

const app = new Hono();

function validateCaller(c: any) {
  const expected = Deno.env.get(PASSPHRASE_ENV);
  if (!expected) {
    return c.text("Server misconfigured: missing passphrase", 500);
  }

  const received = c.req.header(HEADER_KEY);
  if (!received || received !== expected) {
    return c.text("Forbidden", 403);
  }

  return null;
}

app.get("/", (c) => {
  const res = validateCaller(c);
  if (res) return res;

  return c.text("Hello, Hono! from Deno Sandbox");
});

app.post("/convert", async (c) => {
  const res = validateCaller(c);
  if (res) return res;

  // multipart からファイルを取得
  const form = await c.req.formData();
  const file = form.get("file");
  const options = typeof form.get("options") === "string"
    ? (form.get("options") as string)
    : "";

  if (!(file instanceof File)) {
    return c.text("No file provided", 400);
  }

  const inputSuffix = (() => {
    if (file.type.includes("png")) return ".png";
    if (file.type.includes("jpeg") || file.type.includes("jpg")) return ".jpg";
    if (file.type.includes("webp")) return ".webp";
    const name = file.name.toLowerCase();
    if (name.endsWith(".png")) return ".png";
    if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return ".jpg";
    if (name.endsWith(".webp")) return ".webp";
    return ".bin";
  })();

  const inputPath = await Deno.makeTempFile({ prefix: "in-", suffix: inputSuffix });
  const outputPath = await Deno.makeTempFile({ prefix: "out-", suffix: ".png" });

  try {
    await Deno.writeFile(inputPath, new Uint8Array(await file.arrayBuffer()));

    // ImageMagick convert: user-provided options followed by png output
    let convertSuccess = true;
    let convertError = "";

    if (options.trim().length == 0) {
      return c.text(`convert failed: no options`, 500);
    }

    const optionArgs = options.trim().split(/\s+/);
    const convert = new Deno.Command("/data/imagemagick/magick", {
      args: [inputPath, ...optionArgs, outputPath],
    });
    const { success, stderr } = await convert.output();
    convertSuccess = success;
    convertError = new TextDecoder().decode(stderr);
    
    if (!convertSuccess) {
      return c.text(`convert failed: ${convertError}`, 500);
    }

    if (!success) {
      const msg = new TextDecoder().decode(stderr);
      return c.text(`convert failed: ${msg}`, 500);
    }

    const converted = await Deno.readFile(outputPath);
    return new Response(converted, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": "inline; filename=converted.png",
      },
    });
  } catch (_error) {
    return c.text(`Error processing file`, 500);
  }
});

Deno.serve({ port: 3000 }, app.fetch);