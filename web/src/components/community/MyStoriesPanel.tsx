import { type FormEvent, useEffect, useMemo, useState } from 'react';

import {
  ApiRequestError,
  fetchCurrentUser,
  requestEmailOtp,
  verifyEmailOtp,
} from '../../community/content-api';
import {
  fetchMyStories,
  type OwnedStoryItem,
  type OwnedStoryRevisionSummary,
} from '../../community/my-stories-api';
import {
  createPublishedStoryEditDraft,
  deleteOwnedStory,
  unpublishOwnedStory,
} from '../../community/story-author-api';
import { scrollAreaClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';

type PanelState = 'checking' | 'email' | 'otp' | 'ready' | 'error';

interface MyStoriesPanelProps {
  onOpenChange: (open: boolean) => void;
  onOpenStoryComposer: (storyId?: string) => void;
  open: boolean;
}

function displayTitle(revision: OwnedStoryRevisionSummary | null) {
  if (!revision) return '未命名 Story';
  if (revision.title?.trim()) return revision.title.trim();
  if (revision.bodyPreview?.trim()) {
    return revision.bodyPreview.length > 34
      ? `${revision.bodyPreview.slice(0, 34)}…`
      : revision.bodyPreview;
  }
  return revision.mediaCount > 0 ? '一段照片记忆' : '未命名 Story';
}

function publicLabel(item: OwnedStoryItem) {
  if (item.publicState === 'published') return '已发布';
  if (item.publicState === 'unpublished') return '已下架';
  return '未公开';
}

function workLabel(item: OwnedStoryItem) {
  switch (item.workingRevision?.state) {
    case 'draft':
      return '草稿';
    case 'pending_review':
      return '审核中';
    case 'changes_requested':
      return '待修改';
    case 'rejected':
      return '未通过';
    default:
      return null;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

function MyStoriesPanel({ onOpenChange, onOpenStoryComposer, open }: MyStoriesPanelProps) {
  const [panelState, setPanelState] = useState<PanelState>('checking');
  const [stories, setStories] = useState<OwnedStoryItem[]>([]);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [busyStoryId, setBusyStoryId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const counts = useMemo(() => {
    let drafts = 0;
    let reviewing = 0;
    let published = 0;
    for (const story of stories) {
      if (story.publicState === 'published') published += 1;
      if (story.workingRevision?.state === 'draft' || story.workingRevision?.state === 'changes_requested') {
        drafts += 1;
      }
      if (story.workingRevision?.state === 'pending_review') reviewing += 1;
    }
    return { drafts, reviewing, published };
  }, [stories]);

  async function loadStories() {
    setMessage(null);
    setStories(await fetchMyStories());
    setPanelState('ready');
  }

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPanelState('checking');
    setMessage(null);
    setOtpCode('');

    void fetchCurrentUser()
      .then(async (user) => {
        if (cancelled) return;
        if (!user) {
          setDisplayName(null);
          setPanelState('email');
          return;
        }
        setDisplayName(user.displayName);
        const next = await fetchMyStories();
        if (cancelled) return;
        setStories(next);
        setPanelState('ready');
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : '我的 Story 加载失败。');
        setPanelState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setMessage(null);
    try {
      await requestEmailOtp(email.trim());
      setPanelState('otp');
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
      const user = await verifyEmailOtp(email.trim(), otpCode.trim());
      setDisplayName(user.displayName);
      await loadStories();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码验证失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  function openComposer(storyId?: string) {
    onOpenChange(false);
    onOpenStoryComposer(storyId);
  }

  async function handleContinue(item: OwnedStoryItem) {
    const workingState = item.workingRevision?.state;
    if (workingState === 'draft' || workingState === 'changes_requested') {
      openComposer(item.id);
      return;
    }
    if (workingState === 'pending_review') return;

    if (item.publishedRevision) {
      setBusyStoryId(item.id);
      setMessage(null);
      try {
        const draft = await createPublishedStoryEditDraft(item.id);
        openComposer(draft.story.id);
      } catch (error) {
        if (error instanceof ApiRequestError && error.status === 409) {
          setMessage('这条 Story 已经有进行中的草稿或审核。刷新后再看看。');
          await loadStories();
        } else {
          setMessage(error instanceof Error ? error.message : '暂时无法开始编辑。');
        }
      } finally {
        setBusyStoryId(null);
      }
      return;
    }

    openComposer();
  }

  async function handleUnpublish(item: OwnedStoryItem) {
    if (!window.confirm('确认先把这条 Story 下架？内容不会删除。')) return;
    setBusyStoryId(item.id);
    setMessage(null);
    try {
      await unpublishOwnedStory(item.id);
      await loadStories();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '下架失败。');
    } finally {
      setBusyStoryId(null);
    }
  }

  async function handleDelete(item: OwnedStoryItem) {
    const wording = item.publicState === 'published'
      ? '确认删除这条已发布 Story？它会立即从公开页面消失。'
      : '确认删除这条 Story？';
    if (!window.confirm(wording)) return;
    setBusyStoryId(item.id);
    setMessage(null);
    try {
      await deleteOwnedStory(item.id);
      setStories((current) => current.filter((story) => story.id !== item.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '删除失败。');
    } finally {
      setBusyStoryId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      aria-label="我的 Story"
      aria-modal="true"
      className="fixed inset-0 z-[18] flex items-center justify-center bg-black/30 p-4 backdrop-blur-[7px] max-[760px]:items-end max-[760px]:p-0"
      role="dialog"
    >
      <div className="flex max-h-[min(760px,calc(var(--app-height)-2rem))] w-[min(640px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-white/55 bg-[#f7f7f3]/98 text-[#191a18] shadow-panel max-[760px]:h-[82dvh] max-[760px]:max-h-none max-[760px]:w-full max-[760px]:rounded-b-none max-[760px]:rounded-t-[28px]">
        <header className="flex min-h-[68px] items-center justify-between gap-4 border-b border-black/[0.065] px-5">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#708653]">若水</div>
            <div className="mt-1 flex min-w-0 items-baseline gap-2">
              <h2 className="m-0 text-[22px] font-semibold tracking-[-0.04em]">我的 Story</h2>
              {displayName ? <span className="truncate text-[11px] text-black/35">{displayName}</span> : null}
            </div>
          </div>
          <button className="h-9 w-9 rounded-full text-[20px] text-black/38 hover:bg-black/5" onClick={() => onOpenChange(false)} type="button">×</button>
        </header>

        <div className={cn('min-h-0 flex-1 overflow-y-auto', scrollAreaClassNames.thin)}>
          {message ? <div className="mx-5 mt-4 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-[12px] leading-[1.6] text-[#8e4037]">{message}</div> : null}

          {panelState === 'checking' ? <div className="grid min-h-[360px] place-items-center text-[13px] text-black/38">正在找回你的 Story…</div> : null}

          {panelState === 'email' ? (
            <form className="mx-auto grid w-full max-w-[420px] gap-5 px-6 py-14" onSubmit={handleRequestOtp}>
              <div>
                <h3 className="m-0 text-[25px] font-semibold tracking-[-0.04em]">登录后查看你的 Story</h3>
                <p className="mb-0 mt-3 text-[13px] leading-[1.7] text-black/45">草稿、审核状态和已发布内容都会绑定在同一个账号下。</p>
              </div>
              <input autoComplete="email" className="h-12 border-0 border-b border-black/10 bg-transparent px-0 text-[14px] outline-none focus:border-[#7f985f]" onChange={(event) => setEmail(event.target.value)} placeholder="你的邮箱" required type="email" value={email} />
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white disabled:opacity-40" disabled={authBusy} type="submit">{authBusy ? '发送中…' : '获取验证码'}</button>
            </form>
          ) : null}

          {panelState === 'otp' ? (
            <form className="mx-auto grid w-full max-w-[420px] gap-5 px-6 py-14" onSubmit={handleVerifyOtp}>
              <div>
                <h3 className="m-0 text-[25px] font-semibold tracking-[-0.04em]">输入验证码</h3>
                <p className="mb-0 mt-3 text-[13px] text-black/45">已经发送到 {email}</p>
              </div>
              <input autoFocus className="h-12 border-0 border-b border-black/10 bg-transparent text-center font-mono text-[26px] tracking-[0.25em] outline-none focus:border-[#7f985f]" inputMode="numeric" maxLength={6} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required value={otpCode} />
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white disabled:opacity-40" disabled={authBusy || otpCode.length !== 6} type="submit">{authBusy ? '验证中…' : '继续'}</button>
            </form>
          ) : null}

          {panelState === 'error' ? (
            <div className="grid min-h-[320px] place-items-center px-6 text-center">
              <button className="rounded-full bg-[#20251d] px-5 py-3 text-[12px] text-white" onClick={() => void loadStories()} type="button">重新加载</button>
            </div>
          ) : null}

          {panelState === 'ready' ? (
            <div className="px-5 pb-[calc(1.5rem+var(--safe-bottom))] pt-5">
              <div className="mb-5 grid grid-cols-3 gap-2 rounded-[18px] bg-black/[0.035] p-3 text-center">
                <div><div className="text-[18px] font-semibold">{counts.drafts}</div><div className="mt-0.5 text-[9px] text-black/32">待继续</div></div>
                <div><div className="text-[18px] font-semibold">{counts.reviewing}</div><div className="mt-0.5 text-[9px] text-black/32">审核中</div></div>
                <div><div className="text-[18px] font-semibold">{counts.published}</div><div className="mt-0.5 text-[9px] text-black/32">已发布</div></div>
              </div>

              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-[12px] font-semibold">全部 Story</div>
                <button className="rounded-full bg-[#20251d] px-4 py-2 text-[10px] font-medium text-white" onClick={() => openComposer()} type="button">＋ 新 Story</button>
              </div>

              {stories.length === 0 ? (
                <div className="grid min-h-[240px] place-items-center rounded-[20px] border border-dashed border-black/10 px-6 text-center text-[12px] leading-[1.7] text-black/34">这里还没有 Story。<br />第一段记忆可以从校园里开始。</div>
              ) : (
                <div className="grid gap-3">
                  {stories.map((item) => {
                    const revision = item.workingRevision ?? item.publishedRevision;
                    const work = workLabel(item);
                    const canContinue = item.workingRevision?.state !== 'pending_review';
                    const isBusy = busyStoryId === item.id;
                    return (
                      <article className="rounded-[19px] border border-black/[0.065] bg-white/72 px-4 py-4" key={item.id}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-[9px]">
                              <span className={cn('rounded-full px-2 py-1', item.publicState === 'published' ? 'bg-[#edf4e5] text-[#61764a]' : item.publicState === 'unpublished' ? 'bg-black/[0.055] text-black/42' : 'bg-[#f1eee5] text-[#776d55]')}>{publicLabel(item)}</span>
                              {work ? <span className={cn('rounded-full px-2 py-1', item.workingRevision?.state === 'changes_requested' || item.workingRevision?.state === 'rejected' ? 'bg-[#fff0ed] text-[#96483e]' : 'bg-[#edf0f5] text-[#586577]')}>{work}</span> : null}
                            </div>
                            <h3 className="mb-0 mt-2.5 line-clamp-2 text-[16px] font-semibold leading-[1.45] tracking-[-0.025em]">{displayTitle(revision)}</h3>
                            {revision?.bodyPreview ? <p className="mb-0 mt-1.5 line-clamp-2 text-[11px] leading-[1.65] text-black/42">{revision.bodyPreview}</p> : null}
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[9px] text-black/28">
                              {revision?.memoryTime ? <span>{revision.memoryTime}</span> : null}
                              {revision?.mediaCount ? <span>{revision.mediaCount} 张照片</span> : null}
                              <span>更新于 {formatDate(item.updatedAt)}</span>
                            </div>
                            {item.workingRevision?.moderationNote ? <div className="mt-3 rounded-[11px] bg-[#fff3f0] px-3 py-2 text-[10px] leading-[1.55] text-[#8e463d]">审核意见：{item.workingRevision.moderationNote}</div> : null}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-black/[0.05] pt-3 text-[10px]">
                          {canContinue ? (
                            <button className="rounded-full bg-[#20251d] px-3.5 py-2 font-medium text-white disabled:opacity-40" disabled={isBusy} onClick={() => void handleContinue(item)} type="button">
                              {isBusy ? '准备中…' : item.workingRevision?.state === 'draft' || item.workingRevision?.state === 'changes_requested' ? '继续编辑' : item.publicState === 'unpublished' ? '编辑并重新提交' : item.publishedRevision ? '编辑' : '重新写'}
                            </button>
                          ) : <span className="rounded-full bg-black/[0.04] px-3 py-2 text-black/38">等待审核</span>}
                          {item.publicState === 'published' && item.workingRevision?.state !== 'pending_review' ? <button className="rounded-full px-3 py-2 text-black/48 hover:bg-black/5 disabled:opacity-40" disabled={isBusy} onClick={() => void handleUnpublish(item)} type="button">下架</button> : null}
                          {item.workingRevision?.state !== 'pending_review' ? <button className="ml-auto rounded-full px-3 py-2 text-[#9a4b42] hover:bg-[#fff0ed] disabled:opacity-40" disabled={isBusy} onClick={() => void handleDelete(item)} type="button">删除</button> : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { MyStoriesPanel };
