import type { PublishedComment, StorySocial, User } from '@ruoshui/shared';
import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import {
  ApiRequestError,
  createStoryComment,
  fetchCurrentUser,
  fetchStorySocial,
  requestEmailOtp,
  setCommentLike,
  setStoryLike,
  verifyEmailOtp,
} from '../../community/content-api';
import { cn } from '../../utils/cn';

type AuthStep = 'email' | 'otp';
type PendingAction =
  | { kind: 'story-like'; liked: boolean }
  | { kind: 'comment-like'; commentId: string; liked: boolean }
  | { kind: 'comment'; replyToCommentId?: string }
  | null;

function displayName(user: { id: string; displayName: string | null }) {
  return user.displayName ?? `若水用户 ${user.id.slice(-4).toUpperCase()}`;
}

function formatCommentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function StoryDiscussion({ storyId }: { storyId: string }) {
  const [social, setSocial] = useState<StorySocial | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialLoading, setSocialLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [replyToCommentId, setReplyToCommentId] = useState<string | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authStep, setAuthStep] = useState<AuthStep>('email');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSocialLoading(true);
    setSocialError(null);
    void Promise.allSettled([fetchStorySocial(storyId), fetchCurrentUser()]).then((results) => {
      if (cancelled) return;
      const [socialResult, userResult] = results;
      if (socialResult.status === 'fulfilled') {
        setSocial(socialResult.value);
      } else {
        setSocialError(
          socialResult.reason instanceof Error ? socialResult.reason.message : '讨论加载失败。',
        );
      }
      if (userResult.status === 'fulfilled') setUser(userResult.value);
      setSocialLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const commentsById = useMemo(
    () => new Map((social?.comments ?? []).map((comment) => [comment.id, comment])),
    [social?.comments],
  );
  const rootComments = useMemo(
    () => (social?.comments ?? []).filter((comment) => comment.rootCommentId === null),
    [social?.comments],
  );
  const repliesByRoot = useMemo(() => {
    const groups = new Map<string, PublishedComment[]>();
    for (const comment of social?.comments ?? []) {
      if (!comment.rootCommentId) continue;
      const group = groups.get(comment.rootCommentId) ?? [];
      group.push(comment);
      groups.set(comment.rootCommentId, group);
    }
    return groups;
  }, [social?.comments]);

  const replyTarget = replyToCommentId ? commentsById.get(replyToCommentId) ?? null : null;

  function openAuth(action: PendingAction) {
    setPendingAction(action);
    setAuthStep('email');
    setAuthError(null);
    setOtpCode('');
    setAuthOpen(true);
  }

  async function refreshSocial() {
    const next = await fetchStorySocial(storyId);
    setSocial(next);
    return next;
  }

  async function runPendingAction(action: PendingAction) {
    if (!action) return;
    if (action.kind === 'story-like') {
      setSocial(await setStoryLike(storyId, action.liked));
      return;
    }
    if (action.kind === 'comment-like') {
      setSocial(await setCommentLike(action.commentId, action.liked));
      return;
    }
    setReplyToCommentId(action.replyToCommentId ?? null);
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  }

  async function handleStoryLike() {
    const liked = !(social?.viewerHasLiked ?? false);
    if (!user) {
      openAuth({ kind: 'story-like', liked });
      return;
    }
    setBusyKey('story-like');
    try {
      setSocial(await setStoryLike(storyId, liked));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setUser(null);
        openAuth({ kind: 'story-like', liked });
      } else {
        setSocialError(error instanceof Error ? error.message : '点赞失败。');
      }
    } finally {
      setBusyKey(null);
    }
  }

  function startComment(replyTo?: PublishedComment) {
    if (!user) {
      openAuth({ kind: 'comment', ...(replyTo ? { replyToCommentId: replyTo.id } : {}) });
      return;
    }
    setReplyToCommentId(replyTo?.id ?? null);
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  }

  async function handleCommentLike(comment: PublishedComment) {
    const liked = !comment.viewerHasLiked;
    if (!user) {
      openAuth({ kind: 'comment-like', commentId: comment.id, liked });
      return;
    }
    setBusyKey(`comment-like:${comment.id}`);
    try {
      setSocial(await setCommentLike(comment.id, liked));
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setUser(null);
        openAuth({ kind: 'comment-like', commentId: comment.id, liked });
      } else {
        setSocialError(error instanceof Error ? error.message : '评论点赞失败。');
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSubmitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = commentBody.trim();
    if (!body) return;
    if (!user) {
      openAuth({ kind: 'comment', ...(replyToCommentId ? { replyToCommentId } : {}) });
      return;
    }

    setBusyKey('comment-submit');
    setSocialError(null);
    try {
      setSocial(await createStoryComment(storyId, body, replyToCommentId ?? undefined));
      setCommentBody('');
      setReplyToCommentId(null);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setUser(null);
        openAuth({ kind: 'comment', ...(replyToCommentId ? { replyToCommentId } : {}) });
      } else {
        setSocialError(error instanceof Error ? error.message : '评论发布失败。');
      }
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRequestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      await requestEmailOtp(email.trim());
      setAuthStep('otp');
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '验证码发送失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    try {
      const nextUser = await verifyEmailOtp(email.trim(), otpCode.trim());
      setUser(nextUser);
      setAuthOpen(false);
      await refreshSocial();
      const action = pendingAction;
      setPendingAction(null);
      await runPendingAction(action);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '验证码验证失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  function renderComment(comment: PublishedComment, isReply: boolean) {
    const repliedComment = comment.replyToCommentId
      ? commentsById.get(comment.replyToCommentId) ?? null
      : null;
    return (
      <article
        className={cn(
          'grid gap-1.5',
          isReply && 'rounded-[14px] bg-black/[0.025] px-3 py-2.5',
        )}
        key={comment.id}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 truncate text-[11px] font-medium text-black/48">
            {displayName(comment.author)}
          </div>
          <div className="shrink-0 text-[9px] text-black/26">{formatCommentTime(comment.createdAt)}</div>
        </div>
        <div className="text-[13px] leading-[1.7] text-black/72">
          {isReply && repliedComment && repliedComment.id !== comment.rootCommentId ? (
            <span className="mr-1 text-[#728853]">回复 {displayName(repliedComment.author)}</span>
          ) : null}
          {comment.body}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-black/36">
          <button className="hover:text-black/64" onClick={() => startComment(comment)} type="button">
            回复
          </button>
          <button
            className={cn('hover:text-black/64', comment.viewerHasLiked && 'text-[#718653]')}
            disabled={busyKey === `comment-like:${comment.id}`}
            onClick={() => void handleCommentLike(comment)}
            type="button"
          >
            {comment.viewerHasLiked ? '♥' : '♡'} {comment.likeCount || ''}
          </button>
        </div>
      </article>
    );
  }

  return (
    <section className="mt-8 border-t border-black/[0.06] pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            className={cn(
              'inline-flex items-center gap-1.5 text-[13px] font-medium text-black/58 transition-colors hover:text-black/80',
              social?.viewerHasLiked && 'text-[#6f8650]',
            )}
            disabled={busyKey === 'story-like'}
            onClick={() => void handleStoryLike()}
            type="button"
          >
            <span className="text-[20px] leading-none">{social?.viewerHasLiked ? '♥' : '♡'}</span>
            <span>{social?.likeCount ?? 0}</span>
          </button>
          <button className="inline-flex items-center gap-1.5 text-[13px] text-black/52 hover:text-black/76" onClick={() => startComment()} type="button">
            <span className="text-[18px] leading-none">◌</span>
            <span>{social?.commentCount ?? 0}</span>
          </button>
        </div>
        <span className="text-[10px] text-black/28">讨论</span>
      </div>

      {socialError ? (
        <div className="mt-3 rounded-[12px] bg-[#fff0ed] px-3 py-2.5 text-[11px] leading-[1.6] text-[#8d4138]">{socialError}</div>
      ) : null}

      <form className="mt-4" onSubmit={handleSubmitComment}>
        {replyTarget ? (
          <div className="mb-2 flex items-center justify-between rounded-[10px] bg-[#eef3e8] px-3 py-2 text-[10px] text-[#617447]">
            <span>回复 {displayName(replyTarget.author)}</span>
            <button onClick={() => setReplyToCommentId(null)} type="button">取消</button>
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-[16px] bg-black/[0.035] px-3 py-2.5">
          <textarea
            className="min-h-[36px] flex-1 resize-none border-0 bg-transparent px-0 py-1 text-[12px] leading-[1.6] text-black/72 outline-none placeholder:text-black/28"
            maxLength={2000}
            onChange={(event) => setCommentBody(event.target.value)}
            onFocus={() => {
              if (!user) openAuth({ kind: 'comment', ...(replyToCommentId ? { replyToCommentId } : {}) });
            }}
            placeholder={user ? '说点什么…' : '登录后参与讨论'}
            ref={commentInputRef}
            value={commentBody}
          />
          <button
            className="rounded-full bg-[#26301f] px-3.5 py-2 text-[10px] font-medium text-white disabled:opacity-35"
            disabled={!commentBody.trim() || busyKey === 'comment-submit'}
            type="submit"
          >
            {busyKey === 'comment-submit' ? '发送中' : '发送'}
          </button>
        </div>
      </form>

      <div className="mt-5 grid gap-5">
        {socialLoading ? (
          <div className="py-8 text-center text-[11px] text-black/28">正在加载讨论…</div>
        ) : rootComments.length === 0 ? (
          <div className="py-7 text-center text-[11px] text-black/28">还没有评论，留下第一句话吧。</div>
        ) : (
          rootComments.map((root) => (
            <div className="grid gap-2.5 border-b border-black/[0.045] pb-5 last:border-b-0" key={root.id}>
              {renderComment(root, false)}
              {(repliesByRoot.get(root.id) ?? []).length > 0 ? (
                <div className="ml-4 grid gap-1.5 border-l border-black/[0.055] pl-3">
                  {(repliesByRoot.get(root.id) ?? []).map((reply) => renderComment(reply, true))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      {authOpen ? (
        <div className="fixed inset-0 z-[30] grid place-items-end bg-black/24 p-3 backdrop-blur-[4px] min-[761px]:place-items-center" onMouseDown={() => setAuthOpen(false)} role="presentation">
          <div className="w-full max-w-[390px] rounded-[24px] bg-[#fbfbf8] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.2)]" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="登录若水">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#718653]">若水</div>
                <h3 className="mb-0 mt-1.5 text-[22px] font-semibold tracking-[-0.04em]">登录后参与讨论</h3>
              </div>
              <button className="h-8 w-8 rounded-full text-[19px] text-black/35 hover:bg-black/5" onClick={() => setAuthOpen(false)} type="button">×</button>
            </div>
            {authError ? <div className="mb-3 rounded-[12px] bg-[#fff0ed] px-3 py-2.5 text-[11px] text-[#8d4138]">{authError}</div> : null}
            {authStep === 'email' ? (
              <form className="grid gap-3" onSubmit={handleRequestOtp}>
                <input
                  autoComplete="email"
                  className="h-11 rounded-[14px] border border-black/9 bg-white px-3.5 text-[13px] outline-none focus:border-[#8ca66c]"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="你的邮箱"
                  required
                  type="email"
                  value={email}
                />
                <button className="h-11 rounded-full bg-[#20261c] text-[12px] font-medium text-white disabled:opacity-40" disabled={authBusy} type="submit">
                  {authBusy ? '发送中…' : '获取验证码'}
                </button>
              </form>
            ) : (
              <form className="grid gap-3" onSubmit={handleVerifyOtp}>
                <div className="text-[11px] text-black/42">验证码已发送到 {email}</div>
                <input
                  autoFocus
                  className="h-12 rounded-[14px] border border-black/9 bg-white px-3.5 text-center font-mono text-[22px] tracking-[0.24em] outline-none focus:border-[#8ca66c]"
                  inputMode="numeric"
                  maxLength={6}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  value={otpCode}
                />
                <button className="h-11 rounded-full bg-[#20261c] text-[12px] font-medium text-white disabled:opacity-40" disabled={authBusy || otpCode.length !== 6} type="submit">
                  {authBusy ? '验证中…' : '继续'}
                </button>
                <button className="text-[10px] text-black/36" onClick={() => setAuthStep('email')} type="button">换一个邮箱</button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export { StoryDiscussion };
