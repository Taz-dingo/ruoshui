import { serve } from "@hono/node-server";

import { createApp } from "./app.js";
import { checkDatabaseConnection } from "./db/client.js";
import {
  getForumPostDetail,
  getSceneBootstrap,
  listForumPosts,
  listPinsForPost,
  listPostsForScenePin,
} from "./db/forum-repository.js";
import { env } from "./env.js";
import {
  createAliOssStorageProvider,
  createNoopStorageProvider,
} from "./lib/storage.js";

const app = createApp({
  corsOrigin: env.CORS_ORIGIN,
  forumRepository: {
    checkConnection: checkDatabaseConnection,
    getForumPostDetail,
    getSceneBootstrap,
    listForumPosts,
    listPinsForPost,
    listPostsForScenePin,
  },
  runtime: "node",
  storageProvider:
    env.OSS_PROVIDER === "alioss"
      ? createAliOssStorageProvider({
          publicBaseUrl: env.OSS_PUBLIC_BASE_URL,
        })
      : createNoopStorageProvider(),
});

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
