import { App, cors, csrf, staticFiles } from "fresh";
import { type State } from "./utils.ts";
import { ensureServerAppReady } from "./libs/connectSandboxImagemagick.ts";

const APP_ORIGIN = Deno.env.get("APP_ORIGIN");
if (!APP_ORIGIN) {
  throw new Error("APP_ORIGIN environment variable is required");
}

export const app = new App<State>();

app.use(staticFiles());

// CORS / CSRF guard similar to memo reference.
app.use(csrf({ origin: APP_ORIGIN }));
app.use(cors({
  origin: APP_ORIGIN,
  allowMethods: ["POST", "GET", "PUT"],
  credentials: Deno.env.get("APP_ENV") === "prod" ? false : true,
}));

// Ensure sandbox server is running and share connection info via state.
app.use(async (ctx) => {
  const { publicUrl, passPhrase } = await ensureServerAppReady();
  ctx.state.server_app_public_url = publicUrl;
  ctx.state.server_app_pass_phrase = passPhrase;
  return ctx.next();
});

// Include file-system based routes here
app.fsRoutes();
