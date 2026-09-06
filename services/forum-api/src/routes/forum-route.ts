import { Hono } from "hono";
import {
  entityIdSchema,
  listForumPostsInputSchema,
  sceneIdSchema,
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
      deprecated: true,
      message: "Legacy forum compatibility is read-only. New public content uses Place / Story APIs.",
      data: {
        routes: [
          "GET /api/forum/scenes/:sceneId/bootstrap",
          "GET /api/forum/posts",
          "GET /api/forum/posts/:postId",
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
