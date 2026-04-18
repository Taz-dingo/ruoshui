import { Hono } from "hono";
import {
  confirmMediaAssetInputSchema,
  createForumPostInputSchema,
  createScenePinInputSchema,
  entityIdSchema,
  listForumPostsInputSchema,
  sceneIdSchema,
  upsertSceneInputSchema,
} from "@ruoshui/shared";

import type { ForumRepository } from "../lib/forum-repository.js";

interface CreateForumRouteOptions {
  forumRepository: ForumRepository;
}

function createForumRoute(options: CreateForumRouteOptions): Hono {
  const forumRoute = new Hono();

  forumRoute.get("/bootstrap", (context) =>
    context.json({
      ok: true,
      message: "论坛底座已接入数据库访问层；下一步可直接把前端打点与内容编辑接过来。",
      data: {
        routes: [
          "GET /api/forum/scenes/:sceneId/bootstrap",
          "GET /api/forum/posts",
          "GET /api/forum/posts/:postId",
          "PUT /api/forum/scenes/:sceneId",
          "POST /api/forum/posts",
          "POST /api/forum/pins",
          "POST /api/forum/media/confirm",
          "GET /api/forum/scenes/:sceneId/pins/:pinId/posts",
          "GET /api/forum/posts/:postId/pins",
        ],
      },
    }),
  );

  forumRoute.get("/scenes/:sceneId/bootstrap", async (context) => {
    const sceneId = sceneIdSchema.parse(context.req.param("sceneId"));
    const bootstrap = await options.forumRepository.getSceneBootstrap(sceneId);

    return context.json({
      ok: true,
      data: bootstrap,
    });
  });

  forumRoute.put("/scenes/:sceneId", async (context) => {
    const sceneId = sceneIdSchema.parse(context.req.param("sceneId"));
    const payload = await context.req.json();
    const scene = await options.forumRepository.upsertScene(
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

  forumRoute.get("/posts", async (context) => {
    const payload = listForumPostsInputSchema.parse({
      sceneId: context.req.query("sceneId"),
      pinId: context.req.query("pinId"),
      status: context.req.query("status"),
      limit: context.req.query("limit"),
    });
    const posts = await options.forumRepository.listForumPosts(payload);

    return context.json({
      ok: true,
      data: posts,
    });
  });

  forumRoute.get("/posts/:postId", async (context) => {
    const postId = entityIdSchema.parse(context.req.param("postId"));
    const post = await options.forumRepository.getForumPostDetail(postId);

    if (!post) {
      return context.json(
        {
          ok: false,
          error: "Post not found",
        },
        404,
      );
    }

    return context.json({
      ok: true,
      data: post,
    });
  });

  forumRoute.post("/posts", async (context) => {
    const payload = createForumPostInputSchema.parse(await context.req.json());
    const post = await options.forumRepository.createForumPost(payload);

    return context.json(
      {
        ok: true,
        data: post,
      },
      201,
    );
  });

  forumRoute.post("/media/confirm", async (context) => {
    const payload = confirmMediaAssetInputSchema.parse(await context.req.json());
    const mediaAsset = await options.forumRepository.confirmMediaAsset(payload);

    return context.json(
      {
        ok: true,
        data: mediaAsset,
      },
      201,
    );
  });

  forumRoute.post("/pins", async (context) => {
    const payload = createScenePinInputSchema.parse(await context.req.json());
    const pin = await options.forumRepository.createScenePin(payload);

    return context.json(
      {
        ok: true,
        data: pin,
      },
      201,
    );
  });

  forumRoute.get("/scenes/:sceneId/pins/:pinId/posts", async (context) => {
    const sceneId = sceneIdSchema.parse(context.req.param("sceneId"));
    const pinId = entityIdSchema.parse(context.req.param("pinId"));
    const posts = await options.forumRepository.listPostsForScenePin(sceneId, pinId);

    return context.json({
      ok: true,
      data: posts,
    });
  });

  forumRoute.get("/posts/:postId/pins", async (context) => {
    const postId = entityIdSchema.parse(context.req.param("postId"));
    const pins = await options.forumRepository.listPinsForPost(postId);

    return context.json({
      ok: true,
      data: pins,
    });
  });

  return forumRoute;
}

export { createForumRoute };
