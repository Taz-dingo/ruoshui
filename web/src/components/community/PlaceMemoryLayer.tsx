import type {
  Place,
  PublishedStory,
  PublishedStorySpatialAnchor,
  StoryLocation,
} from '@ruoshui/shared';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchPlaces,
  fetchPublishedStories,
  fetchPublishedStory,
  fetchPublishedStorySpatialAnchors,
  getPublishedStoryMediaUrl,
} from '../../community/content-api';
import {
  requestCancelSpatialAnchorAmbientFocus,
  requestFocusScenePin,
  requestFocusSpatialAnchor,
  requestSetPlacePins,
  requestSetStoryAnchorPins,
} from '../../ui/commands/viewer-command-bus';
import { useViewerUiStore } from '../../ui/state/viewer-ui-store';
import {
  buttonVariants,
  glassSurfaceClassNames,
  paperSurfaceClassNames,
  scrollAreaClassNames,
} from '../../styles/system';
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
    ambientFocus: true,
  });
}

function focusLocation(
  location: StoryLocation,
  placesById: Map<string, Place>,
  fallbackPlace?: Place | null,
) {
  if (location.kind === 'anchor') {
    const { cameraPose } = location.anchor;
    requestFocusSpatialAnchor({
      title: '这段记忆发生的地方',
      position: [cameraPose.position.x, cameraPose.position.y, cameraPose.position.z],
      target: [cameraPose.target.x, cameraPose.target.y, cameraPose.target.z],
      ...(cameraPose.fovDeg ? { fovDeg: cameraPose.fovDeg } : {}),
      ambientFocus: true,
    });
    return;
  }

  if (location.kind === 'place') {
    const place = placesById.get(location.placeId) ?? fallbackPlace;
    if (place) focusPlace(place);
    return;
  }

  if (fallbackPlace) focusPlace(fallbackPlace);
}

function toViewerAnchorPin(anchor: PublishedStorySpatialAnchor) {
  return {
    id: anchor.id,
    title: anchor.title,
    position: [
      anchor.anchor.markerPosition.x,
      anchor.anchor.markerPosition.y,
      anchor.anchor.markerPosition.z,
    ] as [number, number, number],
  };
}

function StoryCard({
  material = 'paper',
  onOpen,
  story,
}: {
  material?: 'glass' | 'paper';
  onOpen: () => void;
  story: PublishedStory;
}) {
  const firstMediaId = story.mediaAssetIds[0];
  const isGlass = material === 'glass';

  return (
    <button
      className={cn(
        'mb-4 block w-full break-inside-avoid overflow-hidden rounded-[16px] text-left transition-[opacity,transform] duration-180 hover:-translate-y-0.5 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong/70',
        isGlass ? 'text-white' : 'text-[#20221f]',
      )}
      onClick={onOpen}
      type="button"
    >
      {firstMediaId ? (
        <img
          alt={storyDisplayTitle(story)}
          className="block aspect-[4/5] w-full rounded-[16px] bg-black/5 object-cover"
          loading="lazy"
          src={getPublishedStoryMediaUrl(story.id, firstMediaId)}
        />
      ) : (
        <div className={cn('grid aspect-[4/5] place-items-center rounded-[16px] px-5 text-center', isGlass ? 'bg-white/12' : 'bg-[#edf0e5]')}>
          <p className={cn('m-0 text-[15px] font-medium leading-[1.75] tracking-[-0.02em]', isGlass ? 'text-white/90' : 'text-[#2c3328]')}>
            {storyTextCover(story)}
          </p>
        </div>
      )}
      <div className={cn('px-1.5 pb-1 pt-3', isGlass && 'px-2')}>
        <div className={cn('line-clamp-2 text-[13px] font-semibold leading-[1.5] tracking-[-0.02em]', isGlass ? 'text-white/94' : 'text-[#20221f]')}>
          {storyDisplayTitle(story)}
        </div>
        <div className={cn('mt-2 flex items-center justify-between gap-2 text-[10px]', isGlass ? 'text-white/56' : 'text-black/38')}>
          <span className="truncate">{fallbackAuthorName(story)}</span>
          {story.memoryTime ? <span className="shrink-0">{story.memoryTime}</span> : null}
        </div>
      </div>
    </button>
  );
}

