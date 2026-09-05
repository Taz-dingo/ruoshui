import type {
  Place,
  StoryDraft,
  StoryLocation,
  UploadTicket,
  User,
} from '@ruoshui/shared';
import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  confirmStoryMedia,
  createStoryDraft,
  fetchCurrentUser,
  fetchPlaces,
  fetchStoryDrafts,
  getPublishedStoryMediaUrl,
  requestEmailOtp,
  requestStoryUploadTicket,
  submitStoryDraft,
  updateDisplayName,
  updateStoryDraft,
  uploadFileWithTicket,
  verifyEmailOtp,
} from '../../community/content-api';
import { scrollAreaClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';
import { SpatialAnchorEditorOverlay } from './SpatialAnchorEditorOverlay';

interface StoryComposerFlowProps {
  onOpenChange: (open: boolean) => void;
  open: boolean;
  sceneId: string;
}

type FlowStep = 'checking' | 'email' | 'otp' | 'profile' | 'editor' | 'submitted';
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
type LocalMediaStatus = 'uploading' | 'ready' | 'error' | 'restored';

interface LocalMedia {
  assetId?: string;
  clientId: string;
  error?: string;
  file?: File;
  name: string;
  previewUrl?: string;
  status: LocalMediaStatus;
}

interface EditorSnapshot {
  body: string;
  location: StoryLocation;
  mediaAssetIds: string[];
  memoryTime: string;
  title: string;
}

const inputClassName =
  'w-full border-0 border-b border-black/10 bg-transparent px-0 py-3 text-[15px] leading-[1.6] text-[#191919] outline-none placeholder:text-black/32 focus:border-brand';

function defaultDisplayName(user: User) {
  return `若水用户 ${user.id.slice(-4).toUpperCase()}`;
}

function createClientId() {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function revokePreviewUrl(previewUrl?: string) {
  if (previewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl);
  }
}

function getMediaAssetIds(media: LocalMedia[]) {
  return media.flatMap((item) => (item.assetId ? [item.assetId] : []));
}

function hasMeaningfulDraft(snapshot: EditorSnapshot) {
  return Boolean(
    snapshot.title.trim() ||
      snapshot.body.trim() ||
      snapshot.memoryTime.trim() ||
      snapshot.mediaAssetIds.length ||
      snapshot.location.kind !== 'none'
  );
}

function hasPublishableStory(snapshot: EditorSnapshot) {
  return Boolean(snapshot.body.trim() || snapshot.mediaAssetIds.length);
}

function StoryComposerFlow({ onOpenChange, open, sceneId }: StoryComposerFlowProps) {
  const [step, setStep] = useState<FlowStep>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placePickerOpen, setPlacePickerOpen] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [memoryTime, setMemoryTime] = useState('');
  const [location, setLocation] = useState<StoryLocation>({ kind: 'none' });
  const [media, setMedia] = useState<LocalMedia[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const storyIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const mediaRef = useRef<LocalMedia[]>([]);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    return () => {
      for (const item of mediaRef.current) {
        revokePreviewUrl(item.previewUrl);
      }
    };
  }, []);

  function resetEditorState() {
    for (const item of mediaRef.current) {
      revokePreviewUrl(item.previewUrl);
    }
    setTitle('');
    setBody('');
    setMemoryTime('');
    setLocation({ kind: 'none' });
    setMedia([]);
    setSaveStatus('idle');
    setRestoredDraft(false);
    setPlacePickerOpen(false);
    setPlaceQuery('');
    setAnchorEditorOpen(false);
    storyIdRef.current = null;
  }

  function hydrateDraft(draft: StoryDraft) {
    resetEditorState();
    storyIdRef.current = draft.story.id;
    setTitle(draft.revision.title ?? '');
    setBody(draft.revision.body ?? '');
    setMemoryTime(draft.revision.memoryTime ?? '');
    setLocation(draft.revision.location);
    const canReadPublishedMedia =
      draft.story.status === 'active' && Boolean(draft.story.publishedRevisionId);
    setMedia(
      draft.revision.mediaAssetIds.map((assetId, index) => ({
        assetId,
        clientId: `restored_${assetId}`,
        name: `已保存照片 ${index + 1}`,
        ...(canReadPublishedMedia
          ? { previewUrl: getPublishedStoryMediaUrl(draft.story.id, assetId) }
          : {}),
        status: 'restored',
      }))
    );
    setRestoredDraft(true);
    setSaveStatus('saved');
  }

  async function loadEditorData() {
    setPlacesLoading(true);
    setMessage(null);

    const [placeResult, draftResult] = await Promise.allSettled([
      fetchPlaces(sceneId),
      fetchStoryDrafts(),
    ]);

    if (placeResult.status === 'fulfilled') {
      setPlaces(placeResult.value);
    } else {
      setPlaces([]);
    }

    if (draftResult.status === 'fulfilled') {
      if (draftResult.value[0]) {
        hydrateDraft(draftResult.value[0]);
      } else {
        resetEditorState();
      }
    }

    const failures = [placeResult, draftResult].filter(
      (result): result is PromiseRejectedResult => result.status === 'rejected'
    );
    if (failures.length > 0) {
      const firstReason = failures[0]?.reason;
      setMessage(
        firstReason instanceof Error
          ? firstReason.message
          : '部分故事编辑数据暂时没有加载成功。'
      );
    }

    setPlacesLoading(false);
    setStep('editor');
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStep('checking');
    setMessage(null);

    void fetchCurrentUser()
      .then(async (currentUser) => {
        if (cancelled) return;
        setUser(currentUser);
        if (!currentUser) {
          setStep('email');
          return;
        }
        await loadEditorData();
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : '登录状态读取失败。');
        setStep('email');
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function createSnapshot(): EditorSnapshot {
    return {
      title,
      body,
      memoryTime,
      mediaAssetIds: getMediaAssetIds(media),
      location,
    };
  }

  function queuePersist(snapshot: EditorSnapshot): Promise<string | null> {
    const task = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        if (!hasMeaningfulDraft(snapshot)) {
          return storyIdRef.current;
        }

        setSaveStatus('saving');
        try {
          if (!storyIdRef.current) {
            const draft = await createStoryDraft({
              title: snapshot.title,
              body: snapshot.body,
              memoryTime: snapshot.memoryTime,
              mediaAssetIds: snapshot.mediaAssetIds,
              location: snapshot.location,
            });
            storyIdRef.current = draft.story.id;
          } else {
            await updateStoryDraft(storyIdRef.current, {
              title: snapshot.title,
              body: snapshot.body,
              memoryTime: snapshot.memoryTime,
              mediaAssetIds: snapshot.mediaAssetIds,
              location: snapshot.location,
            });
          }
          setSaveStatus('saved');
          return storyIdRef.current;
        } catch (error) {
          setSaveStatus('error');
          setMessage(error instanceof Error ? error.message : '草稿保存失败。');
          throw error;
        }
      });

    saveQueueRef.current = task.catch(() => undefined);
    return task;
  }

  useEffect(() => {
    if (!open || step !== 'editor' || anchorEditorOpen) return;
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    const snapshot = createSnapshot();
    if (!hasMeaningfulDraft(snapshot) && !storyIdRef.current) return;

    saveTimerRef.current = window.setTimeout(() => {
      void queuePersist(snapshot);
    }, 850);

    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, [anchorEditorOpen, body, location, media, memoryTime, open, step, title]);

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setMessage(null);
    try {
      await requestEmailOtp(email.trim());
      setStep('otp');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码发送失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setMessage(null);
    try {
      const nextUser = await verifyEmailOtp(email.trim(), otpCode.trim());
      setUser(nextUser);
      if (!nextUser.displayName) {
        setDisplayName('');
        setStep('profile');
      } else {
        await loadEditorData();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码验证失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) {
      await loadEditorData();
      return;
    }

    setAuthBusy(true);
    setMessage(null);
    try {
      const nextUser = await updateDisplayName(displayName.trim());
      setUser(nextUser);
      await loadEditorData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '名称保存失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  async function uploadMediaItem(clientId: string, file: File, index: number) {
    setMedia((current) =>
      current.map((item) =>
        item.clientId === clientId ? { ...item, status: 'uploading', error: undefined } : item
      )
    );

    try {
      const mimeType = file.type || 'application/octet-stream';
      const ticket: UploadTicket = await requestStoryUploadTicket({
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
        category: index === 0 ? 'post-cover' : 'post-inline',
      });
      await uploadFileWithTicket(ticket, file);
      const assetId = await confirmStoryMedia({
        bucket: ticket.provider === 'r2' ? 'ruoshui-media' : ticket.provider,
        objectKey: ticket.objectKey,
        mimeType,
        sizeBytes: file.size,
        status: 'ready',
      });
      setMedia((current) =>
        current.map((item) =>
          item.clientId === clientId ? { ...item, assetId, status: 'ready' } : item
        )
      );
    } catch (error) {
      setMedia((current) =>
        current.map((item) =>
          item.clientId === clientId
            ? {
                ...item,
                status: 'error',
                error: error instanceof Error ? error.message : '上传失败',
              }
            : item
        )
      );
    }
  }

  function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (!selected.length) return;

    const room = Math.max(0, 12 - media.length);
    const files = selected.slice(0, room);
    if (selected.length > room) {
      setMessage('每个 Story 最多放 12 张照片。');
    }

    const startIndex = media.length;
    const entries: LocalMedia[] = files.map((file) => ({
      clientId: createClientId(),
      file,
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'uploading',
    }));
    setMedia((current) => [...current, ...entries]);
    entries.forEach((entry, offset) => {
      if (entry.file) void uploadMediaItem(entry.clientId, entry.file, startIndex + offset);
    });
  }

  function removeMedia(clientId: string) {
    setMedia((current) => {
      const target = current.find((item) => item.clientId === clientId);
      revokePreviewUrl(target?.previewUrl);
      return current.filter((item) => item.clientId !== clientId);
    });
  }

  function retryMedia(clientId: string) {
    const index = media.findIndex((item) => item.clientId === clientId);
    const item = media[index];
    if (item?.file) void uploadMediaItem(clientId, item.file, Math.max(0, index));
  }

  function moveMedia(clientId: string, direction: -1 | 1) {
    setMedia((current) => {
      const from = current.findIndex((item) => item.clientId === clientId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return next;
    });
  }

  function dropMedia(event: DragEvent<HTMLDivElement>, targetId: string) {
    event.preventDefault();
    if (!draggedMediaId || draggedMediaId === targetId) return;
    setMedia((current) => {
      const from = current.findIndex((item) => item.clientId === draggedMediaId);
      const to = current.findIndex((item) => item.clientId === targetId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      if (!moved) return current;
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedMediaId(null);
  }

  async function openAnchorEditor() {
    setMessage(null);
    setPlacePickerOpen(false);
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    const snapshot = createSnapshot();
    try {
      if (hasMeaningfulDraft(snapshot)) {
        await queuePersist(snapshot);
      }
      setAnchorEditorOpen(true);
    } catch {
      setMessage('先把当前草稿保存好，再去标记位置。');
    }
  }

  async function handleSubmitStory() {
    setMessage(null);
    const snapshot = createSnapshot();
    if (media.some((item) => item.status === 'uploading')) {
      setMessage('还有照片正在上传，等它们完成后再提交。');
      return;
    }
    if (media.some((item) => item.status === 'error')) {
      setMessage('有照片上传失败，请重试或删除后再提交。');
      return;
    }
    if (!hasPublishableStory(snapshot)) {
      setMessage('写一点正文，或者至少放一张照片，就可以提交了。');
      return;
    }

    setSubmitting(true);
    try {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      const storyId = await queuePersist(snapshot);
      if (!storyId) {
        throw new Error('草稿还没有创建成功。');
      }
      await submitStoryDraft(storyId);
      setStep('submitted');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '提交审核失败。');
    } finally {
      setSubmitting(false);
    }
  }

  const filteredPlaces = useMemo(() => {
    const query = placeQuery.trim().toLowerCase();
    if (!query) return places;
    return places.filter((place) =>
      `${place.name} ${place.intro ?? ''}`.toLowerCase().includes(query)
    );
  }, [placeQuery, places]);

  const selectedPlace =
    location.kind === 'place' ? places.find((place) => place.id === location.placeId) : undefined;
  const saveLabel =
    saveStatus === 'saving'
      ? '保存中…'
      : saveStatus === 'saved'
        ? '已自动保存'
        : saveStatus === 'error'
          ? '保存失败'
          : '';

  if (!open) return null;

  if (anchorEditorOpen) {
    return (
      <SpatialAnchorEditorOverlay
        onCancel={() => setAnchorEditorOpen(false)}
        onSave={(anchor) => {
          setLocation({ kind: 'anchor', anchor });
          setAnchorEditorOpen(false);
          setPlacePickerOpen(false);
        }}
      />
    );
  }

  return (
    <div
      aria-label="留下你的故事"
      aria-modal="true"
      className="fixed inset-0 z-[20] flex items-center justify-center bg-black/38 p-4 backdrop-blur-[8px] max-[760px]:items-end max-[760px]:p-0"
      role="dialog"
    >
      <div className="relative flex max-h-[min(860px,calc(var(--app-height)-2rem))] w-[min(760px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[30px] border border-white/55 bg-[rgba(249,249,247,0.96)] text-[#191919] shadow-panel max-[760px]:h-[calc(var(--app-height)-var(--safe-top))] max-[760px]:max-h-none max-[760px]:w-full max-[760px]:rounded-b-none max-[760px]:rounded-t-[28px]">
        <header className="flex min-h-16 items-center justify-between gap-3 border-b border-black/8 px-5 max-[760px]:px-4">
          <button
            className="h-10 rounded-full px-3 text-[14px] text-black/60 transition-colors hover:bg-black/5 hover:text-black"
            onClick={() => onOpenChange(false)}
            type="button"
          >
            关闭
          </button>
          <div className="min-w-0 text-center">
            <div className="text-[15px] font-semibold">留下你的故事</div>
            {step === 'editor' && saveLabel ? (
              <div className={cn('mt-0.5 text-[11px]', saveStatus === 'error' ? 'text-[#a64b42]' : 'text-black/38')}>
                {saveLabel}
              </div>
            ) : null}
          </div>
          <div className="min-w-[52px] text-right text-[12px] text-black/38">
            {user ? user.displayName ?? defaultDisplayName(user) : ''}
          </div>
        </header>

        <div className={cn('min-h-0 flex-1 overflow-y-auto', scrollAreaClassNames.thin)}>
          {message ? (
            <div className="mx-5 mt-4 rounded-[16px] bg-[#fff0ed] px-4 py-3 text-[13px] leading-[1.55] text-[#8f3d34] max-[760px]:mx-4">
              {message}
            </div>
          ) : null}

          {step === 'checking' ? (
            <div className="grid min-h-[360px] place-items-center px-6 text-[14px] text-black/45">
              正在确认登录状态…
            </div>
          ) : null}

          {step === 'email' ? (
            <form className="mx-auto grid w-full max-w-[440px] gap-5 px-6 py-16" onSubmit={handleRequestOtp}>
              <div>
                <h2 className="m-0 text-[28px] font-semibold tracking-[-0.045em]">先登录，再留下故事</h2>
                <p className="mt-3 mb-0 text-[14px] leading-[1.7] text-black/48">
                  只需要邮箱验证码。登录后草稿会绑定到你的账号，可以下次继续写。
                </p>
              </div>
              <input
                autoComplete="email"
                className={inputClassName}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="你的邮箱"
                required
                type="email"
                value={email}
              />
              <button
                className="h-12 rounded-full bg-[#191919] px-5 text-[14px] font-medium text-white disabled:opacity-45"
                disabled={authBusy}
                type="submit"
              >
                {authBusy ? '发送中…' : '获取验证码'}
              </button>
            </form>
          ) : null}

          {step === 'otp' ? (
            <form className="mx-auto grid w-full max-w-[440px] gap-5 px-6 py-16" onSubmit={handleVerifyOtp}>
              <div>
                <h2 className="m-0 text-[28px] font-semibold tracking-[-0.045em]">输入验证码</h2>
                <p className="mt-3 mb-0 text-[14px] leading-[1.7] text-black/48">验证码已经发到 {email}</p>
              </div>
              <input
                autoComplete="one-time-code"
                autoFocus
                className="w-full border-0 border-b border-black/10 bg-transparent px-0 py-3 text-center font-mono text-[30px] tracking-[0.28em] text-[#191919] outline-none focus:border-brand"
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                pattern="[0-9]{6}"
                placeholder="000000"
                required
                value={otpCode}
              />
              <button
                className="h-12 rounded-full bg-[#191919] px-5 text-[14px] font-medium text-white disabled:opacity-45"
                disabled={authBusy || otpCode.length !== 6}
                type="submit"
              >
                {authBusy ? '验证中…' : '登录'}
              </button>
              <button className="text-[13px] text-black/46" onClick={() => setStep('email')} type="button">
                换一个邮箱
              </button>
            </form>
          ) : null}

          {step === 'profile' && user ? (
            <form className="mx-auto grid w-full max-w-[440px] gap-5 px-6 py-16" onSubmit={handleSaveProfile}>
              <div>
                <h2 className="m-0 text-[28px] font-semibold tracking-[-0.045em]">欢迎来到若水</h2>
                <p className="mt-3 mb-0 text-[14px] leading-[1.7] text-black/48">
                  想让大家怎么称呼你？可以现在设置，也可以以后再说。
                </p>
              </div>
              <input
                className={inputClassName}
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={defaultDisplayName(user)}
                value={displayName}
              />
              <button
                className="h-12 rounded-full bg-[#191919] px-5 text-[14px] font-medium text-white disabled:opacity-45"
                disabled={authBusy}
                type="submit"
              >
                {displayName.trim() ? '保存并开始写' : '以后再说'}
              </button>
            </form>
          ) : null}

          {step === 'editor' ? (
            <div className="mx-auto grid w-full max-w-[700px] gap-0 px-6 py-6 max-[760px]:px-4">
              {restoredDraft ? (
                <div className="mb-5 rounded-[16px] bg-brand/12 px-4 py-3 text-[12px] leading-[1.6] text-[#52643e]">
                  已恢复草稿。你之前上传的照片和内容都还在，可以直接继续修改。
                </div>
              ) : null}

              <section className="mb-6">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[14px] font-semibold">照片</div>
                    <div className="mt-1 text-[11px] text-black/38">拖动排序，第一张就是封面 · {media.length}/12</div>
                  </div>
                  {media.length < 12 ? (
                    <label className="cursor-pointer rounded-full bg-black/6 px-4 py-2 text-[12px] font-medium text-black/62 hover:bg-black/10">
                      添加照片
                      <input
                        accept="image/*"
                        className="sr-only"
                        multiple
                        onChange={handleFilesSelected}
                        type="file"
                      />
                    </label>
                  ) : null}
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2">
                  {media.map((item, index) => (
                    <div
                      className={cn(
                        'relative h-[166px] w-[126px] shrink-0 overflow-hidden rounded-[18px] bg-[#ecece8] ring-1 ring-black/6',
                        draggedMediaId === item.clientId && 'opacity-45'
                      )}
                      draggable={item.status !== 'uploading'}
                      key={item.clientId}
                      onDragEnd={() => setDraggedMediaId(null)}
                      onDragOver={(event) => event.preventDefault()}
                      onDragStart={() => setDraggedMediaId(item.clientId)}
                      onDrop={(event) => dropMedia(event, item.clientId)}
                    >
                      {item.previewUrl ? (
                        <img alt={item.name} className="h-full w-full object-cover" src={item.previewUrl} />
                      ) : (
                        <div className="flex h-full items-center justify-center px-3 text-center text-[12px] leading-[1.5] text-black/38">
                          {item.name}
                        </div>
                      )}
                      <div className="absolute left-2 top-2 rounded-full bg-black/58 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
                        {index === 0 ? '封面' : index + 1}
                      </div>
                      <button
                        aria-label="删除照片"
                        className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/58 text-[14px] text-white backdrop-blur-sm"
                        onClick={() => removeMedia(item.clientId)}
                        type="button"
                      >
                        ×
                      </button>
                      {item.status === 'uploading' ? (
                        <div className="absolute inset-x-0 bottom-0 bg-black/55 px-3 py-2 text-[10px] text-white">上传中…</div>
                      ) : null}
                      {item.status === 'error' ? (
                        <button
                          className="absolute inset-x-2 bottom-2 rounded-full bg-[#9d463d] px-3 py-2 text-[10px] text-white"
                          onClick={() => retryMedia(item.clientId)}
                          type="button"
                        >
                          上传失败 · 重试
                        </button>
                      ) : null}
                      <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 transition-opacity hover:opacity-100 max-[760px]:opacity-100">
                        <button
                          aria-label="照片前移"
                          className="h-6 w-6 rounded-full bg-black/55 text-[11px] text-white disabled:opacity-30"
                          disabled={index === 0}
                          onClick={() => moveMedia(item.clientId, -1)}
                          type="button"
                        >
                          ‹
                        </button>
                        <button
                          aria-label="照片后移"
                          className="h-6 w-6 rounded-full bg-black/55 text-[11px] text-white disabled:opacity-30"
                          disabled={index === media.length - 1}
                          onClick={() => moveMedia(item.clientId, 1)}
                          type="button"
                        >
                          ›
                        </button>
                      </div>
                    </div>
                  ))}
                  {media.length === 0 ? (
                    <label className="grid h-[166px] w-[126px] shrink-0 cursor-pointer place-items-center rounded-[18px] border border-dashed border-black/16 bg-black/[0.025] text-center text-[12px] leading-[1.5] text-black/38 hover:border-brand/65 hover:text-[#62784a]">
                      <span>＋<br />添加照片</span>
                      <input
                        accept="image/*"
                        className="sr-only"
                        multiple
                        onChange={handleFilesSelected}
                        type="file"
                      />
                    </label>
                  ) : null}
                </div>
              </section>

              <input
                className="w-full border-0 border-b border-black/8 bg-transparent py-4 text-[20px] font-semibold tracking-[-0.025em] text-[#191919] outline-none placeholder:text-black/26 focus:border-brand/70"
                maxLength={160}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="添加标题（可选）"
                value={title}
              />
              <textarea
                className="min-h-[210px] w-full resize-none border-0 border-b border-black/8 bg-transparent py-5 text-[15px] leading-[1.85] text-[#191919] outline-none placeholder:text-black/28 focus:border-brand/70"
                maxLength={20000}
                onChange={(event) => setBody(event.target.value)}
                placeholder="这里发生过什么？"
                value={body}
              />

              <div className="grid border-b border-black/8 py-2">
                <label className="flex min-h-14 items-center gap-4">
                  <span className="w-24 shrink-0 text-[13px] font-medium text-black/62">大概发生在</span>
                  <input
                    className="min-w-0 flex-1 border-0 bg-transparent text-right text-[13px] text-black/72 outline-none placeholder:text-black/28"
                    maxLength={120}
                    onChange={(event) => setMemoryTime(event.target.value)}
                    placeholder="例如：2022 年秋"
                    value={memoryTime}
                  />
                </label>
              </div>

              <div className="border-b border-black/8 py-2">
                <button
                  className="flex min-h-14 w-full items-center gap-4 text-left"
                  onClick={() => setPlacePickerOpen((value) => !value)}
                  type="button"
                >
                  <span className="w-24 shrink-0 text-[13px] font-medium text-black/62">发生在哪里</span>
                  <span className="min-w-0 flex-1 truncate text-right text-[13px] text-black/72">
                    {selectedPlace?.name ?? (location.kind === 'anchor' ? '你标记的校园角落' : '不关联地点')}
                  </span>
                  <span className="text-black/28">›</span>
                </button>

                {placePickerOpen ? (
                  <div className="mb-3 grid gap-2 rounded-[18px] bg-black/[0.035] p-3">
                    <input
                      className="h-10 rounded-full border border-black/8 bg-white/70 px-4 text-[13px] outline-none focus:border-brand/65"
                      onChange={(event) => setPlaceQuery(event.target.value)}
                      placeholder="搜索地点"
                      value={placeQuery}
                    />
                    <button
                      className={cn(
                        'rounded-[13px] px-3 py-3 text-left text-[13px]',
                        location.kind === 'anchor' ? 'bg-white text-black' : 'text-black/58 hover:bg-white/60'
                      )}
                      onClick={() => void openAnchorEditor()}
                      type="button"
                    >
                      <div className="font-medium">
                        {location.kind === 'anchor' ? '你标记的校园角落' : '地图上一个特别的角落'}
                      </div>
                      <div className="mt-1 text-[11px] leading-[1.5] text-black/38">
                        在 3D 校园里标记位置，再保存别人“回到这里”时看到的视角。
                      </div>
                    </button>
                    <button
                      className={cn(
                        'rounded-[13px] px-3 py-3 text-left text-[13px]',
                        location.kind === 'none' ? 'bg-white text-black' : 'text-black/58 hover:bg-white/60'
                      )}
                      onClick={() => {
                        setLocation({ kind: 'none' });
                        setPlacePickerOpen(false);
                      }}
                      type="button"
                    >
                      不关联地点
                    </button>
                    {placesLoading ? <div className="px-3 py-3 text-[12px] text-black/38">地点加载中…</div> : null}
                    {filteredPlaces.map((place) => (
                      <button
                        className={cn(
                          'rounded-[13px] px-3 py-3 text-left',
                          location.kind === 'place' && location.placeId === place.id
                            ? 'bg-white'
                            : 'hover:bg-white/60'
                        )}
                        key={place.id}
                        onClick={() => {
                          setLocation({ kind: 'place', placeId: place.id });
                          setPlacePickerOpen(false);
                        }}
                        type="button"
                      >
                        <div className="text-[13px] font-medium">{place.name}</div>
                        {place.intro ? <div className="mt-1 line-clamp-2 text-[11px] leading-[1.5] text-black/38">{place.intro}</div> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="text-[11px] leading-[1.5] text-black/35">
                  提交后会进入审核；审核通过前不会公开。
                </div>
                <button
                  className="h-11 shrink-0 rounded-full bg-[#191919] px-6 text-[13px] font-medium text-white disabled:opacity-40"
                  disabled={submitting}
                  onClick={() => void handleSubmitStory()}
                  type="button"
                >
                  {submitting ? '提交中…' : '提交审核'}
                </button>
              </div>
            </div>
          ) : null}

          {step === 'submitted' ? (
            <div className="grid min-h-[420px] place-items-center px-6 text-center">
              <div>
                <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-full bg-brand/20 text-[24px] text-[#58703e]">✓</div>
                <h2 className="m-0 text-[27px] font-semibold tracking-[-0.04em]">已经提交审核</h2>
                <p className="mt-3 mb-6 text-[14px] leading-[1.7] text-black/45">故事已经安全保存。审核完成后，它会出现在对应的校园记忆里。</p>
                <button
                  className="h-11 rounded-full bg-[#191919] px-6 text-[13px] font-medium text-white"
                  onClick={() => onOpenChange(false)}
                  type="button"
                >
                  回到校园
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { StoryComposerFlow };
