import { Hono } from "hono";

const forumRoute = new Hono();

forumRoute.get("/bootstrap", (context) =>
  context.json({
    ok: true,
    message: "论坛底座已就位，下一步接数据库查询与真实内容。",
    data: {
      scenes: [],
      pins: [],
      posts: [],
    },
  }),
);

export { forumRoute };
