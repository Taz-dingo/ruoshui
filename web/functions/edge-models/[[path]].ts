interface Env {
  RUOSHUI_MEDIA_PUBLIC_BASE_URL?: string;
}

const defaultMediaPublicBaseUrl =
  'https://pub-5fbf37dd49b94b859c13e343effd0430.r2.dev';

function buildMediaUrl(requestUrl: string, env: Env) {
  const sourceUrl = new URL(requestUrl);
  const targetUrl = new URL(
    sourceUrl.pathname.replace(/^\/edge-models/, '/models'),
    env.RUOSHUI_MEDIA_PUBLIC_BASE_URL ?? defaultMediaPublicBaseUrl
  );

  targetUrl.search = sourceUrl.search;
  return targetUrl;
}

async function proxyEdgeModel(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: {
        Allow: 'GET, HEAD'
      }
    });
  }

  const targetUrl = buildMediaUrl(request.url, env);
  const headers = new Headers(request.headers);

  headers.delete('host');
  headers.delete('origin');
  headers.set('x-ruoshui-pages-model-proxy', '1');

  const upstreamResponse = await fetch(
    new Request(targetUrl, {
      method: request.method,
      headers,
      redirect: 'follow'
    })
  );
  const responseHeaders = new Headers(upstreamResponse.headers);

  responseHeaders.set('x-ruoshui-edge', 'cloudflare-pages-model-proxy');
  responseHeaders.set('access-control-allow-origin', '*');

  if (!responseHeaders.has('cache-control')) {
    responseHeaders.set('cache-control', 'public, max-age=3600');
  }

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders
  });
}

export const onRequest = async (context: {
  env: Env;
  request: Request;
}): Promise<Response> => proxyEdgeModel(context.request, context.env);
