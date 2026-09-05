import type { Place, PublishedStory, StoryLocation } from '@ruoshui/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchPlaces,
  fetchPublishedStories,
  getPublishedStoryMediaUrl,
} from '../../community/content-api';
import {
  requestFocusSpatialAnchor,
  requestSetPlacePins,
} from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import { scrollAreaClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';
import { StoryAuthorActions } from './StoryAuthorActions';
import { StoryDiscussion } from './StoryDiscussion';

interface PlaceMemoryLayerProps {
  isMobile: boolean;
  onOpenStoryComposer: (storyId?: string) => void;
  sceneId: string;
}

type StoriesState = 'idle' | 'loading' | 'ready' | 'error';

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
  const source = story.title?.trim() || story.body?.replace(/\s+/g, ' ').trim() || story.memoryTime || '留在这里的一段记忆';
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

function focusPlace(place: Place) {
  const { cameraPose } = place.anchor;
  requestFocusSpatialAnchor({
    title: place.name,
    position: [cameraPose.position.x, cameraPose.position.y, cameraPose.position.z],
    target: [cameraPose.target.x, cameraPose.target.y, cameraPose.target.z],
    ...(cameraPose.fovDeg ? { fovDeg: cameraPose.fovDeg } : {}),
  });
}

function focusLocation(location: StoryLocation, placesById: Map<string, Place>, fallbackPlace: Place) {
  if (location.kind === 'anchor') {
    const { cameraPose } = location.anchor;
    requestFocusSpatialAnchor({
      title: '这段记忆发生的地方',
      position: [cameraPose.position.x, cameraPose.position.y, cameraPose.position.z],
      target: [cameraPose.target.x, cameraPose.target.y, cameraPose.target.z],
      ...(cameraPose.fovDeg ? { fovDeg: cameraPose.fovDeg } : {}),
    });
    return;
  }

  if (location.kind === 'place') {
    focusPlace(placesById.get(location.placeId) ?? fallbackPlace);
    return;
  }

  focusPlace(fallbackPlace);
}

function StoryCard({ story, onOpen }: { story: PublishedStory; onOpen: () => void }) {
  const firstMediaId = story.mediaAssetIds[0];

  return (
    <button
      className="mb-3 block w-full break-inside-avoid overflow-hidden rounded-[18px] bg-white text-left shadow-[0_8px_30px_rgba(30,31,27,0.06)] ring-1 ring-black/[0.045] transition-transform duration-180 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ba66b]"
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
        <div className="grid aspect-[4/5] place-items-center bg-[linear-gradient(145deg,#edf0e5,#f7f5ee)] px-5 text-center">
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
  onEditStory,
  onRemovedStory,
  place,
  placesById,
  story,
}: {
  onBack: () => void;
  onEditStory: (storyId: string) => void;
  onRemovedStory: (storyId: string) => void;
  place: Place;
  placesById: Map<string, Place>;
  story: PublishedStory;
}) {
  return (
    <div className="min-h-full bg-[#f7f7f3]">
      <div className="sticky top-0 z-[3] flex h-[54px] items-center justify-between border-b border-black/[0.055] bg-[#f7f7f3]/94 px-4 backdrop-blur-[18px]">
        <button className="rounded-full px-2 py-1 text-[13px] text-black/60 hover:bg-black/5" onClick={onBack} type="button">
          ‹ 返回
        </button>
        <div className="max-w-[58%] truncate text-[12px] font-medium text-black/58">{place.name}</div>
        <button
          className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-[11px] font-medium text-black/62"
          onClick={() => focusLocation(story.location, placesById, place)}
          type="button"
        >
          回到这里
        </button>
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
        <div className="grid min-h-[270px] place-items-center bg-[linear-gradient(145deg,#e9eee0,#f6f4eb)] px-8 text-center">
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
        <StoryAuthorActions onEdit={onEditStory} onRemoved={onRemovedStory} story={story} />
        <StoryDiscussion storyId={story.id} />
        <div className="mt-8 border-t border-black/[0.055] pt-4 text-[10px] text-black/30">
          发布于 {formatPublishedTime(story.publishedAt)}
        </div>
      </article>
    </div>
  );
}

function PlaceMemoryLayer({ isMobile, onOpenStoryComposer, sceneId }: PlaceMemoryLayerProps) {
  const placeOverlay = useViewerUiStore((store) => store.placeOverlay);
  const highlightAuthoring = useViewerUiStore((store) => store.highlightAuthoring);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [stories, setStories] = useState<PublishedStory[]>([]);
  const [storiesState, setStoriesState] = useState<StoriesState>('idle');
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const storiesRequestRef = useRef(0);

  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const activePlace = activePlaceId ? placesById.get(activePlaceId) ?? null : null;
  const activeStory = activeStoryId ? stories.find((story) => story.id === activeStoryId) ?? null : null;

  useEffect(() => {
    let cancelled = false;
    setPlacesError(null);

    void fetchPlaces(sceneId)
      .then((nextPlaces) => {
        if (cancelled) return;
        setPlaces(nextPlaces);
        requestSetPlacePins(
          nextPlaces.map((place) => ({
            id: place.id,
            name: place.name,
            position: [
              place.anchor.markerPosition.x,
              place.anchor.markerPosition.y,
              place.anchor.markerPosition.z,
            ],
          })),
        );
      })
      .catch((error) => {
        if (cancelled) return;
        setPlacesError(error instanceof Error ? error.message : '地点加载失败。');
        requestSetPlacePins([]);
      });

    return () => {
      cancelled = true;
      requestSetPlacePins([]);
    };
  }, [sceneId]);

  async function openPlace(place: Place) {
    setActivePlaceId(place.id);
    setActiveStoryId(null);
    setHeaderCollapsed(false);
    setMobileExpanded(false);
    focusPlace(place);

    const requestId = storiesRequestRef.current + 1;
    storiesRequestRef.current = requestId;
    setStories([]);
    setStoriesState('loading');
    setStoriesError(null);
    try {
      const nextStories = await fetchPublishedStories({ placeId: place.id, limit: 50 });
      if (storiesRequestRef.current !== requestId) return;
      setStories(nextStories);
      setStoriesState('ready');
    } catch (error) {
      if (storiesRequestRef.current !== requestId) return;
      setStoriesError(error instanceof Error ? error.message : 'Story 加载失败。');
      setStoriesState('error');
    }
  }

  function closePlace() {
    storiesRequestRef.current += 1;
    setActivePlaceId(null);
    setActiveStoryId(null);
    setStories([]);
    setStoriesState('idle');
    setHeaderCollapsed(false);
    setMobileExpanded(false);
  }

  function handleEditStory(storyId: string) {
    setActiveStoryId(null);
    onOpenStoryComposer(storyId);
  }

  function handleRemovedStory(storyId: string) {
    setStories((current) => current.filter((story) => story.id !== storyId));
    setActiveStoryId(null);
  }

  if (places.length === 0 && !activePlace) {
    return placesError ? (
      <div className="pointer-events-none absolute left-[calc(1rem+var(--safe-left))] top-[calc(1rem+var(--safe-top))] z-[3] rounded-full bg-black/36 px-3 py-2 text-[10px] text-white/62 backdrop-blur-[12px]">
        地点暂时不可用
      </div>
    ) : null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[3]" aria-label="校园地点与记忆">
      {placeOverlay.items.map((item) => (
        <button
          className={cn(
            'pointer-events-auto absolute inline-flex items-center gap-2 rounded-full border border-white/16 bg-[rgba(20,24,18,0.44)] px-2.5 py-1.5 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)] backdrop-blur-[10px] transition-[opacity,transform,background-color,border-color] duration-180 hover:border-[#c5dea5]/50 hover:bg-[rgba(29,39,22,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5dea5]/70',
            activePlaceId === item.id && 'border-[#c5dea5]/55 bg-[rgba(34,48,25,0.78)]',
            (!item.isVisible || highlightAuthoring.isEnabled) && 'pointer-events-none opacity-0',
          )}
          key={item.id}
          onClick={() => {
            const place = placesById.get(item.id);
            if (place) void openPlace(place);
          }}
          style={{ transform: `translate3d(${item.left}px, ${item.top}px, 0) translate(-50%, -50%)` }}
          type="button"
        >
          <span className="h-2 w-2 shrink-0 rounded-full bg-[#b9d78f] shadow-[0_0_0_5px_rgba(185,215,143,0.15)]" />
          <span className="text-[11px] font-semibold tracking-[-0.01em]">{item.name}</span>
        </button>
      ))}

      {activePlace ? (
        <aside
          className={cn(
            'pointer-events-auto z-[8] overflow-hidden border-black/[0.065] bg-[#f7f7f3]/96 text-[#181916] shadow-[0_24px_80px_rgba(18,20,16,0.18)] backdrop-blur-[24px]',
            isMobile
              ? 'fixed bottom-0 left-0 right-0 rounded-t-[26px] border-t transition-[height] duration-300 ease-out'
              : 'absolute bottom-[calc(1rem+var(--safe-bottom))] right-[calc(1rem+var(--safe-right))] top-[calc(1rem+var(--safe-top))] w-[min(490px,calc(100vw-2rem))] rounded-[26px] border',
          )}
          style={isMobile ? { height: mobileExpanded ? '86dvh' : '42dvh' } : undefined}
        >
          {isMobile ? (
            <button
              aria-label={mobileExpanded ? '收起地点面板' : '展开地点面板'}
              className="absolute left-0 right-0 top-0 z-[6] flex h-7 items-start justify-center pt-2"
              onClick={() => setMobileExpanded((value) => !value)}
              type="button"
            >
              <span className="h-1 w-10 rounded-full bg-black/16" />
            </button>
          ) : null}

          {activeStory ? (
            <div className={cn('h-full overflow-y-auto', scrollAreaClassNames.thin)}>
              <StoryDetail
                onBack={() => setActiveStoryId(null)}
                onEditStory={handleEditStory}
                onRemovedStory={handleRemovedStory}
                place={activePlace}
                placesById={placesById}
                story={activeStory}
              />
            </div>
          ) : (
            <div
              className={cn('h-full overflow-y-auto overscroll-contain', scrollAreaClassNames.thin)}
              onScroll={(event) => setHeaderCollapsed(event.currentTarget.scrollTop > 78)}
            >
              <div
                className={cn(
                  'sticky top-0 z-[5] flex items-center justify-between border-b bg-[#f7f7f3]/94 px-4 backdrop-blur-[18px] transition-[height,opacity,border-color] duration-180',
                  headerCollapsed ? 'h-[54px] border-black/[0.055] opacity-100' : 'h-0 border-transparent opacity-0 pointer-events-none',
                )}
              >
                <div className="truncate text-[13px] font-semibold">{activePlace.name}</div>
                <button className="rounded-full px-2 py-1 text-[18px] leading-none text-black/42 hover:bg-black/5" onClick={closePlace} type="button">×</button>
              </div>

              <header className={cn('px-5 pb-5', isMobile ? 'pt-9' : 'pt-6')}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#718653]">校园地点</div>
                    <h2 className="mb-0 mt-2 text-[30px] font-semibold leading-[1.12] tracking-[-0.055em]">{activePlace.name}</h2>
                  </div>
                  <button className="h-9 w-9 shrink-0 rounded-full border border-black/7 bg-white text-[20px] leading-none text-black/42 hover:bg-black/[0.035]" onClick={closePlace} type="button">×</button>
                </div>
                {activePlace.intro ? (
                  <p className="mb-0 mt-4 whitespace-pre-wrap text-[13px] leading-[1.78] text-black/55">{activePlace.intro}</p>
                ) : (
                  <p className="mb-0 mt-4 text-[12px] leading-[1.7] text-black/34">这里的故事正在一点点补回来。</p>
                )}
                <button
                  className="mt-4 rounded-full border border-black/8 bg-white px-3.5 py-2 text-[11px] font-medium text-black/58"
                  onClick={() => focusPlace(activePlace)}
                  type="button"
                >
                  回到最佳视角
                </button>
              </header>

              <section className="border-t border-black/[0.055] px-3.5 pb-[calc(2rem+var(--safe-bottom))] pt-4">
                <div className="mb-3 flex items-center justify-between px-1.5">
                  <h3 className="m-0 text-[13px] font-semibold tracking-[-0.02em]">这里的故事</h3>
                  {storiesState === 'ready' ? <span className="text-[10px] text-black/30">{stories.length} 条</span> : null}
                </div>

                {storiesState === 'loading' ? (
                  <div className="grid min-h-[180px] place-items-center text-[12px] text-black/34">正在把这里的记忆找回来…</div>
                ) : storiesState === 'error' ? (
                  <div className="rounded-[18px] bg-[#fff0ed] px-4 py-4 text-[12px] leading-[1.7] text-[#8d4138]">{storiesError ?? 'Story 加载失败。'}</div>
                ) : stories.length === 0 ? (
                  <div className="grid min-h-[190px] place-items-center rounded-[20px] border border-dashed border-black/10 bg-white/45 px-6 text-center text-[12px] leading-[1.75] text-black/36">
                    这里还没有公开的 Story。<br />第一段记忆可以从这里开始。
                  </div>
                ) : (
                  <div className="columns-2 gap-3">
                    {stories.map((story) => (
                      <StoryCard key={story.id} onOpen={() => setActiveStoryId(story.id)} story={story} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </aside>
      ) : null}
    </div>
  );
}

export { PlaceMemoryLayer };
