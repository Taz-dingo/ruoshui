interface Env {
  FORUM_API_ORIGIN?: string;
}

const defaultForumApiOrigin = 'https://ruoshui-forum-api.tazdingo-ruoshui.workers.dev';

async function proxyForumApi(request: Request, env: Env): Promise<Response> {
  const sourceUrl = new URL(request.url);
  const targetUrl = new URL(
    `${sourceUrl.pathname}${sourceUrl.search}`,
    env.FORUM_API_ORIGIN ?? defaultForumApiOrigin
  );
  const headers = new Headers(request.headers);

  headers.set('x-ruoshui-pages-proxy', '1');
  headers.delete('host');

  const proxiedRequest = new Request(targetUrl, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    redirect: 'follow',
  });
  const response = await fetch(proxiedRequest);
  const responseHeaders = new Headers(response.headers);

  responseHeaders.set('x-ruoshui-edge', 'cloudflare-pages');

  return new Response(response.body, {
    headers: responseHeaders,
    status: response.status,
    statusText: response.statusText,
  });
}

export const onRequest = async (context: {
  env: Env;
  request: Request;
}): Promise<Response> => proxyForumApi(context.request, context.env);
