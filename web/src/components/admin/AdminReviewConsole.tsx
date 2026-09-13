import type {
  Place,
  SpatialAnchor,
  StoryLocation,
  StoryReviewItem,
} from '@ruoshui/shared';
import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ApiRequestError,
  approveStoryReview,
  fetchPlaces,
  fetchStoryReviewQueue,
  getStoryReviewMediaUrl,
  patchStoryReview,
  rejectStoryReview,
  requestEmailOtp,
  requestStoryReviewChanges,
  verifyEmailOtp,
} from '../../community/content-api';
import { scrollAreaClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';
import { SpatialAnchorEditorOverlay } from '../community/SpatialAnchorEditorOverlay';

interface AdminReviewConsoleProps {
  sceneId: string;
}

type AccessState = 'checking' | 'email' | 'otp' | 'ready' | 'forbidden' | 'error';
type ActionKind = 'save' | 'approve' | 'changes' | 'reject' | null;

const fieldClassName =
  'w-full rounded-[14px] border border-black/10 bg-white px-3.5 py-2.5 text-[13px] text-[#171816] outline-none transition-colors focus:border-[#79945a]';

function defaultDisplayName(item: StoryReviewItem) {
  return item.author.displayName ?? `若水用户 ${item.author.id.slice(-4).toUpperCase()}`;
}

function storyTitle(item: StoryReviewItem) {
  if (item.revision.title?.trim()) return item.revision.title.trim();
  if (item.revision.body?.trim()) {
    const compact = item.revision.body.replace(/\s+/g, ' ').trim();
    return compact.length > 26 ? `${compact.slice(0, 26)}…` : compact;
  }
  if (item.revision.memoryTime) return item.revision.memoryTime;
  return '一段没有标题的记忆';
}

function formatReviewTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function locationLabel(location: StoryLocation, places: Place[]) {
  if (location.kind === 'none') return '未关联地点';
  if (location.kind === 'anchor') return '地图上的一个特别角落';
  return places.find((place) => place.id === location.placeId)?.name ?? '已关联地点';
}

function leaveReviewMode() {
  const url = new URL(window.location.href);
  url.searchParams.delete('admin');
  window.location.assign(`${url.pathname}${url.search}${url.hash}` || '/');
}

function AdminReviewConsole({ sceneId }: AdminReviewConsoleProps) {
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [queue, setQueue] = useState<StoryReviewItem[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedRevisionId, setSelectedRevisionId] = useState<string | null>(null);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [memoryTime, setMemoryTime] = useState('');
  const [draftLocation, setDraftLocation] = useState<StoryLocation>({ kind: 'none' });
  const [moderationNote, setModerationNote] = useState('');
  const [actionKind, setActionKind] = useState<ActionKind>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);

  const selectedItem = useMemo(
    () => queue.find((item) => item.revision.id === selectedRevisionId) ?? null,
    [queue, selectedRevisionId],
  );

  useEffect(() => {
    if (!selectedItem) return;
    setTitle(selectedItem.revision.title ?? '');
    setMemoryTime(selectedItem.revision.memoryTime ?? '');
    setDraftLocation(selectedItem.revision.location);
    setModerationNote('');
    setMessage(null);
  }, [selectedItem?.revision.id]);

  async function loadQueue() {
    setAccessState('checking');
    setMessage(null);
    try {
      const nextQueue = await fetchStoryReviewQueue();
      setQueue(nextQueue);
      setSelectedRevisionId((current) =>
        current && nextQueue.some((item) => item.revision.id === current)
          ? current
          : nextQueue[0]?.revision.id ?? null,
      );
      setAccessState('ready');
      void fetchPlaces(sceneId)
        .then(setPlaces)
        .catch(() => setPlaces([]));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setAccessState('email');
        return;
      }
      if (error instanceof ApiRequestError && error.status === 403) {
        setAccessState('forbidden');
        return;
      }
      setMessage(error instanceof Error ? error.message : '审核队列加载失败。');
      setAccessState('error');
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setMessage(null);
    try {
      await requestEmailOtp(email.trim());
      setAccessState('otp');
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
      await verifyEmailOtp(email.trim(), otpCode.trim());
      await loadQueue();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码验证失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  function removeReviewedItem(revisionId: string) {
    setQueue((current) => {
      const index = current.findIndex((item) => item.revision.id === revisionId);
      const next = current.filter((item) => item.revision.id !== revisionId);
      const replacement = next[Math.min(Math.max(index, 0), Math.max(next.length - 1, 0))] ?? next[0];
      setSelectedRevisionId(replacement?.revision.id ?? null);
      if (!replacement) setMobileDetailOpen(false);
      return next;
    });
  }

  async function persistCorrections(item: StoryReviewItem) {
    const updated = await patchStoryReview(item.revision.id, {
      title: title.trim() || null,
      memoryTime: memoryTime.trim() || null,
      location: draftLocation,
    });
    setQueue((current) =>
      current.map((entry) => (entry.revision.id === updated.revision.id ? updated : entry)),
    );
    return updated;
  }

  async function handleSave() {
    if (!selectedItem) return;
    setActionKind('save');
    setMessage(null);
    try {
      await persistCorrections(selectedItem);
      setMessage('校准已保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '校准保存失败。');
    } finally {
      setActionKind(null);
    }
  }

  async function handleApprove() {
    if (!selectedItem) return;
    setActionKind('approve');
    setMessage(null);
    try {
      await persistCorrections(selectedItem);
      await approveStoryReview(selectedItem.revision.id);
      removeReviewedItem(selectedItem.revision.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '发布失败。');
    } finally {
      setActionKind(null);
    }
  }

  async function handleRequestChanges() {
    if (!selectedItem) return;
    if (!moderationNote.trim()) {
      setMessage('退回修改时需要告诉作者具体要改什么。');
      return;
    }
    setActionKind('changes');
    setMessage(null);
    try {
      await requestStoryReviewChanges(selectedItem.revision.id, moderationNote.trim());
      removeReviewedItem(selectedItem.revision.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '退回失败。');
    } finally {
      setActionKind(null);
    }
  }

  async function handleReject() {
    if (!selectedItem) return;
    if (!window.confirm('确认拒绝这条 Story？拒绝后它不会公开。')) return;
    setActionKind('reject');
    setMessage(null);
    try {
      await rejectStoryReview(selectedItem.revision.id, moderationNote.trim() || undefined);
      removeReviewedItem(selectedItem.revision.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '拒绝失败。');
    } finally {
      setActionKind(null);
    }
  }

  function choosePlace(placeId: string) {
    if (!placeId) {
      setDraftLocation({ kind: 'none' });
      return;
    }
    setDraftLocation({ kind: 'place', placeId });
  }

  function openAnchorEditor() {
    setMessage(null);
    setAnchorEditorOpen(true);
  }

  function handleAnchorSave(anchor: SpatialAnchor) {
    setDraftLocation({ kind: 'anchor', anchor });
    setAnchorEditorOpen(false);
  }

  if (anchorEditorOpen) {
    return (
      <SpatialAnchorEditorOverlay
        onCancel={() => setAnchorEditorOpen(false)}
        onSave={handleAnchorSave}
      />
    );
  }

  if (accessState !== 'ready') {
    return (
      <div className="fixed inset-0 z-[20] grid place-items-center bg-[#f1f1ed]/96 p-5 text-[#181916] backdrop-blur-[18px]">
        <div className="w-full max-w-[430px] rounded-[28px] border border-black/8 bg-white/90 p-7 shadow-panel">
          <div className="mb-7 flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#708653]">若水 · Admin</div>
              <h1 className="mt-2 mb-0 text-[28px] font-semibold tracking-[-0.045em]">Story 审核台</h1>
            </div>
            <button className="text-[12px] text-black/42 hover:text-black" onClick={leaveReviewMode} type="button">
              返回校园
            </button>
          </div>

          {message ? (
            <div className="mb-5 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-[12px] leading-[1.6] text-[#8d4138]">
              {message}
            </div>
          ) : null}

          {accessState === 'checking' ? (
            <div className="py-10 text-center text-[13px] text-black/42">正在读取管理员权限与审核队列…</div>
          ) : null}

          {accessState === 'email' ? (
            <form className="grid gap-4" onSubmit={handleRequestOtp}>
              <p className="m-0 text-[13px] leading-[1.7] text-black/48">审核属于公开写入管理操作，请先用管理员账号登录。</p>
              <input
                autoComplete="email"
                className={fieldClassName}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="管理员邮箱"
                required
                type="email"
                value={email}
              />
              <button className="h-11 rounded-full bg-[#191a18] text-[13px] font-medium text-white disabled:opacity-45" disabled={authBusy} type="submit">
                {authBusy ? '发送中…' : '获取验证码'}
              </button>
            </form>
          ) : null}

          {accessState === 'otp' ? (
            <form className="grid gap-4" onSubmit={handleVerifyOtp}>
              <p className="m-0 text-[13px] leading-[1.7] text-black/48">验证码已发送到 {email}</p>
              <input
                autoFocus
                className={`${fieldClassName} text-center font-mono text-[24px] tracking-[0.25em]`}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                required
                value={otpCode}
              />
              <button className="h-11 rounded-full bg-[#191a18] text-[13px] font-medium text-white disabled:opacity-45" disabled={authBusy || otpCode.length !== 6} type="submit">
                {authBusy ? '验证中…' : '进入审核台'}
              </button>
              <button className="text-[12px] text-black/42" onClick={() => setAccessState('email')} type="button">换一个邮箱</button>
            </form>
          ) : null}

          {accessState === 'forbidden' ? (
            <div className="grid gap-4">
              <p className="m-0 text-[14px] leading-[1.7] text-black/60">当前登录账号不在管理员名单中。</p>
              <button className="h-11 rounded-full border border-black/10 text-[13px]" onClick={leaveReviewMode} type="button">返回校园</button>
            </div>
          ) : null}

          {accessState === 'error' ? (
            <div className="grid gap-4">
              <button className="h-11 rounded-full bg-[#191a18] text-[13px] text-white" onClick={() => void loadQueue()} type="button">重新加载</button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[20] flex bg-[#efefeb]/97 text-[#171816] backdrop-blur-[16px]">
      <aside
        className={cn(
          'flex w-[318px] shrink-0 flex-col border-r border-black/8 bg-[#f8f8f5]/94',
          mobileDetailOpen ? 'max-[760px]:hidden' : 'max-[760px]:w-full',
        )}
      >
        <header className="border-b border-black/8 px-5 pb-4 pt-[calc(1.1rem+var(--safe-top))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#718653]">若水 · Admin</div>
              <h1 className="mt-1.5 mb-0 text-[22px] font-semibold tracking-[-0.04em]">Story 审核</h1>
            </div>
            <button className="rounded-full px-2 py-1 text-[11px] text-black/42 hover:bg-black/5 hover:text-black" onClick={leaveReviewMode} type="button">
              退出
            </button>
          </div>
          <div className="mt-3 text-[11px] text-black/38">{queue.length} 条待处理 · 按提交时间排序</div>
        </header>

        <div className={cn('min-h-0 flex-1 overflow-y-auto p-2.5', scrollAreaClassNames.thin)}>
          {queue.length === 0 ? (
            <div className="grid min-h-[280px] place-items-center px-5 text-center text-[13px] leading-[1.7] text-black/38">
              <div>现在没有待审核 Story。<br />可以先回校园继续整理地点和内容。</div>
            </div>
          ) : (
            <div className="grid gap-1.5">
              {queue.map((item) => {
                const active = item.revision.id === selectedRevisionId;
                return (
                  <button
                    className={cn(
                      'rounded-[18px] px-3.5 py-3 text-left transition-colors',
                      active ? 'bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]' : 'hover:bg-white/60',
                    )}
                    key={item.revision.id}
                    onClick={() => {
                      setSelectedRevisionId(item.revision.id);
                      setMobileDetailOpen(true);
                    }}
                    type="button"
                  >
                    <div className="line-clamp-2 text-[14px] font-semibold leading-[1.45]">{storyTitle(item)}</div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-black/38">
                      <span className="truncate">{defaultDisplayName(item)}</span>
                      <span className="shrink-0">{formatReviewTime(item.revision.updatedAt)}</span>
                    </div>
                    <div className="mt-1.5 flex gap-2 text-[10px] text-black/32">
                      <span>{item.revision.mediaAssetIds.length} 图</span>
                      <span>·</span>
                      <span className="truncate">{locationLabel(item.revision.location, places)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <main
        className={cn(
          'min-w-0 flex-1 overflow-hidden',
          !mobileDetailOpen && 'max-[760px]:hidden',
        )}
      >
        {!selectedItem ? (
          <div className="grid h-full place-items-center text-[13px] text-black/35">选择一条 Story 开始审核。</div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex min-h-[64px] items-center justify-between gap-4 border-b border-black/8 bg-[#fafaf7]/88 px-6 pt-[var(--safe-top)] max-[760px]:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button className="hidden h-9 rounded-full px-2 text-[13px] text-black/55 max-[760px]:block" onClick={() => setMobileDetailOpen(false)} type="button">‹ 队列</button>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold">{storyTitle(selectedItem)}</div>
                  <div className="mt-0.5 text-[10px] text-black/36">{defaultDisplayName(selectedItem)} · {formatReviewTime(selectedItem.revision.updatedAt)}</div>
                </div>
              </div>
              <button className="h-9 rounded-full border border-black/9 bg-white px-4 text-[11px] font-medium disabled:opacity-40" disabled={actionKind !== null} onClick={() => void handleSave()} type="button">
                {actionKind === 'save' ? '保存中…' : '保存校准'}
              </button>
            </header>

            <div className={cn('min-h-0 flex-1 overflow-y-auto', scrollAreaClassNames.thin)}>
              <div className="mx-auto grid w-full max-w-[1080px] gap-7 px-7 py-7 max-[760px]:px-4 max-[760px]:py-5">
                {message ? (
                  <div className={cn(
                    'rounded-[14px] px-4 py-3 text-[12px] leading-[1.6]',
                    message === '校准已保存.' ? 'bg-[#edf4e6] text-[#53683c]' : 'bg-[#fff0ed] text-[#8d4138]',
                  )}>{message}</div>
                ) : null}

                {selectedItem.revision.mediaAssetIds.length > 0 ? (
                  <section>
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/38">照片 · {selectedItem.revision.mediaAssetIds.length}</div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {selectedItem.revision.mediaAssetIds.map((mediaAssetId, index) => (
                        <figure className="m-0 h-[300px] w-[225px] shrink-0 overflow-hidden rounded-[18px] bg-black/5 ring-1 ring-black/6 max-[760px]:h-[240px] max-[760px]:w-[180px]" key={mediaAssetId}>
                          <img
                            alt={`Story 照片 ${index + 1}`}
                            className="h-full w-full object-cover"
                            loading={index > 1 ? 'lazy' : 'eager'}
                            src={getStoryReviewMediaUrl(selectedItem.revision.id, mediaAssetId)}
                          />
                        </figure>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-8 max-[880px]:grid-cols-1">
                  <section className="min-w-0">
                    <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-black/38">作者原文 · 只读</div>
                    {selectedItem.revision.title ? (
                      <h2 className="mt-0 mb-5 text-[27px] font-semibold tracking-[-0.045em]">{selectedItem.revision.title}</h2>
                    ) : null}
                    {selectedItem.revision.body ? (
                      <div className="whitespace-pre-wrap text-[15px] leading-[1.9] text-black/78">{selectedItem.revision.body}</div>
                    ) : (
                      <div className="text-[13px] text-black/38">这是一条纯图片 Story。</div>
                    )}
                  </section>

                  <aside className="grid content-start gap-5 rounded-[22px] border border-black/8 bg-white/74 p-5">
                    <div>
                      <div className="mb-2 text-[11px] font-semibold text-black/48">展示标题</div>
                      <input className={fieldClassName} maxLength={160} onChange={(event) => setTitle(event.target.value)} placeholder="允许无标题" value={title} />
                    </div>
                    <div>
                      <div className="mb-2 text-[11px] font-semibold text-black/48">记忆时间</div>
                      <input className={fieldClassName} maxLength={120} onChange={(event) => setMemoryTime(event.target.value)} placeholder="例如：2022 年秋" value={memoryTime} />
                    </div>
                    <div>
                      <div className="mb-2 text-[11px] font-semibold text-black/48">地点校准</div>
                      <select
                        className={fieldClassName}
                        onChange={(event) => choosePlace(event.target.value)}
                        value={draftLocation.kind === 'place' ? draftLocation.placeId : ''}
                      >
                        <option value="">不关联正式地点</option>
                        {places.map((place) => <option key={place.id} value={place.id}>{place.name}</option>)}
                      </select>
                      <button className={cn('mt-2 w-full rounded-[13px] border px-3 py-2.5 text-left text-[12px]', draftLocation.kind === 'anchor' ? 'border-[#91a875] bg-[#f1f6eb] text-[#50643a]' : 'border-black/8 bg-white text-black/58')} onClick={openAnchorEditor} type="button">
                        {draftLocation.kind === 'anchor' ? '✓ 自定义校园角落 · 重新标定' : '地图上一个特别的角落 · 去 3D 标定'}
                      </button>
                      <div className="mt-2 text-[10px] leading-[1.5] text-black/34">当前：{locationLabel(draftLocation, places)}</div>
                    </div>
                  </aside>
                </div>

                <section className="grid gap-3 border-t border-black/8 pt-6">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/38">审核决定</div>
                  <textarea
                    className={`${fieldClassName} min-h-[88px] resize-y leading-[1.65]`}
                    maxLength={2000}
                    onChange={(event) => setModerationNote(event.target.value)}
                    placeholder="退回修改时必填：告诉作者具体需要调整什么。拒绝时可选。"
                    value={moderationNote}
                  />
                  <div className="flex flex-wrap items-center justify-end gap-2 max-[760px]:grid max-[760px]:grid-cols-2">
                    <button className="h-11 rounded-full border border-[#b95b50]/22 bg-[#fff5f3] px-5 text-[12px] font-medium text-[#9b4138] disabled:opacity-40" disabled={actionKind !== null} onClick={() => void handleReject()} type="button">
                      {actionKind === 'reject' ? '处理中…' : '拒绝'}
                    </button>
                    <button className="h-11 rounded-full border border-black/9 bg-white px-5 text-[12px] font-medium text-black/68 disabled:opacity-40" disabled={actionKind !== null} onClick={() => void handleRequestChanges()} type="button">
                      {actionKind === 'changes' ? '处理中…' : '退回修改'}
                    </button>
                    <button className="h-11 rounded-full bg-[#1d2518] px-6 text-[12px] font-semibold text-white disabled:opacity-40 max-[760px]:col-span-2" disabled={actionKind !== null} onClick={() => void handleApprove()} type="button">
                      {actionKind === 'approve' ? '发布中…' : '通过并发布'}
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export { AdminReviewConsole };
