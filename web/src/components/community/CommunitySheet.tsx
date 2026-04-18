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
import {
  scrollAreaClassNames,
  surfaceClassNames
} from '../../styles/system';
import { requestFocusScenePin } from '../../ui/commands/viewer-command-bus';
import { cn } from '../../utils/cn';
import { Button } from '../ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';
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

function formatFileSize(sizeBytes: number) {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
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

      const [bootstrap, feed] = await Promise.all([
        fetchSceneBootstrap(sceneId),
        nextPinId
          ? fetchPostsForScenePin(sceneId, nextPinId)
          : fetchForumPosts({
              sceneId,
              status: 'published',
              limit: 18
            })
      ]);

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

    await refreshCommunity(nextPinId);
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
      setComposerMessage('帖子已经发出去了，可以继续补下一条。');
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
    'fixed z-[8] overflow-hidden border border-outline/18 bg-[linear-gradient(180deg,rgba(53,42,35,0.96)_0%,rgba(24,19,17,0.96)_100%)] p-0 shadow-panel backdrop-blur-[20px]',
    scrollAreaClassNames.thin,
    isMobile
      ? 'left-[calc(0.45rem+var(--safe-left))] right-[calc(0.45rem+var(--safe-right))] bottom-[calc(0.35rem+var(--safe-bottom))] top-auto h-[min(calc(var(--app-height)*0.82),760px)] rounded-[28px]'
      : 'top-[calc(0.9rem+var(--safe-top))] right-[calc(0.9rem+var(--safe-right))] h-[calc(var(--app-height)-1.8rem)] w-[min(460px,calc(100vw-2rem))] rounded-[30px]'
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-label="若水广场社区"
        className={sheetClassName}
        side={isMobile ? 'bottom' : 'right'}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-outline/14 px-5 pt-5 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="m-0 text-[10px] uppercase tracking-[0.18em] text-brand/84">
                  Cloudflare 社区
                </p>
                <h2 className="mt-2 text-[24px] leading-[1.02] tracking-[-0.05em] text-ink">
                  图文帖子、点位联动与轻发布
                </h2>
                <p className="mt-2 text-[13px] leading-[1.55] text-ink-muted/76">
                  先把这版场景做成一个能发、能看、能从帖子回到点位的最小闭环。
                </p>
              </div>

              <Button
                aria-label="关闭社区面板"
                className="h-10 w-10 rounded-full px-0 text-[20px] leading-none"
                onClick={() => onOpenChange(false)}
                variant="ghost"
              >
                ×
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="min-w-[96px]"
                onClick={() => setActiveView('feed')}
                variant={activeView === 'feed' ? 'primary' : 'secondary'}
              >
                帖子流
              </Button>
              <Button
                className="min-w-[96px]"
                onClick={() => setActiveView('compose')}
                variant={activeView === 'compose' ? 'primary' : 'secondary'}
              >
                发一条
              </Button>
              <Button
                className="min-w-[96px]"
                disabled={isRefreshing}
                onClick={() => void refreshCommunity(activePinId)}
                variant="tertiary"
              >
                {isRefreshing ? '刷新中' : '刷新'}
              </Button>
            </div>
          </div>

          <div className={cn('flex-1 min-h-0 overflow-y-auto px-5 py-5', scrollAreaClassNames.thin)}>
            {errorMessage ? (
              <div className="mb-4 rounded-[20px] border border-[rgba(227,158,158,0.24)] bg-[rgba(74,35,31,0.42)] px-4 py-3 text-[13px] leading-[1.55] text-[#f1c9c1]">
                {errorMessage}
              </div>
            ) : null}

            {activeView === 'compose' ? (
              <form className="grid gap-4" onSubmit={handleSubmitPost}>
                <Card>
                  <CardContent className="grid gap-4 p-4">
                    <CardHeader className="grid gap-1">
                      <CardTitle className="text-[20px]">发布一条新帖子</CardTitle>
                      <CardDescription>
                        先用最小表单把标题、正文、多图和点位关联打通。
                      </CardDescription>
                    </CardHeader>

                    <label className="grid gap-2 text-[12px] text-ink-muted/82">
                      标题
                      <input
                        className={cn(surfaceClassNames.subtle, 'rounded-[16px] px-3 py-2.5 text-[14px] text-ink outline-none')}
                        maxLength={160}
                        onChange={(event) => setComposerTitle(event.target.value)}
                        placeholder="比如：若水广场边上那条路，晚上的风最容易记住"
                        required
                        value={composerTitle}
                      />
                    </label>

                    <label className="grid gap-2 text-[12px] text-ink-muted/82">
                      摘要
                      <input
                        className={cn(surfaceClassNames.subtle, 'rounded-[16px] px-3 py-2.5 text-[14px] text-ink outline-none')}
                        maxLength={280}
                        onChange={(event) => setComposerExcerpt(event.target.value)}
                        placeholder="先给列表页一句短短的引子。"
                        value={composerExcerpt}
                      />
                    </label>

                    <label className="grid gap-2 text-[12px] text-ink-muted/82">
                      正文
                      <textarea
                        className={cn(surfaceClassNames.subtle, 'min-h-[180px] rounded-[18px] px-3 py-3 text-[14px] leading-[1.6] text-ink outline-none')}
                        onChange={(event) => setComposerBody(event.target.value)}
                        placeholder="把那段记忆、那个位置、为什么想记住它写下来。"
                        required
                        value={composerBody}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2 text-[12px] text-ink-muted/82">
                        关联点位
                        <select
                          className={cn(surfaceClassNames.subtle, 'rounded-[16px] px-3 py-2.5 text-[14px] text-ink outline-none')}
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

                      <label className="grid gap-2 text-[12px] text-ink-muted/82">
                        可见性
                        <select
                          className={cn(surfaceClassNames.subtle, 'rounded-[16px] px-3 py-2.5 text-[14px] text-ink outline-none')}
                          onChange={(event) => setComposerStatus(event.target.value as PostStatus)}
                          value={composerStatus}
                        >
                          <option value="published">直接发布</option>
                          <option value="draft">先存草稿</option>
                          <option value="archived">归档</option>
                        </select>
                      </label>
                    </div>

                    <label className="grid gap-2 text-[12px] text-ink-muted/82">
                      图片
                      <input
                        accept="image/*"
                        className="text-[12px] text-ink-muted/72"
                        multiple
                        onChange={(event) =>
                          setComposerFiles(Array.from(event.target.files ?? []))
                        }
                        type="file"
                      />
                      {composerFiles.length > 0 ? (
                        <div className="grid gap-2 rounded-[18px] border border-outline/14 bg-ink/4 px-3 py-3">
                          {composerFiles.map((file) => (
                            <div key={`${file.name}-${file.size}`} className="flex items-center justify-between gap-3 text-[12px] text-ink-muted/82">
                              <span className="truncate">{file.name}</span>
                              <span className="shrink-0 text-ink-muted/56">{formatFileSize(file.size)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="m-0 text-[12px] leading-[1.5] text-ink-muted/58">
                          可以直接选多张图；当前会按顺序上传，并把第一张当封面。
                        </p>
                      )}
                    </label>

                    {composerMessage ? (
                      <p className="m-0 rounded-[16px] border border-brand/20 bg-brand/10 px-3 py-2 text-[12px] leading-[1.5] text-[#dceec1]">
                        {composerMessage}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <Button disabled={isPublishing} type="submit">
                        {isPublishing ? '正在发布' : '发布帖子'}
                      </Button>
                      <Button
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
                  </CardContent>
                </Card>
              </form>
            ) : null}

            {activeView === 'feed' ? (
              <div className="grid gap-4">
                <Card>
                  <CardContent className="grid gap-3 p-4">
                    <CardHeader className="grid gap-1">
                      <CardTitle className="text-[18px]">场景点位</CardTitle>
                      <CardDescription>
                        先按点位筛帖子，再决定要不要飞回那一个位置。
                      </CardDescription>
                    </CardHeader>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => void handlePinFilter(null)}
                        variant={activePinId === null ? 'primary' : 'secondary'}
                      >
                        全部帖子
                      </Button>
                      {pins.map((pin) => (
                        <Button
                          key={pin.id}
                          onClick={() => void handlePinFilter(pin)}
                          variant={activePinId === pin.id ? 'primary' : 'secondary'}
                        >
                          {pin.title}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-3">
                  {posts.length > 0 ? (
                    posts.map((post) => (
                      <button
                        key={post.id}
                        className="w-full text-left"
                        onClick={() => void openPostDetail(post.id)}
                        type="button"
                      >
                        <Card className="overflow-hidden transition-transform duration-180 ease-out hover:-translate-y-px">
                          {post.mediaAssets[0]?.publicUrl ? (
                            <img
                              alt={post.title}
                              className="block h-44 w-full object-cover bg-ink/6"
                              src={post.mediaAssets[0].publicUrl}
                            />
                          ) : null}
                          <CardContent className="grid gap-3 p-4">
                            <CardHeader className="grid gap-1">
                              <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-brand/84">
                                {post.pins[0]?.title ?? '未绑点位'}
                              </p>
                              <CardTitle className="text-[20px]">{post.title}</CardTitle>
                            </CardHeader>
                            <CardDescription>
                              {post.excerpt ?? post.body.slice(0, 120)}
                            </CardDescription>
                            <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.08em] text-ink-muted/52">
                              <span>{post.mediaAssets.length} 张图</span>
                              <span>{post.pins.length} 个点位</span>
                              <span>{post.status}</span>
                            </div>
                          </CardContent>
                        </Card>
                      </button>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-4">
                        <CardTitle className="text-[18px]">还没有帖子</CardTitle>
                        <CardDescription>
                          这版社区壳已经接好了。你现在就可以发第一条，把图文和点位真正绑起来。
                        </CardDescription>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            ) : null}

            {activeView === 'detail' ? (
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Button onClick={() => setActiveView('feed')} variant="secondary">
                    返回帖子流
                  </Button>
                  {selectedPost?.pins[0] ? (
                    <Button
                      onClick={() => void handlePinFilter(selectedPost.pins[0])}
                      variant="tertiary"
                    >
                      查看同点位帖子
                    </Button>
                  ) : null}
                </div>

                {isDetailLoading ? (
                  <Card>
                    <CardContent className="p-4">
                      <CardDescription>正在把帖子详情和点位关系拉过来。</CardDescription>
                    </CardContent>
                  </Card>
                ) : selectedPost ? (
                  <Card className="overflow-hidden">
                    {selectedPost.mediaAssets[0]?.publicUrl ? (
                      <img
                        alt={selectedPost.title}
                        className="block h-56 w-full object-cover bg-ink/6"
                        src={selectedPost.mediaAssets[0].publicUrl}
                      />
                    ) : null}
                    <CardContent className="grid gap-4 p-4">
                      <CardHeader className="grid gap-2">
                        <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-brand/84">
                          {selectedPost.pins[0]?.title ?? '未绑点位'}
                        </p>
                        <CardTitle className="text-[24px]">{selectedPost.title}</CardTitle>
                        {selectedPost.excerpt ? (
                          <CardDescription>{selectedPost.excerpt}</CardDescription>
                        ) : null}
                      </CardHeader>

                      <article className="text-[14px] leading-[1.75] text-ink-muted/84 whitespace-pre-wrap">
                        {selectedPost.body}
                      </article>

                      {selectedPost.mediaAssets.length > 1 ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          {selectedPost.mediaAssets.slice(1).map((mediaAsset) =>
                            mediaAsset.publicUrl ? (
                              <img
                                key={mediaAsset.id}
                                alt={selectedPost.title}
                                className="block h-36 w-full rounded-[20px] object-cover bg-ink/6"
                                src={mediaAsset.publicUrl}
                              />
                            ) : null
                          )}
                        </div>
                      ) : null}

                      <div className="grid gap-3">
                        <h3 className="m-0 text-[14px] uppercase tracking-[0.12em] text-brand/84">
                          关联点位
                        </h3>
                        {selectedPost.pins.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedPost.pins.map((pin) => (
                              <Button
                                key={pin.id}
                                onClick={() =>
                                  requestFocusScenePin({
                                    pinId: pin.id,
                                    position: [pin.position.x, pin.position.y, pin.position.z],
                                    target: pin.target
                                      ? [pin.target.x, pin.target.y, pin.target.z]
                                      : undefined,
                                    title: pin.title
                                  })
                                }
                                variant="secondary"
                              >
                                回到 {pin.title}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <p className="m-0 text-[13px] leading-[1.6] text-ink-muted/62">
                            这条帖子暂时还没绑到具体点位。
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-4">
                      <CardDescription>先从帖子流里选一条，再展开详情。</CardDescription>
                    </CardContent>
                  </Card>
                )}
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
