import type {
  ForumPostDetail,
  ScenePin
} from '@ruoshui/shared';
import {
  startTransition,
  type FormEvent,
  useEffect,
  useState
} from 'react';

import {
  confirmMediaAsset,
  createForumPost,
  ensureCommunityScene,
  fetchForumPostDetail,
  fetchForumPosts,
  fetchPinsForPost,
  fetchPostsForScenePin,
  fetchSceneBootstrap,
  requestUploadTicket,
  uploadFileWithTicket
} from '../../community/api';
import { scrollAreaClassNames } from '../../styles/system';
import { requestFocusScenePin } from '../../ui/commands/viewer-command-bus';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import { Sheet, SheetContent } from '../ui/sheet';

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

type CommunityView = 'compose' | 'detail' | 'feed';
type PostStatus = 'archived' | 'draft' | 'published';

const postCardHeightClassNames = [
  'h-[188px]',
  'h-[236px]',
  'h-[208px]',
  'h-[264px]'
] as const;

const postStatusLabels: Record<PostStatus, string> = {
  archived: '已归档',
  draft: '草稿',
  published: '已发布'
};

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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
  if (source.length <= 82) {
    return source;
  }

  return `${source.slice(0, 82)}…`;
}

function getPostReadTime(body: string) {
  return Math.max(1, Math.ceil(body.replace(/\s+/g, '').length / 180));
}

function getPostCardHeight(index: number, hasCover: boolean) {
  if (!hasCover) {
    return 'h-[168px]';
  }

  return postCardHeightClassNames[index % postCardHeightClassNames.length];
}

