import { type FormEvent, useEffect, useMemo, useState } from 'react';

import {
  ApiRequestError,
  type AdminCommentModerationItem,
  fetchAdminComments,
  requestEmailOtp,
  setAdminCommentHidden,
  verifyEmailOtp,
} from '../../community/content-api';
import { scrollAreaClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';

type AccessState = 'checking' | 'email' | 'otp' | 'ready' | 'forbidden' | 'error';
type Filter = 'all' | 'visible' | 'hidden';

function displayName(item: AdminCommentModerationItem) {
  return item.author.displayName ?? `若水用户 ${item.author.id.slice(-4).toUpperCase()}`;
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function switchAdminMode(mode: 'review' | 'comments' | null) {
  const url = new URL(window.location.href);
  if (mode) url.searchParams.set('admin', mode);
  else url.searchParams.delete('admin');
  window.location.assign(`${url.pathname}${url.search}${url.hash}` || '/');
}

function AdminCommentModerationConsole() {
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [comments, setComments] = useState<AdminCommentModerationItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filteredComments = useMemo(
    () => comments.filter((comment) => filter === 'all' || comment.status === filter),
    [comments, filter],
  );
  const hiddenCount = useMemo(
    () => comments.filter((comment) => comment.status === 'hidden').length,
    [comments],
  );

  async function loadComments() {
    setAccessState('checking');
    setMessage(null);
    try {
      setComments(await fetchAdminComments(200));
      setAccessState('ready');
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setAccessState('email');
        return;
      }
      if (error instanceof ApiRequestError && error.status === 403) {
        setAccessState('forbidden');
        return;
      }
      setMessage(error instanceof Error ? error.message : '评论列表加载失败。');
      setAccessState('error');
    }
  }

  useEffect(() => {
    void loadComments();
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
      await loadComments();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码验证失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  async function setHidden(comment: AdminCommentModerationItem, hidden: boolean) {
    setBusyCommentId(comment.id);
    setMessage(null);
    try {
      const updated = await setAdminCommentHidden(comment.id, hidden);
      setComments((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '评论状态更新失败。');
    } finally {
      setBusyCommentId(null);
    }
  }

  if (accessState !== 'ready') {
    return (
      <div className="fixed inset-0 z-[20] grid place-items-center bg-[#f1f1ed]/96 p-5 text-[#181916] backdrop-blur-[18px]">
        <div className="w-full max-w-[430px] rounded-[28px] border border-black/8 bg-white/90 p-7 shadow-panel">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#708653]">若水 · Admin</div>
              <h1 className="mb-0 mt-2 text-[28px] font-semibold tracking-[-0.045em]">评论管理</h1>
            </div>
            <button className="text-[12px] text-black/42 hover:text-black" onClick={() => switchAdminMode(null)} type="button">返回校园</button>
          </div>

          {message ? <div className="mb-5 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-[12px] leading-[1.6] text-[#8d4138]">{message}</div> : null}
          {accessState === 'checking' ? <div className="py-10 text-center text-[13px] text-black/42">正在读取管理员权限与评论…</div> : null}
          {accessState === 'email' ? (
            <form className="grid gap-4" onSubmit={handleRequestOtp}>
              <p className="m-0 text-[13px] leading-[1.7] text-black/48">评论管理需要管理员账号。</p>
              <input autoComplete="email" className="h-11 rounded-[14px] border border-black/10 bg-white px-3.5 text-[13px] outline-none focus:border-[#79945a]" onChange={(event) => setEmail(event.target.value)} placeholder="管理员邮箱" required type="email" value={email} />
              <button className="h-11 rounded-full bg-[#191a18] text-[13px] font-medium text-white disabled:opacity-45" disabled={authBusy} type="submit">{authBusy ? '发送中…' : '获取验证码'}</button>
            </form>
          ) : null}
          {accessState === 'otp' ? (
            <form className="grid gap-4" onSubmit={handleVerifyOtp}>
              <p className="m-0 text-[13px] leading-[1.7] text-black/48">验证码已发送到 {email}</p>
              <input autoFocus className="h-12 rounded-[14px] border border-black/10 bg-white px-3.5 text-center font-mono text-[24px] tracking-[0.25em] outline-none focus:border-[#79945a]" inputMode="numeric" maxLength={6} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required value={otpCode} />
              <button className="h-11 rounded-full bg-[#191a18] text-[13px] font-medium text-white disabled:opacity-45" disabled={authBusy || otpCode.length !== 6} type="submit">{authBusy ? '验证中…' : '进入评论管理'}</button>
            </form>
          ) : null}
          {accessState === 'forbidden' ? <div className="text-[14px] leading-[1.7] text-black/60">当前登录账号不在管理员名单中。</div> : null}
          {accessState === 'error' ? <button className="h-11 w-full rounded-full bg-[#191a18] text-[13px] text-white" onClick={() => void loadComments()} type="button">重新加载</button> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[20] flex flex-col bg-[#efefeb]/97 text-[#171816] backdrop-blur-[16px]">
      <header className="border-b border-black/8 bg-[#fafaf7]/90 px-5 pb-4 pt-[calc(1rem+var(--safe-top))]">
        <div className="mx-auto flex w-full max-w-[1080px] items-start justify-between gap-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#718653]">若水 · Admin</div>
            <h1 className="mb-0 mt-1.5 text-[24px] font-semibold tracking-[-0.04em]">评论管理</h1>
            <div className="mt-2 text-[11px] text-black/38">最近 {comments.length} 条 · {hiddenCount} 条已隐藏</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded-full border border-black/9 bg-white px-3.5 py-2 text-[11px] text-black/58" onClick={() => switchAdminMode('review')} type="button">Story 审核</button>
            <button className="rounded-full px-3 py-2 text-[11px] text-black/42 hover:bg-black/5" onClick={() => switchAdminMode(null)} type="button">退出</button>
          </div>
        </div>
      </header>

      <div className="border-b border-black/7 bg-[#f7f7f3]/86 px-5 py-3">
        <div className="mx-auto flex w-full max-w-[1080px] items-center gap-2">
          {(['all', 'visible', 'hidden'] as const).map((value) => (
            <button
              className={cn(
                'rounded-full px-3.5 py-2 text-[11px] transition-colors',
                filter === value ? 'bg-[#20261c] text-white' : 'bg-white/70 text-black/48 hover:bg-white',
              )}
              key={value}
              onClick={() => setFilter(value)}
              type="button"
            >
              {value === 'all' ? '全部' : value === 'visible' ? '公开' : '已隐藏'}
            </button>
          ))}
          <button className="ml-auto rounded-full px-3 py-2 text-[11px] text-black/38 hover:bg-white" onClick={() => void loadComments()} type="button">刷新</button>
        </div>
      </div>

      <main className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5', scrollAreaClassNames.thin)}>
        <div className="mx-auto grid w-full max-w-[1080px] gap-2.5">
          {message ? <div className="mb-2 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-[12px] text-[#8d4138]">{message}</div> : null}
          {filteredComments.length === 0 ? (
            <div className="grid min-h-[320px] place-items-center text-[13px] text-black/35">这个筛选下没有评论。</div>
          ) : (
            filteredComments.map((comment) => (
              <article className={cn('rounded-[20px] border bg-white/78 p-4', comment.status === 'hidden' ? 'border-[#c78d80]/28 opacity-72' : 'border-black/7')} key={comment.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-black/36">
                      <span className="font-medium text-black/55">{displayName(comment)}</span>
                      <span>·</span>
                      <span>{formatTime(comment.createdAt)}</span>
                      <span>·</span>
                      <span>{comment.rootCommentId ? '回复' : '主评论'}</span>
                      {comment.status === 'hidden' ? <span className="rounded-full bg-[#fff0ed] px-2 py-0.5 text-[#9b4a40]">已隐藏</span> : null}
                    </div>
                    <div className="mt-2 text-[14px] leading-[1.75] text-black/74">{comment.body}</div>
                    <div className="mt-2 truncate text-[10px] text-black/30">Story：{comment.storyTitle?.trim() || comment.storyId}</div>
                  </div>
                  <button
                    className={cn(
                      'shrink-0 rounded-full border px-3.5 py-2 text-[11px] font-medium disabled:opacity-40',
                      comment.status === 'hidden'
                        ? 'border-[#7f985f]/22 bg-[#f0f5e9] text-[#5c7142]'
                        : 'border-[#b95b50]/18 bg-[#fff5f3] text-[#99463d]',
                    )}
                    disabled={busyCommentId === comment.id}
                    onClick={() => void setHidden(comment, comment.status !== 'hidden')}
                    type="button"
                  >
                    {busyCommentId === comment.id ? '处理中…' : comment.status === 'hidden' ? '恢复' : '隐藏'}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

export { AdminCommentModerationConsole };
