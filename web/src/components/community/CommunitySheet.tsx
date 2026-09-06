import type { Place, PublishedStory } from '@ruoshui/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchPlaces,
  fetchPublishedStories,
  getPublishedStoryMediaUrl,
} from '../../community/content-api';
import { scrollAreaClassNames } from '../../styles/system';
import { requestFocusSpatialAnchor } from '../../ui/commands/viewer-command-bus';
import { cn } from '../../utils/cn';
import { Sheet, SheetContent } from '../ui/sheet';
import { StoryDiscussion } from './StoryDiscussion';

interface CommunitySheetProps {
  isMobile: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sceneAssetUrl?: string;
  sceneId: string;
  scenePreviewImage?: string;
  sceneSummary: string;
  sceneTitle: string;
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

function fallbackAuthorName(story: PublishedStory) {
  return story.author.displayName ?? `若水用户 ${story.author.id.slice(-4).toUpperCase()}`;
}

function storyDisplayTitle(story: PublishedStory) {
  if (story.title?.trim()) return story.title.trim();
  if (story.body?.trim()) {
    const compact = story.body.replace(/\s+/g, ' ').trim();
    return compact.length > 30 ? `${compact.slice(0, 30)}…` : compact;
  }
  if (story.memoryTime) return story.memoryTime;
  return '一段校园记忆';
}

function storyTextCover(story: PublishedStory) {
  const source =
    story.title?.trim() ||
    story.body?.replace(/\s+/g, ' ').trim() ||
    story.memoryTime ||
    '留在这里的一段记忆';
  return source.length > 46 ? `${source.slice(0, 46)}…` : source;
}

function formatPublishedTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function placeLabel(story: PublishedStory, placesById: Map<string, Place>) {
  if (story.location.kind === 'place') {
    return placesById.get(story.location.placeId)?.name ?? '校园地点';
  }
  if (story.location.kind === 'anchor') return '校园里的一个角落';
  return '若水广场';
}

function canReturnToStory(story: PublishedStory, placesById: Map<string, Place>) {
  if (story.location.kind === 'anchor') return true;
  if (story.location.kind === 'place') return placesById.has(story.location.placeId);
  return false;
}

function focusStoryLocation(story: PublishedStory, placesById: Map<string, Place>) {
  const anchor =
    story.location.kind === 'anchor'
      ? story.location.anchor
      : story.location.kind === 'place'
        ? placesById.get(story.location.placeId)?.anchor
        : undefined;
  if (!anchor) return false;

  requestFocusSpatialAnchor({
    title: placeLabel(story, placesById),
    position: [
      anchor.cameraPose.position.x,
      anchor.cameraPose.position.y,
      anchor.cameraPose.position.z,
    ],
    target: [
      anchor.cameraPose.target.x,
      anchor.cameraPose.target.y,
      anchor.cameraPose.target.z,
    ],
    ...(anchor.cameraPose.fovDeg ? { fovDeg: anchor.cameraPose.fovDeg } : {}),
    ambientFocus: true,
  });
  return true;
}

function StoryCard({ story, onOpen }: { story: PublishedStory; onOpen: () => void }) {
  const firstMediaId = story.mediaAssetIds[0];

  return (
    <button
      className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-[18px] bg-white text-left shadow-[0_8px_30px_rgba(30,31,27,0.06)] ring-1 ring-black/[0.045] transition-transform duration-180 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8c97d]"
      onClick={onOpen}
      type="button"
    >
      {firstMediaId ? (
        <img
          alt={storyDisplayTitle(story)}
          className="block aspect-[4/5] w-full bg-black/5 object-cover"
          loading="lazy"
          src={getPublishedStoryMediaUrl(story.id, firstMediaId)}
        />
      ) : (
        <div className="grid aspect-[4/5] place-items-center bg-[#eef0e8] px-5 text-center">
          <p className="m-0 text-[15px] font-medium leading-[1.75] tracking-[-0.02em] text-[#2c3328]">
            {storyTextCover(story)}
          </p>
        </div>
      )}
      <div className="px-3.5 pb-3.5 pt-3">
        <div className="line-clamp-2 text-[13px] font-semibold leading-[1.5] tracking-[-0.02em] text-[#20221f]">
          {storyDisplayTitle(story)}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-black/38">
          <span className="truncate">{fallbackAuthorName(story)}</span>
          {story.memoryTime ? <span className="shrink-0">{story.memoryTime}</span> : null}
        </div>
      </div>
    </button>
  );
}

