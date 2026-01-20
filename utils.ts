import { createDefine } from "fresh";

// This specifies the type of "ctx.state" which is used to share
// data among middlewares, layouts and routes.
export interface State {
  server_app_public_url: string;
  server_app_pass_phrase: string;
}

export const define = createDefine<State>();