function StoryAnchorClusterPeek({
  onBack,
  onOpenStory,
  stories,
}: {
  onBack: () => void;
  onOpenStory: (storyId: string) => void;
  stories: PublishedStory[];
}) {
  return (
    <div className="min-h-full px-5 pb-[calc(2rem+var(--safe-bottom))] pt-6 text-white">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-brand-strong">故事聚合</div>
          <h2 className="mb-0 mt-2 text-[28px] font-semibold leading-[1.12] tracking-[-0.055em]">这里有 {stories.length} 段记忆</h2>
          <p className="mb-0 mt-3 text-[13px] leading-[1.7] text-white/62">镜头靠近后仍然重叠，所以把这一小片的故事列在这里。</p>
        </div>
        <button
          aria-label="关闭故事聚合"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/18 bg-white/8 text-[20px] leading-none text-white/72 hover:bg-white/14"
          onClick={onBack}
          type="button"
        >
          ×
        </button>
      </header>

      <div className="mt-7 divide-y divide-white/10">
        {stories.map((story) => (
          <button
            className="flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-brand-strong"
            key={story.id}
            onClick={() => onOpenStory(story.id)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold text-white/92">{storyDisplayTitle(story)}</span>
              <span className="mt-1 block truncate text-[11px] text-white/52">{fallbackAuthorName(story)}{story.memoryTime ? ` · ${story.memoryTime}` : ''}</span>
            </span>
            <span className="shrink-0 text-[20px] text-white/38">›</span>
          </button>
        ))}
      </div>
    </div>
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
  place: Place | null;
  placesById: Map<string, Place>;
  story: PublishedStory;
}) {
  const locationLabel = place?.name ?? (story.location.kind === 'anchor' ? '校园里的一个角落' : '若水广场');

  return (
    <div className="min-h-full">
      <div className={cn('sticky top-0 z-[3] flex h-[54px] items-center justify-between border-b px-4', paperSurfaceClassNames.stickyHeader)}>
        <button className="rounded-full px-2 py-1 text-[13px] text-black/60 hover:bg-black/5" onClick={onBack} type="button">
          ‹ 返回
        </button>
        <div className="max-w-[58%] truncate text-[12px] font-medium text-black/58">{locationLabel}</div>
        <button
          className="rounded-full px-2.5 py-1.5 text-[11px] font-medium text-[#718653] transition-colors hover:bg-black/[0.045] hover:text-[#4f6437]"
          onClick={() => focusLocation(story.location, placesById, place)}
          type="button"
        >
          飞到这里
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
        <div className="grid min-h-[270px] place-items-center bg-[#e9eee0] px-8 text-center">
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
  const storyAnchorOverlay = useViewerUiStore((store) => store.storyAnchorOverlay);
  const highlightAuthoring = useViewerUiStore((store) => store.highlightAuthoring);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [spatialAnchors, setSpatialAnchors] = useState<PublishedStorySpatialAnchor[]>([]);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [publishedStories, setPublishedStories] = useState<PublishedStory[]>([]);
  const [stories, setStories] = useState<PublishedStory[]>([]);
  const [storiesState, setStoriesState] = useState<StoriesState>('idle');
  const [storiesError, setStoriesError] = useState<string | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [activeAnchorStoryId, setActiveAnchorStoryId] = useState<string | null>(null);
  const [activeClusterStoryIds, setActiveClusterStoryIds] = useState<string[] | null>(null);
  const [focusedClusterId, setFocusedClusterId] = useState<string | null>(null);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [panelSurfaceIsSolid, setPanelSurfaceIsSolid] = useState(false);
  const storiesRequestRef = useRef(0);
  const anchorStoryRequestRef = useRef(0);

  const placesById = useMemo(() => new Map(places.map((place) => [place.id, place])), [places]);
  const publishedStoriesById = useMemo(
    () => new Map(publishedStories.map((story) => [story.id, story])),
    [publishedStories],
  );
  const activePlace = activePlaceId ? placesById.get(activePlaceId) ?? null : null;
  const activeStory = activeStoryId ? stories.find((story) => story.id === activeStoryId) ?? null : null;
  const activeAnchorStory = activeAnchorStoryId
    ? publishedStoriesById.get(activeAnchorStoryId) ?? null
    : null;
  const activeClusterStories = activeClusterStoryIds
    ? activeClusterStoryIds.flatMap((storyId) => {
        const story = publishedStoriesById.get(storyId);
        return story ? [story] : [];
      })
    : [];
  const panelIsPaper = Boolean(activeStory || activeAnchorStory || headerCollapsed);

  useEffect(() => {
    if (!panelIsPaper) {
      setPanelSurfaceIsSolid(false);
      return;
    }
    const frame = window.requestAnimationFrame(() => setPanelSurfaceIsSolid(true));
    return () => window.cancelAnimationFrame(frame);
  }, [panelIsPaper]);

  useEffect(() => {
    if (!focusedClusterId) return;
    const clusterStillExists = storyAnchorOverlay.items.some(
      (item) => item.kind === 'cluster' && item.id === focusedClusterId && item.isVisible,
    );
    if (!clusterStillExists) {
      setFocusedClusterId(null);
    }
  }, [focusedClusterId, storyAnchorOverlay.items]);

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
      requestCancelSpatialAnchorAmbientFocus();
    };
  }, [sceneId]);

  useEffect(() => {
    let cancelled = false;

    void fetchPublishedStorySpatialAnchors()
      .then((nextAnchors) => {
        if (cancelled) return;
        setSpatialAnchors(nextAnchors);
        requestSetStoryAnchorPins(nextAnchors.map(toViewerAnchorPin));
      })
      .catch(() => {
        if (cancelled) return;
        setSpatialAnchors([]);
        requestSetStoryAnchorPins([]);
      });

    return () => {
      cancelled = true;
      requestSetStoryAnchorPins([]);
    };
  }, [sceneId]);

  function clearAnchorSelection() {
    anchorStoryRequestRef.current += 1;
    setActiveAnchorStoryId(null);
    setActiveClusterStoryIds(null);
    setFocusedClusterId(null);
  }

  async function openPlace(place: Place) {
    clearAnchorSelection();
    setActivePlaceId(place.id);
    setActiveStoryId(null);
    setHeaderCollapsed(false);
    setMobileExpanded(false);

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
    requestCancelSpatialAnchorAmbientFocus();
    setActivePlaceId(null);
    setActiveStoryId(null);
    clearAnchorSelection();
    setStories([]);
    setStoriesState('idle');
    setHeaderCollapsed(false);
    setMobileExpanded(false);
  }

  async function openAnchorStory(storyId: string) {
    setActivePlaceId(null);
    setActiveStoryId(null);
    setActiveClusterStoryIds(null);
    setFocusedClusterId(null);
    setActiveAnchorStoryId(storyId);
    setHeaderCollapsed(false);
    setMobileExpanded(false);

    if (publishedStoriesById.has(storyId)) return;

    const requestId = anchorStoryRequestRef.current + 1;
    anchorStoryRequestRef.current = requestId;
    try {
      const story = await fetchPublishedStory(storyId);
      if (anchorStoryRequestRef.current !== requestId) return;
      setPublishedStories((current) =>
        current.some((item) => item.id === story.id) ? current : [...current, story],
      );
    } catch {
      if (anchorStoryRequestRef.current === requestId) {
        setActiveAnchorStoryId(null);
      }
    }
  }

  async function openStoryCluster(storyIds: string[]) {
    setActivePlaceId(null);
    setActiveStoryId(null);
    setActiveAnchorStoryId(null);
    setFocusedClusterId(null);
    setHeaderCollapsed(false);
    setMobileExpanded(false);

    const missingIds = storyIds.filter((storyId) => !publishedStoriesById.has(storyId));
    if (missingIds.length > 0) {
      const fetched = await Promise.all(
        missingIds.map((storyId) => fetchPublishedStory(storyId).catch(() => null)),
      );
      const nextStories = fetched.filter((story): story is PublishedStory => Boolean(story));
      if (nextStories.length > 0) {
        setPublishedStories((current) => {
          const byId = new Map(current.map((story) => [story.id, story]));
          nextStories.forEach((story) => byId.set(story.id, story));
          return [...byId.values()];
        });
      }
    }
    setActiveClusterStoryIds(storyIds);
  }

  function handleClusterClick(item: Extract<(typeof storyAnchorOverlay.items)[number], { kind: 'cluster' }>) {
    if (focusedClusterId === item.id) {
      void openStoryCluster(item.storyIds);
      return;
    }

    clearAnchorSelection();
    setFocusedClusterId(item.id);
    requestFocusScenePin({
      pinId: item.id,
      position: item.position,
      title: `${item.storyIds.length} 段记忆`,
    });
  }

  function closeAnchorContent() {
    requestCancelSpatialAnchorAmbientFocus();
    clearAnchorSelection();
  }

  function handleEditStory(storyId: string) {
    requestCancelSpatialAnchorAmbientFocus();
    setActiveStoryId(null);
    clearAnchorSelection();
    onOpenStoryComposer(storyId);
  }

  function handleRemovedStory(storyId: string) {
    setStories((current) => current.filter((story) => story.id !== storyId));
    setPublishedStories((current) => current.filter((story) => story.id !== storyId));
    setSpatialAnchors((current) => {
      const next = current.filter((anchor) => anchor.id !== storyId);
      requestSetStoryAnchorPins(next.map(toViewerAnchorPin));
      return next;
    });
    setActiveStoryId(null);
    if (activeAnchorStoryId === storyId) clearAnchorSelection();
    if (activeClusterStoryIds) {
      const nextIds = activeClusterStoryIds.filter((id) => id !== storyId);
      if (nextIds.length === 0) clearAnchorSelection();
      else setActiveClusterStoryIds(nextIds);
    }
  }

  if (
    places.length === 0 &&
    spatialAnchors.length === 0 &&
    !activePlace &&
    !activeAnchorStory &&
    activeClusterStories.length === 0
  ) {
    return placesError ? (
      <div className="pointer-events-none absolute left-[calc(1rem+var(--safe-left))] top-[calc(1rem+var(--safe-top))] z-[3] rounded-full bg-black/36 px-3 py-2 text-[10px] text-white/62 backdrop-blur-[12px]">
        地点暂时不可用
      </div>
    ) : null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-[3]" aria-label="校园地点与记忆">
      {storyAnchorOverlay.items.map((item) => {
        if (item.kind === 'cluster') {
          const hasBeenFocused = focusedClusterId === item.id;
          return (
            <button
              aria-label={hasBeenFocused
                ? `打开故事聚合，共 ${item.storyIds.length} 段记忆`
                : `靠近故事聚合，共 ${item.storyIds.length} 段记忆`}
              className={cn(
                'pointer-events-auto absolute inline-flex min-w-9 items-center justify-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-[opacity,background-color,border-color] duration-180 hover:border-brand-strong/55 hover:bg-brand/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong/70',
                glassSurfaceClassNames.subtle,
                hasBeenFocused && 'border-brand-strong/55 bg-brand/20',
                (!item.isVisible || highlightAuthoring.isEnabled) && 'pointer-events-none opacity-0',
              )}
              key={item.id}
              onClick={() => handleClusterClick(item)}
              style={{ transform: `translate3d(${item.left}px, ${item.top}px, 0) translate(-50%, -50%)` }}
              type="button"
            >
              <span className="h-2 w-2 rounded-full bg-[#f2d6a4] shadow-[0_0_0_5px_rgba(242,214,164,0.14)]" />
              {item.storyIds.length}
            </button>
          );
        }

        return (
          <button
            aria-label={`打开故事：${item.title}`}
            className={cn(
              'pointer-events-auto absolute inline-flex max-w-[180px] items-center gap-2 px-2.5 py-1.5 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,0.16)] transition-[opacity,background-color,border-color] duration-180 hover:border-brand-strong/55 hover:bg-brand/24 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-strong/70',
              glassSurfaceClassNames.subtle,
              (!item.isVisible || highlightAuthoring.isEnabled) && 'pointer-events-none opacity-0',
            )}
            key={item.id}
            onClick={() => void openAnchorStory(item.id)}
            style={{ transform: `translate3d(${item.left}px, ${item.top}px, 0) translate(-50%, -50%)` }}
            type="button"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#f2d6a4] shadow-[0_0_0_5px_rgba(242,214,164,0.14)]" />
            <span className="truncate text-[10px] font-semibold tracking-[-0.01em]">{item.title}</span>
          </button>
        );
      })}

      {placeOverlay.items.map((item) => (
        <button
          className={cn(
            'pointer-events-auto absolute inline-flex items-center gap-2 px-2.5 py-1.5 text-left text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-[opacity,background-color,border-color] duration-180 hover:border-[#c5dea5]/50 hover:bg-[rgba(29,39,22,0.72)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5dea5]/70',
            glassSurfaceClassNames.subtle,
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

      {activePlace || activeAnchorStory || activeClusterStories.length > 0 ? (
        <aside
          className={cn(
            'pointer-events-auto z-[8] overflow-hidden border shadow-[0_24px_80px_rgba(18,20,16,0.18)] transition-[background-color,backdrop-filter,box-shadow,color] duration-[420ms] ease-out',
            panelSurfaceIsSolid
              ? cn(paperSurfaceClassNames.canvas, 'border-black/[0.065]')
              : cn(
                  glassSurfaceClassNames.panel,
                  activeStory
                    ? 'border-black/10 bg-white/[0.72] text-[#181916] [background-image:none]'
                    : 'border-white/16 text-white',
                ),
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
              <span className={cn('h-1 w-10 rounded-full', panelSurfaceIsSolid ? 'bg-black/16' : 'bg-white/28')} />
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
          ) : activeAnchorStory ? (
            <div className={cn('h-full overflow-y-auto', scrollAreaClassNames.thin)}>
              <StoryDetail
                onBack={closeAnchorContent}
                onEditStory={handleEditStory}
                onRemovedStory={handleRemovedStory}
                place={null}
                placesById={placesById}
                story={activeAnchorStory}
              />
            </div>
          ) : activeClusterStories.length > 0 ? (
            <div className={cn('h-full overflow-y-auto', scrollAreaClassNames.thin)}>
              <StoryAnchorClusterPeek
                onBack={closeAnchorContent}
                onOpenStory={(storyId) => void openAnchorStory(storyId)}
                stories={activeClusterStories}
              />
            </div>
          ) : activePlace ? (
            <div
              className={cn('h-full overflow-y-auto overscroll-contain', scrollAreaClassNames.thin)}
              onScroll={(event) => setHeaderCollapsed(event.currentTarget.scrollTop > 78)}
            >
              <div
                className={cn(
                  'sticky top-0 z-[5] flex items-center justify-between border-b px-4 transition-[height,opacity,border-color,background-color,backdrop-filter] duration-180',
                  headerCollapsed && panelSurfaceIsSolid
                    ? cn('h-[54px] border-black/[0.055] opacity-100', paperSurfaceClassNames.stickyHeader)
                    : 'pointer-events-none h-0 border-transparent bg-transparent opacity-0',
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
                  className="mt-4 rounded-full px-1 py-1 text-[11px] font-medium text-[#718653] transition-colors hover:text-[#4f6437]"
                  onClick={() => focusPlace(activePlace)}
                  type="button"
                >
                  飞到这里 →
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
                  <div className="rounded-[14px] bg-[#fff0ed] px-4 py-4 text-[12px] leading-[1.7] text-[#8d4138]">{storiesError ?? 'Story 加载失败。'}</div>
                ) : stories.length === 0 ? (
                  <div className="grid min-h-[190px] place-items-center gap-3 border-y border-dashed border-black/10 px-6 py-8 text-center text-[12px] leading-[1.75] text-black/36">
                    <div>这里还没有留下故事。<br />第一段记忆，可以从这里开始。</div>
                    <button className={cn(buttonVariants({ variant: 'tertiary' }), 'px-3.5 py-2 text-[11px]')} onClick={() => onOpenStoryComposer()} type="button">
                      留下故事
                    </button>
                  </div>
                ) : (
                  <div className="columns-2 gap-3">
                    {stories.map((story) => (
                      <StoryCard material={panelSurfaceIsSolid ? 'paper' : 'glass'} key={story.id} onOpen={() => setActiveStoryId(story.id)} story={story} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}

export { PlaceMemoryLayer };
