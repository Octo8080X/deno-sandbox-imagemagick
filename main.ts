import { App, staticFiles } from "fresh";
import { type State } from "./utils.ts";
import { ensureServerAppReady } from "./libs/connectSandboxImagemagick.ts";

export const app = new App<State>();

app.use(staticFiles());

// Ensure sandbox server is running and share connection info via state.
app.use(async (ctx) => {
  const { publicUrl, passPhrase } = await ensureServerAppReady();
  ctx.state.server_app_public_url = publicUrl;
  ctx.state.server_app_pass_phrase = passPhrase;
  return ctx.next();
});

// Include file-system based routes here
app.fsRoutes();