function StoryDetail({
  onBack,
  onReturnToScene,
  placesById,
  story,
}: {
  onBack: () => void;
  onReturnToScene: () => void;
  placesById: Map<string, Place>;
  story: PublishedStory;
}) {
  const locationName = placeLabel(story, placesById);
  const canReturn = canReturnToStory(story, placesById);

  return (
    <div className="min-h-full bg-[#f7f7f3]">
      <div className="sticky top-0 z-[3] flex h-[54px] items-center justify-between gap-2 border-b border-black/[0.055] bg-[#f7f7f3]/94 px-4 backdrop-blur-[18px]">
        <button
          className="shrink-0 rounded-full px-2 py-1 text-[13px] text-black/60 hover:bg-black/5"
          onClick={onBack}
          type="button"
        >
          ‹ 全部故事
        </button>
        <div className="min-w-0 flex-1 truncate text-center text-[12px] font-medium text-black/52">
          {locationName}
        </div>
        {canReturn ? (
          <button
            className="shrink-0 rounded-full border border-black/8 bg-white px-3 py-1.5 text-[11px] font-medium text-black/62"
            onClick={onReturnToScene}
            type="button"
          >
            回到这里
          </button>
        ) : (
          <span className="w-[74px] shrink-0" aria-hidden="true" />
        )}
      </div>

      {story.mediaAssetIds.length > 0 ? (
        <div className="flex snap-x snap-mandatory overflow-x-auto bg-[#e8e8e3] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {story.mediaAssetIds.map((mediaAssetId, index) => (
            <div className="w-full shrink-0 snap-center" key={mediaAssetId}>
              <img
                alt={`${storyDisplayTitle(story)} · ${index + 1}`}
                className="block max-h-[62vh] min-h-[280px] w-full object-contain"
                loading={index > 1 ? 'lazy' : 'eager'}
                src={getPublishedStoryMediaUrl(story.id, mediaAssetId)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-[270px] place-items-center bg-[#edf0e6] px-8 text-center">
          <p className="m-0 max-w-[320px] text-[22px] font-medium leading-[1.7] tracking-[-0.035em] text-[#2b3427]">
            {storyTextCover(story)}
          </p>
        </div>
      )}

      <article className="px-5 pb-[calc(2rem+var(--safe-bottom))] pt-6">
        <div className="mb-5 flex items-center justify-between gap-4 text-[11px] text-black/42">
          <span className="font-medium text-black/64">{fallbackAuthorName(story)}</span>
          <span>{story.memoryTime || formatPublishedTime(story.publishedAt)}</span>
        </div>
        {story.title ? (
          <h2 className="mb-4 mt-0 text-[24px] font-semibold leading-[1.28] tracking-[-0.045em] text-[#191a18]">
            {story.title}
          </h2>
        ) : null}
        {story.body ? (
          <div className="whitespace-pre-wrap text-[15px] leading-[1.95] tracking-[-0.01em] text-black/76">
            {story.body}
          </div>
        ) : null}
        <StoryDiscussion storyId={story.id} />
        <div className="mt-8 border-t border-black/[0.055] pt-4 text-[10px] text-black/30">
          发布于 {formatPublishedTime(story.publishedAt)}
        </div>
      </article>
    </div>
  );
}

function CommunitySheet({
  isMobile,
  open,
  onOpenChange,
  sceneId,
  sceneTitle,
}: CommunitySheetProps) {
  const [stories, setStories] = useState<PublishedStory[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const requestRef = useRef(0);

  const placesById = useMemo(
    () => new Map(places.map((place) => [place.id, place])),
    [places],
  );
  const activeStory = activeStoryId
    ? stories.find((story) => story.id === activeStoryId) ?? null
    : null;

  async function refreshStories() {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setLoadState('loading');
    setErrorMessage(null);

    const [storyResult, placeResult] = await Promise.allSettled([
      fetchPublishedStories({ limit: 50 }),
      fetchPlaces(sceneId),
    ]);
    if (requestRef.current !== requestId) return;

    if (placeResult.status === 'fulfilled') {
      setPlaces(placeResult.value);
    } else {
      setPlaces([]);
    }

    if (storyResult.status === 'rejected') {
      setStories([]);
      setErrorMessage(
        storyResult.reason instanceof Error
          ? storyResult.reason.message
          : '校园故事加载失败。',
      );
      setLoadState('error');
      return;
    }

    setStories(storyResult.value);
    setLoadState('ready');
  }

  useEffect(() => {
    if (!open) {
      requestRef.current += 1;
      setActiveStoryId(null);
      return;
    }

    setActiveStoryId(null);
    void refreshStories();
  }, [open, sceneId]);

  function returnToStory(story: PublishedStory) {
    if (!focusStoryLocation(story, placesById)) return;
    onOpenChange(false);
  }

  const sheetClassName = cn(
    'fixed z-[8] overflow-hidden border border-black/[0.07] bg-[#f7f7f3]/96 p-0 text-[#181916] shadow-[0_24px_80px_rgba(18,20,16,0.18)] backdrop-blur-[24px]',
    isMobile
      ? 'bottom-[calc(0.35rem+var(--safe-bottom))] left-[calc(0.45rem+var(--safe-left))] right-[calc(0.45rem+var(--safe-right))] top-auto h-[min(calc(var(--app-height)*0.86),780px)] rounded-[28px]'
      : 'bottom-[calc(1rem+var(--safe-bottom))] right-[calc(1rem+var(--safe-right))] top-[calc(1rem+var(--safe-top))] w-[min(560px,calc(100vw-2rem))] rounded-[28px]',
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-label="校园故事"
        className={sheetClassName}
        side={isMobile ? 'bottom' : 'right'}
      >
        {activeStory ? (
          <div className={cn('h-full overflow-y-auto', scrollAreaClassNames.thin)}>
            <StoryDetail
              onBack={() => setActiveStoryId(null)}
              onReturnToScene={() => returnToStory(activeStory)}
              placesById={placesById}
              story={activeStory}
            />
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex items-start justify-between gap-4 border-b border-black/[0.055] px-5 pb-4 pt-5">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#708653]">
                  {sceneTitle}
                </div>
                <h2 className="mb-0 mt-1 text-[28px] font-semibold leading-[1] tracking-[-0.05em]">
                  校园故事
                </h2>
                <p className="mb-0 mt-2 text-[12px] leading-[1.65] text-black/42">
                  从地点之外，看看整个校园留下的记忆。
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  className="rounded-full px-3 py-2 text-[10px] font-medium text-black/42 hover:bg-black/5 hover:text-black/62 disabled:opacity-40"
                  disabled={loadState === 'loading'}
                  onClick={() => void refreshStories()}
                  type="button"
                >
                  {loadState === 'loading' ? '刷新中' : '刷新'}
                </button>
                <button
                  aria-label="关闭校园故事"
                  className="grid h-9 w-9 place-items-center rounded-full text-[20px] text-black/38 hover:bg-black/5"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  ×
                </button>
              </div>
            </header>

            <div className={cn('min-h-0 flex-1 overflow-y-auto px-4 py-4', scrollAreaClassNames.thin)}>
              {errorMessage ? (
                <div className="mb-4 rounded-[16px] bg-[#fff0ed] px-4 py-3 text-[12px] leading-[1.6] text-[#8e4037]">
                  {errorMessage}
                </div>
              ) : null}

              {loadState === 'loading' && stories.length === 0 ? (
                <div className="grid min-h-[280px] place-items-center text-[12px] text-black/35">
                  正在找回校园里的故事…
                </div>
              ) : stories.length === 0 ? (
                <div className="grid min-h-[280px] place-items-center rounded-[20px] border border-dashed border-black/10 px-8 text-center text-[12px] leading-[1.75] text-black/36">
                  这里还没有公开的 Story。<br />第一段记忆可以从校园里的一个地点开始。
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center justify-between px-1 text-[10px] text-black/30">
                    <span>{stories.length} 段公开记忆</span>
                    <span>按最新发布</span>
                  </div>
                  <div className="columns-2 [column-gap:0.75rem]">
                    {stories.map((story) => (
                      <StoryCard
                        key={story.id}
                        onOpen={() => setActiveStoryId(story.id)}
                        story={story}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export {
  CommunitySheet,
};
