import { Hono } from "hono";
import {
  createForumPostInputSchema,
  createScenePinInputSchema,
  sceneIdSchema,
  upsertSceneInputSchema,
} from "@ruoshui/shared";

import {
  createForumPost,
  createScenePin,
  getSceneBootstrap,
  upsertScene,
} from "../db/forum-repository.js";

const forumRoute = new Hono();

forumRoute.get("/bootstrap", (context) =>
  context.json({
    ok: true,
    message: "论坛底座已接入数据库访问层；下一步可直接把前端打点与内容编辑接过来。",
    data: {
      routes: [
        "GET /api/forum/scenes/:sceneId/bootstrap",
        "PUT /api/forum/scenes/:sceneId",
        "POST /api/forum/posts",
        "POST /api/forum/pins",
      ],
    },
  }),
);

forumRoute.get("/scenes/:sceneId/bootstrap", async (context) => {
  const sceneId = sceneIdSchema.parse(context.req.param("sceneId"));
  const bootstrap = await getSceneBootstrap(sceneId);

  return context.json({
    ok: true,
    data: bootstrap,
  });
});

forumRoute.put("/scenes/:sceneId", async (context) => {
  const sceneId = sceneIdSchema.parse(context.req.param("sceneId"));
  const payload = await context.req.json();
  const scene = await upsertScene(
    upsertSceneInputSchema.parse({
      ...payload,
      id: sceneId,
    }),
  );

  return context.json({
    ok: true,
    data: scene,
  });
});

forumRoute.post("/posts", async (context) => {
  const payload = createForumPostInputSchema.parse(await context.req.json());
  const post = await createForumPost(payload);

  return context.json(
    {
      ok: true,
      data: post,
    },
    201,
  );
});

forumRoute.post("/pins", async (context) => {
  const payload = createScenePinInputSchema.parse(await context.req.json());
  const pin = await createScenePin(payload);

  return context.json(
    {
      ok: true,
      data: pin,
    },
    201,
  );
});

export { forumRoute };
