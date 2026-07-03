import type {
  ForumPostDetail,
  ScenePin
} from '@ruoshui/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchPostsForScenePin,
  fetchSceneBootstrap
} from '../../community/api';
import type { ViewerHighlight } from '../../content/types';
import {
  requestCaptureHighlightPoint,
  requestPresetSelection
} from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { cn } from '../../utils/cn';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface HighlightLayerProps {
  highlights: ViewerHighlight[];
  onOpenFullCommunity?: () => void;
  sceneId: string;
}

function HighlightLayer({
  highlights,
  onOpenFullCommunity,
  sceneId
}: HighlightLayerProps) {
  const [activeHighlightId, setActiveHighlightId] = useState<string | null>(null);
  const [communityState, setCommunityState] = useState<{
    errorMessage: string | null;
    highlightId: string | null;
    isLoading: boolean;
    pinTitle: string | null;
    posts: ForumPostDetail[];
  }>({
    errorMessage: null,
    highlightId: null,
    isLoading: false,
    pinTitle: null,
    posts: []
  });
  const communityRequestIdRef = useRef(0);
  const highlightAuthoring = useViewerUiStore((store) => store.highlightAuthoring);
  const highlightOverlay = useViewerUiStore((store) => store.highlightOverlay);

  const highlightMap = useMemo(
    () => new Map(highlights.map((highlight) => [highlight.id, highlight])),
    [highlights]
  );
  const activeHighlight = activeHighlightId
    ? highlightMap.get(activeHighlightId) ?? null
    : null;

  useEffect(() => {
    if (activeHighlightId && !highlightMap.has(activeHighlightId)) {
      setActiveHighlightId(null);
    }
  }, [activeHighlightId, highlightMap, highlights]);

  useEffect(() => {
    if (activeHighlightId === communityState.highlightId) {
      return;
    }

    communityRequestIdRef.current += 1;
    setCommunityState({
      errorMessage: null,
      highlightId: null,
      isLoading: false,
      pinTitle: null,
      posts: []
    });
  }, [activeHighlightId, communityState.highlightId]);

  if (highlights.length === 0 && !highlightAuthoring.isEnabled && !activeHighlight) {
    return null;
  }

  const isCommunityExpanded = activeHighlightId !== null && communityState.highlightId === activeHighlightId;

  async function openHighlightCommunity(highlight: ViewerHighlight) {
    if (communityState.highlightId === highlight.id) {
      communityRequestIdRef.current += 1;
      setCommunityState({
        errorMessage: null,
        highlightId: null,
        isLoading: false,
        pinTitle: null,
        posts: []
      });
      return;
    }

    const requestId = communityRequestIdRef.current + 1;
    communityRequestIdRef.current = requestId;
    setCommunityState({
      errorMessage: null,
      highlightId: highlight.id,
      isLoading: true,
      pinTitle: highlight.communityPinTitle ?? highlight.title,
      posts: []
    });

    try {
      const bootstrap = await fetchSceneBootstrap(sceneId);
      const resolvedPin = resolveHighlightPin(
        bootstrap.pins,
        highlight.communityPinId ?? null,
        highlight.communityPinTitle ?? highlight.title
      );
      const posts = resolvedPin
        ? await fetchPostsForScenePin(sceneId, resolvedPin.id)
        : [];

      if (communityRequestIdRef.current !== requestId) {
        return;
      }

      setCommunityState({
        errorMessage: null,
        highlightId: highlight.id,
        isLoading: false,
        pinTitle: resolvedPin?.title ?? highlight.communityPinTitle ?? highlight.title,
        posts
      });
    } catch (error) {
      if (communityRequestIdRef.current !== requestId) {
        return;
      }

      setCommunityState({
        errorMessage:
          error instanceof Error
            ? error.message
            : '点位图文加载失败了，稍后再试一次。',
        highlightId: highlight.id,
        isLoading: false,
        pinTitle: highlight.communityPinTitle ?? highlight.title,
        posts: []
      });
    }
  }

  return (
    <div
      className={cn(
        'absolute inset-0 z-[2] pointer-events-none',
        highlightAuthoring.isEnabled && 'pointer-events-auto'
      )}
      aria-label="三维点位"
    >
      {highlightAuthoring.isEnabled ? (
        <div
          className="absolute inset-0 cursor-crosshair pointer-events-auto"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            requestCaptureHighlightPoint(event.clientX, event.clientY);
          }}
          role="presentation"
        >
          <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-brand/26 bg-surface/78 px-3 py-1.5 text-[11px] uppercase tracking-[0.08em] text-ink/92 backdrop-blur-[12px]">
            点击场景记录近似落点
          </div>
        </div>
      ) : null}

      {highlightAuthoring.isEnabled && highlightAuthoring.previewVisible ? (
        <div
          className="pointer-events-none absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-brand-strong/38 bg-[rgba(35,52,24,0.72)] px-2.5 py-1.5 text-ink/96 backdrop-blur-[12px]"
          style={{
            transform: `translate3d(${highlightAuthoring.previewLeft}px, ${highlightAuthoring.previewTop}px, 0)`
          }}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d7efad] shadow-[0_0_0_6px_rgba(199,227,158,0.16)]" aria-hidden="true" />
          <span className="text-[11px] font-semibold">预览点</span>
        </div>
      ) : null}

      {highlightOverlay.items.map((item) => (
        <button
          key={item.id}
          className={cn(
            'pointer-events-auto absolute inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-outline/18 bg-[rgba(37,28,23,0.22)] px-2.5 py-1.5 text-left text-ink transition-[opacity,background-color,border-color,backdrop-filter] duration-180 ease-out backdrop-blur-[0px] hover:border-brand/42 hover:bg-surface/76 hover:backdrop-blur-[12px] focus-visible:border-brand/42 focus-visible:bg-surface/76 focus-visible:backdrop-blur-[12px]',
            item.id === activeHighlightId && 'border-brand/42 bg-surface/76 backdrop-blur-[12px]',
            (!item.isVisible || highlightAuthoring.isEnabled) && 'pointer-events-none opacity-0'
          )}
          type="button"
          style={{
            transform: `translate3d(${item.left}px, ${item.top}px, 0)`
          }}
          onClick={() => {
            setActiveHighlightId(item.id);
            const highlight = highlightMap.get(item.id);
            if (highlight?.presetId) {
              requestPresetSelection(highlight.presetId);
            }
          }}
        >
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand shadow-[0_0_0_6px_rgba(168,201,125,0.12)]" aria-hidden="true" />
          <span className="text-[11px] font-semibold text-ink/94">{item.name}</span>
        </button>
      ))}

      {activeHighlight && !highlightAuthoring.isEnabled ? (
        <aside
          aria-live="polite"
          className={cn(
            'pointer-events-auto absolute top-[calc(12.8rem+var(--safe-top))] right-[calc(0.9rem+var(--safe-right))] z-[4] flex max-h-[calc(var(--app-height)-14.1rem)] flex-col overflow-hidden',
            'max-[760px]:top-auto max-[760px]:right-auto max-[760px]:bottom-[calc(4.85rem+var(--safe-bottom))] max-[760px]:left-1/2 max-[760px]:max-h-none max-[760px]:-translate-x-1/2',
            isCommunityExpanded
              ? 'w-[min(620px,calc(100vw-2rem))] max-[760px]:w-[calc(100vw-1.5rem)]'
              : 'w-[min(420px,calc(100vw-2rem))] max-[760px]:w-[calc(100vw-1.5rem)]'
          )}
        >
          {activeHighlight.imageUrl ? (
            <img
              className="block h-44 w-full object-cover bg-ink/6"
              src={activeHighlight.imageUrl}
              alt={activeHighlight.imageAlt ?? activeHighlight.title}
            />
          ) : null}
          <Card className="h-full">
            <CardContent className="grid gap-4 p-4">
              <CardHeader className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-brand-strong/78">场景点位</span>
                  <CardTitle>{activeHighlight.title}</CardTitle>
                </div>
                <Button
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-transparent text-[20px] leading-none text-ink-muted/72 transition-colors duration-180 ease-out hover:border-outline/16 hover:bg-ink/4 hover:text-ink"
                  onClick={() => setActiveHighlightId(null)}
                  aria-label="关闭点位卡片"
                  variant="ghost"
                >
                  ×
                </Button>
              </CardHeader>
              <CardDescription>{activeHighlight.body}</CardDescription>
              {isCommunityExpanded ? (
                <section className="grid gap-3 rounded-[22px] border border-brand/16 bg-ink/3 px-3.5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="m-0 text-[10px] uppercase tracking-[0.16em] text-brand-strong/78">
                        点位图文
                      </p>
                      <h3 className="mt-2 mb-0 text-[20px] leading-[1.12] tracking-[-0.04em] text-ink">
                        {communityState.pinTitle ?? activeHighlight.communityPinTitle ?? activeHighlight.title}
                      </h3>
                    </div>
                    {onOpenFullCommunity ? (
                      <Button
                        className="shrink-0"
                        onClick={onOpenFullCommunity}
                        variant="secondary"
                      >
                        完整社区
                      </Button>
                    ) : null}
                  </div>

                  {communityState.isLoading ? (
                    <p className="m-0 text-[13px] leading-[1.65] text-ink-muted/72">
                      正在把这个点位的图文拉过来。
                    </p>
                  ) : communityState.errorMessage ? (
                    <p className="m-0 rounded-[18px] border border-[rgba(232,168,160,0.22)] bg-[rgba(95,45,39,0.18)] px-3 py-3 text-[13px] leading-[1.65] text-[#f1c9c1]">
                      {communityState.errorMessage}
                    </p>
                  ) : communityState.posts.length > 0 ? (
                    <div className="grid gap-3">
                      {communityState.posts.slice(0, 3).map((post) => (
                        <article
                          className="grid gap-2 rounded-[18px] border border-outline/16 bg-surface/58 px-3 py-3"
                          key={post.id}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="m-0 text-[16px] leading-[1.2] tracking-[-0.03em] text-ink">
                                {post.title}
                              </h4>
                              <p className="mt-2 mb-0 text-[12px] leading-[1.6] text-ink-muted/68">
                                {getPostPreview(post)}
                              </p>
                            </div>
                            <span className="shrink-0 text-[11px] text-ink-muted/52">
                              {formatPostDate(post.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted/56">
                            <span>{post.mediaAssets.length} 图</span>
                            <span>{getPostReadTime(post.body)} 分钟</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-2 rounded-[18px] border border-outline/16 bg-surface/58 px-3 py-3">
                      <p className="m-0 text-[16px] leading-[1.2] tracking-[-0.03em] text-ink">
                        这个点位还没有图文
                      </p>
                      <p className="m-0 text-[13px] leading-[1.65] text-ink-muted/68">
                        等这个点位对应的社区内容补上后，就会直接贴在这张点位卡里一起看。
                      </p>
                    </div>
                  )}
                </section>
              ) : null}
              <CardFooter className="flex flex-wrap justify-start gap-2">
                <Button
                  onClick={() => requestPresetSelection(activeHighlight.presetId)}
                  variant="tertiary"
                >
                  飞到这里
                </Button>
                <Button
                  onClick={() => void openHighlightCommunity(activeHighlight)}
                  variant="secondary"
                >
                  {isCommunityExpanded ? '收起图文' : '看点位图文'}
                </Button>
                {isCommunityExpanded && onOpenFullCommunity ? (
                  <Button
                    onClick={onOpenFullCommunity}
                    variant="secondary"
                  >
                    进入完整社区
                  </Button>
                ) : null}
              </CardFooter>
            </CardContent>
          </Card>
        </aside>
      ) : null}
    </div>
  );
}

function formatPostDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric'
  }).format(date);
}

function getPostPreview(post: ForumPostDetail) {
  const source = (post.excerpt ?? post.body).replace(/\s+/g, ' ').trim();
  if (source.length <= 68) {
    return source;
  }

  return `${source.slice(0, 68)}…`;
}

function getPostReadTime(body: string) {
  return Math.max(1, Math.ceil(body.replace(/\s+/g, '').length / 180));
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function resolveHighlightPin(
  pinList: ScenePin[],
  preferredPinId: string | null,
  preferredPinTitle: string
) {
  if (preferredPinId) {
    const exactPinIdMatch = pinList.find((pin) => pin.id === preferredPinId) ?? null;
    if (exactPinIdMatch) {
      return exactPinIdMatch;
    }
  }

  const normalizedTitle = normalizeText(preferredPinTitle);
  const exactMatch =
    pinList.find((pin) => normalizeText(pin.title) === normalizedTitle) ?? null;
  if (exactMatch) {
    return exactMatch;
  }

  return (
    pinList.find((pin) => normalizeText(pin.title).includes(normalizedTitle)) ?? null
  );
}

export {
  HighlightLayer
};
