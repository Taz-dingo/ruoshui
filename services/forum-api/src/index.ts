import { serve } from "@hono/node-server";

import { app } from "./app.js";
import { env } from "./env.js";

const server = serve(
  {
    fetch: app.fetch,
    port: env.PORT,
  },
  (info) => {
    console.log(`forum-api running at http://localhost:${info.port}`);
  },
);

export { server };