function CommunitySheet({
  isMobile,
  open,
  onOpenChange,
  sceneAssetUrl,
  sceneId,
  scenePreviewImage,
  sceneSummary,
  sceneTitle
}: CommunitySheetProps) {
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<CommunityView>('feed');
  const [composerBody, setComposerBody] = useState('');
  const [composerExcerpt, setComposerExcerpt] = useState('');
  const [composerFiles, setComposerFiles] = useState<File[]>([]);
  const [composerMessage, setComposerMessage] = useState<string | null>(null);
  const [composerPinId, setComposerPinId] = useState('');
  const [composerStatus, setComposerStatus] = useState<PostStatus>('published');
  const [composerTitle, setComposerTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pins, setPins] = useState<ScenePin[]>([]);
  const [posts, setPosts] = useState<ForumPostDetail[]>([]);
  const [selectedPost, setSelectedPost] = useState<ForumPostDetail | null>(null);

  async function refreshCommunity(nextPinId: string | null = activePinId) {
    setIsRefreshing(true);
    setErrorMessage(null);

    try {
      await ensureCommunityScene(sceneId, {
        id: sceneId,
        title: sceneTitle,
        description: sceneSummary,
        assetUrl: sceneAssetUrl,
        previewImage: scenePreviewImage
      });

      const bootstrap = await fetchSceneBootstrap(sceneId);
      const feed = nextPinId
        ? await fetchPostsForScenePin(sceneId, nextPinId)
        : await fetchForumPosts({
            sceneId,
            status: 'published',
            limit: 18
          });

      startTransition(() => {
        setPins(bootstrap.pins);
        setPosts(feed);
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '社区内容刷新失败了，稍后再试一次。'
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function openPostDetail(postId: string) {
    setActiveView('detail');
    setIsDetailLoading(true);
    setErrorMessage(null);

    try {
      const [detail, detailPins] = await Promise.all([
        fetchForumPostDetail(postId),
        fetchPinsForPost(postId)
      ]);

      startTransition(() => {
        setSelectedPost({
          ...detail,
          pinId: detailPins[0]?.id ?? detail.pinId,
          pins: detailPins
        });
      });
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '帖子详情加载失败了。'
      );
    } finally {
      setIsDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    void refreshCommunity();
  }, [open]);

  async function handlePinFilter(nextPin: ScenePin | null) {
    const nextPinId = nextPin?.id ?? null;

    setActivePinId(nextPinId);
    if (nextPin) {
      requestFocusScenePin({
        pinId: nextPin.id,
        position: [nextPin.position.x, nextPin.position.y, nextPin.position.z],
        target: nextPin.target
          ? [nextPin.target.x, nextPin.target.y, nextPin.target.z]
          : undefined,
        title: nextPin.title
      });
    }

    setActiveView('feed');
    await refreshCommunity(nextPinId);
  }

  function handleReturnToScene(pin: ScenePin) {
    requestFocusScenePin({
      pinId: pin.id,
      position: [pin.position.x, pin.position.y, pin.position.z],
      target: pin.target
        ? [pin.target.x, pin.target.y, pin.target.z]
        : undefined,
      title: pin.title
    });
    onOpenChange(false);
  }

  async function handleSubmitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setComposerMessage(null);
    setErrorMessage(null);
    setIsPublishing(true);

    try {
      const uploadedMediaIds: string[] = [];

      for (const file of composerFiles) {
        const mimeType = file.type || 'application/octet-stream';
        const ticket = await requestUploadTicket({
          fileName: file.name,
          mimeType,
          sizeBytes: file.size,
          category: uploadedMediaIds.length === 0 ? 'post-cover' : 'post-inline'
        });

        await uploadFileWithTicket(ticket, file);

        const mediaAsset = await confirmMediaAsset({
          bucket: ticket.provider === 'r2' ? 'ruoshui-media' : ticket.provider,
          objectKey: ticket.objectKey,
          mimeType,
          sizeBytes: file.size,
          sceneId,
          status: 'ready'
        });

        uploadedMediaIds.push(mediaAsset.id);
      }

      const createdPost = await createForumPost({
        sceneId,
        pinId: composerPinId || undefined,
        title: composerTitle,
        excerpt: composerExcerpt || undefined,
        body: composerBody,
        coverAssetId: uploadedMediaIds[0],
        mediaAssetIds: uploadedMediaIds,
        status: composerStatus
      });

      const detail = await fetchForumPostDetail(createdPost.id);
      await refreshCommunity(activePinId);

      startTransition(() => {
        setActiveView('detail');
        setSelectedPost(detail);
      });
      setComposerBody('');
      setComposerExcerpt('');
      setComposerFiles([]);
      setComposerMessage('笔记已经发出去了，现在可以继续补图或者再写下一条。');
      setComposerPinId('');
      setComposerStatus('published');
      setComposerTitle('');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '发布失败了，请稍后再试。'
      );
    } finally {
      setIsPublishing(false);
    }
  }

  const sheetClassName = cn(
    'fixed z-[8] overflow-hidden border border-community-outline/72 p-0 shadow-community',
    scrollAreaClassNames.thin,
    isMobile
      ? 'left-[calc(0.45rem+var(--safe-left))] right-[calc(0.45rem+var(--safe-right))] bottom-[calc(0.35rem+var(--safe-bottom))] top-auto h-[min(calc(var(--app-height)*0.84),780px)] rounded-[28px]'
      : 'left-1/2 top-[calc(1rem+var(--safe-top))] h-[calc(var(--app-height)-2rem)] w-[min(1120px,calc(100vw-2.5rem))] -translate-x-1/2 rounded-[34px]'
  );
  const heroPreviewImage = scenePreviewImage ?? posts[0]?.mediaAssets[0]?.publicUrl;
  const selectedPin = pins.find((pin) => pin.id === activePinId) ?? null;
  const relatedPosts = selectedPost
    ? posts.filter((post) => post.id !== selectedPost.id).slice(0, 4)
    : posts.slice(0, 4);
  const topPins = pins.slice(0, 8);
  const showDetailSecondaryRail = !isMobile;
  const shellSurfaceClassName = 'bg-community-bg/74 backdrop-blur-[28px]';
  const shellBodyClassName = 'bg-[linear-gradient(180deg,rgba(246,239,231,0.76)_0%,rgba(243,232,220,0.72)_58%,rgba(241,227,214,0.68)_100%)]';
  const chromeSurfaceClassName = 'bg-community-panel/62';
  const panelSurfaceClassName = 'bg-community-panel/66';
  const panelStrongSurfaceClassName = 'bg-community-panel-strong/68';
  const softSurfaceClassName = 'bg-community-bg/58';
  const tabButtonClassName =
    'h-10 rounded-full border px-4 text-[12px] font-medium transition-[transform,background-color,border-color,color] duration-180 ease-out hover:-translate-y-px';
  const utilityButtonClassName =
    cn(
      'h-10 rounded-full border border-community-outline/80 px-4 text-[12px] font-medium text-community-ink transition-[transform,background-color,border-color,color] duration-180 ease-out hover:-translate-y-px hover:border-community-accent/60 hover:text-community-accent',
      chromeSurfaceClassName
    );
  const inputClassName =
    cn(
      'w-full rounded-[20px] border border-community-outline/72 px-4 py-3 text-[14px] leading-[1.6] text-community-ink outline-none transition-[border-color,box-shadow,background-color] duration-180 ease-out placeholder:text-community-muted/72 focus:border-community-accent/72 focus:bg-white focus:shadow-[0_0_0_4px_rgba(155,184,116,0.14)]',
      'bg-community-panel/72'
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-label="若水广场社区"
        className={cn(sheetClassName, shellSurfaceClassName)}
        side={isMobile ? 'bottom' : 'right'}
      >
        <div className={cn('flex h-full min-h-0 flex-col text-community-ink', shellBodyClassName)}>
          <div className="border-b border-community-outline/72 px-5 pt-5 pb-4 max-[760px]:px-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="mt-1 grid gap-4">
                  <div className="min-w-0">
                    <h2 className="m-0 text-[30px] leading-[0.98] tracking-[-0.06em] max-[760px]:text-[26px]">
                      社区笔记
                    </h2>
                    <p className="mt-2 mb-0 max-w-[38rem] text-[14px] leading-[1.7] text-community-muted">
                      浏览、查看详情，再回到场景点位。
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    className={cn(
                      tabButtonClassName,
                      activeView === 'feed'
                        ? 'border-community-accent bg-community-accent text-white'
                        : cn('border-community-outline/80 text-community-ink', chromeSurfaceClassName)
                    )}
                    onClick={() => setActiveView('feed')}
                    type="button"
                  >
                    推荐流
                  </button>
                  <button
                    className={cn(
                      tabButtonClassName,
                      activeView === 'compose'
                        ? 'border-community-accent bg-community-accent text-white'
                        : cn('border-community-outline/80 text-community-ink', chromeSurfaceClassName)
                    )}
                    onClick={() => setActiveView('compose')}
                    type="button"
                  >
                    写笔记
                  </button>
                  <button
                    className={utilityButtonClassName}
                    disabled={isRefreshing}
                    onClick={() => void refreshCommunity(activePinId)}
                    type="button"
                  >
                    {isRefreshing ? '刷新中' : '刷新'}
                  </button>
                </div>
              </div>

              <button
                aria-label="关闭社区面板"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-community-outline/80 text-[20px] leading-none text-community-ink transition-[transform,border-color,color] duration-180 ease-out hover:-translate-y-px hover:border-community-accent/60 hover:text-community-accent',
                  chromeSurfaceClassName
                )}
                onClick={() => onOpenChange(false)}
                type="button"
              >
                ×
              </button>
            </div>
          </div>

          <div className={cn('flex-1 min-h-0 overflow-y-auto px-5 py-5 max-[760px]:px-4', scrollAreaClassNames.thin)}>
            {errorMessage ? (
              <div className="mb-4 rounded-[22px] border border-[#d39c8b] bg-[#fff0e9] px-4 py-3 text-[13px] leading-[1.6] text-[#8a4d3b]">
                {errorMessage}
              </div>
            ) : null}

            {activeView === 'feed' ? (
              <div className="grid gap-4">
                <div className="grid gap-4">
                  <section className={cn('grid gap-3 rounded-[30px] border border-community-outline/75 px-4 py-4 shadow-community', panelSurfaceClassName)}>
                    <div className="grid gap-1">
                      <h3 className="m-0 text-[22px] leading-[1.04] tracking-[-0.05em]">
                        {selectedPin?.title ?? '全部笔记'}
                      </h3>
                      <p className="m-0 text-[13px] leading-[1.65] text-community-muted">
                        {selectedPin?.summary ?? `当前 ${posts.length} 篇笔记。`}
                      </p>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                      <button
                        className={cn(
                          tabButtonClassName,
                          'shrink-0',
                          activePinId === null
                            ? 'border-community-accent bg-community-accent text-white'
                            : cn('border-community-outline/80 text-community-ink', softSurfaceClassName)
                        )}
                        onClick={() => void handlePinFilter(null)}
                        type="button"
                      >
                        全部
                      </button>
                      {topPins.map((pin) => (
                        <button
                          key={pin.id}
                          className={cn(
                            tabButtonClassName,
                            'shrink-0',
                            activePinId === pin.id
                              ? 'border-community-accent bg-community-accent text-white'
                              : cn('border-community-outline/80 text-community-ink', softSurfaceClassName)
                          )}
                          onClick={() => void handlePinFilter(pin)}
                          type="button"
                        >
                          {pin.title}
                        </button>
                      ))}
                    </div>
                  </section>

                  <div className={isMobile ? 'grid gap-3' : 'columns-2 [column-gap:0.9rem]'}>
                    {posts.length > 0 ? (
                      posts.map((post, index) => (
                        <button
                          key={post.id}
                          className={cn(
                            'group w-full text-left',
                            !isMobile && 'mb-4 inline-block break-inside-avoid'
                          )}
                          onClick={() => void openPostDetail(post.id)}
                          type="button"
                        >
                          <article className={cn('overflow-hidden rounded-[30px] border border-community-outline/75 shadow-community transition-[transform,box-shadow,border-color] duration-220 ease-out group-hover:-translate-y-1 group-hover:border-community-accent/55', panelSurfaceClassName)}>
                            {post.mediaAssets[0]?.publicUrl ? (
                              <div className={cn('overflow-hidden', panelStrongSurfaceClassName, getPostCardHeight(index, true))}>
                                <img
                                  alt={post.title}
                                  className="block h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
                                  src={post.mediaAssets[0].publicUrl}
                                />
                              </div>
                            ) : (
                              <div
                                className={cn(
                                  'flex items-end bg-[linear-gradient(180deg,#efe3d6_0%,#e4d0bc_100%)] px-4 py-4',
                                  getPostCardHeight(index, false)
                                )}
                              >
                                <p className="m-0 max-w-[12rem] text-[18px] font-medium leading-[1.2] text-community-ink">
                                  {post.pins[0]?.title ?? sceneTitle}
                                </p>
                              </div>
                            )}

                            <div className="grid gap-3 px-4 py-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-community-accent">
                                    {post.pins[0]?.title ?? '未绑点位'}
                                  </p>
                                  <h3 className="mt-2 line-clamp-2 text-[20px] leading-[1.18] tracking-[-0.045em] text-community-ink">
                                    {post.title}
                                  </h3>
                                </div>
                                {post.status !== 'published' ? (
                                  <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium text-community-muted', softSurfaceClassName)}>
                                    {postStatusLabels[post.status]}
                                  </span>
                                ) : null}
                              </div>
                              <p className="m-0 text-[13px] leading-[1.65] text-community-muted">
                                {getPostPreview(post)}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-community-muted">
                                <span>{formatPostDate(post.createdAt)}</span>
                                <div className="flex items-center gap-2">
                                  <span>{post.mediaAssets.length} 图</span>
                                  <span>{getPostReadTime(post.body)} 分钟</span>
                                </div>
                              </div>
                            </div>
                          </article>
                        </button>
                      ))
                    ) : (
                      <div className={cn('rounded-[30px] border border-community-outline/75 px-5 py-6 shadow-community', panelSurfaceClassName)}>
                        <h3 className="m-0 text-[20px] leading-[1.1] tracking-[-0.04em]">
                          还没有笔记
                        </h3>
                        <p className="mt-3 mb-0 text-[13px] leading-[1.65] text-community-muted">
                          现在还没有可浏览的图文。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            {activeView === 'detail' ? (
              <div className={cn('grid gap-5', showDetailSecondaryRail && 'grid-cols-[minmax(0,1fr)_320px]')}>
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      className={cn('border-community-outline/80 px-5 text-community-ink hover:border-community-accent/60 hover:text-community-accent', chromeSurfaceClassName)}
                      onClick={() => setActiveView('feed')}
                      variant="secondary"
                    >
                      返回推荐流
                    </Button>
                    {selectedPost?.pins[0] ? (
                      <Button
                        className="border-community-accent/24 bg-community-accent/10 px-5 text-community-accent hover:border-community-accent/40"
                        onClick={() => void handlePinFilter(selectedPost.pins[0])}
                        variant="tertiary"
                      >
                        查看同点位笔记
                      </Button>
                    ) : null}
                  </div>

                  {isDetailLoading ? (
                    <div className={cn('rounded-[30px] border border-community-outline/75 px-5 py-6 shadow-community', panelSurfaceClassName)}>
                      <p className="m-0 text-[13px] leading-[1.65] text-community-muted">
                        正在把笔记详情和点位关系拉过来。
                      </p>
                    </div>
                  ) : selectedPost ? (
                    <article className={cn('overflow-hidden rounded-[30px] border border-community-outline/75 shadow-community', panelSurfaceClassName)}>
                      {selectedPost.mediaAssets[0]?.publicUrl ? (
                        <img
                          alt={selectedPost.title}
                          className={cn('block h-72 w-full object-cover max-[760px]:h-60', panelStrongSurfaceClassName)}
                          src={selectedPost.mediaAssets[0].publicUrl}
                        />
                      ) : null}
                      <div className="grid gap-5 px-5 py-5">
                        <header className="grid gap-2">
                          <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-community-accent">
                            {selectedPost.pins[0]?.title ?? '未绑点位'}
                          </p>
                          <h3 className="m-0 text-[32px] leading-[1.02] tracking-[-0.065em] max-[760px]:text-[28px]">
                            {selectedPost.title}
                          </h3>
                          <div className="flex flex-wrap gap-2 text-[11px] text-community-muted">
                            <span>{formatPostDate(selectedPost.createdAt)}</span>
                            <span>{selectedPost.mediaAssets.length} 张图</span>
                            <span>{selectedPost.pins.length} 个点位</span>
                            <span>{getPostReadTime(selectedPost.body)} 分钟阅读</span>
                          </div>
                          {selectedPost.excerpt ? (
                            <p className="m-0 text-[15px] leading-[1.75] text-community-muted">
                              {selectedPost.excerpt}
                            </p>
                          ) : null}
                        </header>

                        <article className="whitespace-pre-wrap text-[15px] leading-[1.9] text-community-ink/88">
                          {selectedPost.body}
                        </article>

                        {selectedPost.mediaAssets.length > 1 ? (
                          <div className="grid gap-3 sm:grid-cols-2">
                            {selectedPost.mediaAssets.slice(1).map((mediaAsset) =>
                              mediaAsset.publicUrl ? (
                                <img
                                  key={mediaAsset.id}
                                  alt={selectedPost.title}
                                  className={cn('block h-44 w-full rounded-[26px] object-cover', panelStrongSurfaceClassName)}
                                  src={mediaAsset.publicUrl}
                                />
                              ) : null
                            )}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  ) : (
                    <div className={cn('rounded-[30px] border border-community-outline/75 px-5 py-6 shadow-community', panelSurfaceClassName)}>
                      <p className="m-0 text-[13px] leading-[1.65] text-community-muted">
                        先从推荐流里选一条，再展开详情。
                      </p>
                    </div>
                  )}
                </div>

                {showDetailSecondaryRail ? (
                  <aside className="grid gap-4 self-start">
                  <section className={cn('grid gap-3 rounded-[30px] border border-community-outline/75 px-4 py-4 shadow-community', panelSurfaceClassName)}>
                    <div className="grid gap-1">
                      <p className="m-0 text-[10px] uppercase tracking-[0.22em] text-community-accent">
                        Scene Link
                      </p>
                      <h3 className="m-0 text-[20px] leading-[1.08] tracking-[-0.04em]">
                        关联点位
                      </h3>
                    </div>
                    {selectedPost?.pins.length ? (
                      <div className="grid gap-2">
                        {selectedPost.pins.map((pin) => (
                          <Button
                            className={cn('justify-start border-community-outline/80 px-4 text-left text-community-ink hover:border-community-accent/60 hover:text-community-accent', softSurfaceClassName)}
                            key={pin.id}
                            onClick={() => handleReturnToScene(pin)}
                            variant="secondary"
                          >
                            回到 {pin.title}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="m-0 text-[13px] leading-[1.65] text-community-muted">
                        这条笔记暂时还没绑到具体点位。
                      </p>
                    )}
                  </section>

                  <section className={cn('grid gap-3 rounded-[30px] border border-community-outline/75 px-4 py-4 shadow-community', panelSurfaceClassName)}>
                    <div className="grid gap-1">
                      <p className="m-0 text-[10px] uppercase tracking-[0.22em] text-community-accent">
                        Related
                      </p>
                      <h3 className="m-0 text-[20px] leading-[1.08] tracking-[-0.04em]">
                        继续往下刷
                      </h3>
                    </div>
                    <div className="grid gap-2">
                      {relatedPosts.length > 0 ? (
                        relatedPosts.map((post) => (
                          <button
                            key={post.id}
                            className={cn('grid gap-1 rounded-[22px] border border-community-outline/72 px-4 py-3 text-left transition-[transform,border-color,background-color] duration-180 ease-out hover:-translate-y-px hover:border-community-accent/44 hover:bg-white', softSurfaceClassName)}
                            onClick={() => void openPostDetail(post.id)}
                            type="button"
                          >
                            <span className="text-[13px] font-medium text-community-ink">
                              {post.title}
                            </span>
                            <span className="text-[12px] leading-[1.6] text-community-muted">
                              {getPostPreview(post)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="m-0 text-[13px] leading-[1.65] text-community-muted">
                          还没有更多推荐。
                        </p>
                      )}
                    </div>
                  </section>
                  </aside>
                ) : null}
              </div>
            ) : null}

            {activeView === 'compose' ? (
              <div className="grid gap-5">
                <form className="grid gap-4" onSubmit={handleSubmitPost}>
                  <section className={cn('grid gap-4 rounded-[30px] border border-community-outline/75 p-4 shadow-community', panelSurfaceClassName)}>
                    <div className="grid gap-1">
                      <h3 className="m-0 text-[26px] leading-[1.03] tracking-[-0.055em] max-[760px]:text-[24px]">
                        写笔记
                      </h3>
                      <p className="m-0 text-[13px] leading-[1.65] text-community-muted">
                        第一张图会作为封面。
                      </p>
                    </div>

                    <label className="grid gap-2 text-[12px] font-medium text-community-muted">
                      标题
                      <input
                        className={inputClassName}
                        maxLength={160}
                        onChange={(event) => setComposerTitle(event.target.value)}
                        placeholder="比如：若水广场边上那条路，晚上的风最容易记住"
                        required
                        value={composerTitle}
                      />
                    </label>

                    <label className="grid gap-2 text-[12px] font-medium text-community-muted">
                      摘要
                      <input
                        className={inputClassName}
                        maxLength={280}
                        onChange={(event) => setComposerExcerpt(event.target.value)}
                        placeholder="给推荐流一句短短的引子。"
                        value={composerExcerpt}
                      />
                    </label>

                    <label className="grid gap-2 text-[12px] font-medium text-community-muted">
                      正文
                      <textarea
                        className={cn(inputClassName, 'min-h-[240px] resize-y')}
                        onChange={(event) => setComposerBody(event.target.value)}
                        placeholder="把那段记忆、那个位置、为什么想记住它写下来。"
                        required
                        value={composerBody}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-[12px] font-medium text-community-muted">
                        关联点位
                        <select
                          className={inputClassName}
                          onChange={(event) => setComposerPinId(event.target.value)}
                          value={composerPinId}
                        >
                          <option value="">暂不关联</option>
                          {pins.map((pin) => (
                            <option key={pin.id} value={pin.id}>
                              {pin.title}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="grid gap-2 text-[12px] font-medium text-community-muted">
                        可见性
                        <select
                          className={inputClassName}
                          onChange={(event) => setComposerStatus(event.target.value as PostStatus)}
                          value={composerStatus}
                        >
                          <option value="published">直接发布</option>
                          <option value="draft">先存草稿</option>
                          <option value="archived">归档</option>
                        </select>
                      </label>
                    </div>

                    <label className="grid gap-2 text-[12px] font-medium text-community-muted">
                      图片
                      <div className={cn('grid gap-3 rounded-[24px] border border-dashed border-community-outline px-4 py-4', softSurfaceClassName)}>
                        <input
                          accept="image/*"
                          className="text-[12px] text-community-muted"
                          multiple
                          onChange={(event) =>
                            setComposerFiles(Array.from(event.target.files ?? []))
                          }
                          type="file"
                        />
                        {composerFiles.length > 0 ? (
                          <div className="grid gap-2">
                            {composerFiles.map((file) => (
                              <div
                                key={`${file.name}-${file.size}`}
                                className={cn('flex items-center justify-between gap-3 rounded-[18px] px-3 py-3 text-[12px] text-community-ink', chromeSurfaceClassName)}
                              >
                                <span className="truncate">{file.name}</span>
                                <span className="shrink-0 text-community-muted">
                                  {formatFileSize(file.size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="m-0 text-[12px] leading-[1.6] text-community-muted">
                            直接选多张图即可，当前会按顺序上传，并把第一张当封面。
                          </p>
                        )}
                      </div>
                    </label>

                    {composerMessage ? (
                      <p className="m-0 rounded-[20px] border border-community-accent/20 bg-community-accent/10 px-4 py-3 text-[12px] leading-[1.6] text-community-accent">
                        {composerMessage}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="px-5"
                        disabled={isPublishing}
                        type="submit"
                      >
                        {isPublishing ? '正在发布' : '发布笔记'}
                      </Button>
                      <Button
                        className={cn('border-community-outline/80 px-5 text-community-ink hover:border-community-accent/60 hover:text-community-accent', softSurfaceClassName)}
                        disabled={isPublishing}
                        onClick={() => {
                          setComposerBody('');
                          setComposerExcerpt('');
                          setComposerFiles([]);
                          setComposerMessage(null);
                          setComposerPinId('');
                          setComposerStatus('published');
                          setComposerTitle('');
                        }}
                        variant="secondary"
                      >
                        清空
                      </Button>
                    </div>
                  </section>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export {
  CommunitySheet
};
