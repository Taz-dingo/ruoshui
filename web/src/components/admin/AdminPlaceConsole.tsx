import type { Place, SpatialAnchor } from '@ruoshui/shared';
import { type FormEvent, useEffect, useMemo, useState } from 'react';

import {
  ApiRequestError,
  requestEmailOtp,
  verifyEmailOtp,
} from '../../community/content-api';
import {
  createAdminPlace,
  fetchAdminPlaces,
  updateAdminPlace,
} from '../../community/place-admin-api';
import { scrollAreaClassNames } from '../../styles/system';
import { requestFocusSpatialAnchor } from '../../ui/commands/viewer-command-bus';
import { cn } from '../../utils/cn';
import { SpatialAnchorEditorOverlay } from '../community/SpatialAnchorEditorOverlay';

type AccessState = 'checking' | 'email' | 'otp' | 'ready' | 'forbidden' | 'error';

type EditorMode =
  | { kind: 'create' }
  | { kind: 'edit'; placeId: string }
  | null;

interface AdminPlaceConsoleProps {
  sceneId: string;
}

const fieldClassName =
  'w-full rounded-[14px] border border-black/10 bg-white px-3.5 py-2.5 text-[13px] text-[#171816] outline-none transition-colors focus:border-[#79945a]';

function switchAdminMode(mode: 'review' | 'comments' | 'places' | null) {
  const url = new URL(window.location.href);
  if (mode) url.searchParams.set('admin', mode);
  else url.searchParams.delete('admin');
  window.location.assign(`${url.pathname}${url.search}${url.hash}` || '/');
}

function focusAnchor(name: string, anchor: SpatialAnchor) {
  const { cameraPose } = anchor;
  requestFocusSpatialAnchor({
    title: name,
    position: [cameraPose.position.x, cameraPose.position.y, cameraPose.position.z],
    target: [cameraPose.target.x, cameraPose.target.y, cameraPose.target.z],
    ...(cameraPose.fovDeg ? { fovDeg: cameraPose.fovDeg } : {}),
  });
}

function anchorSummary(anchor: SpatialAnchor | null) {
  if (!anchor) return '还没有标定位置和镜头';
  const point = anchor.markerPosition;
  return `已标定 · ${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)}`;
}

function AdminPlaceConsole({ sceneId }: AdminPlaceConsoleProps) {
  const [accessState, setAccessState] = useState<AccessState>('checking');
  const [places, setPlaces] = useState<Place[]>([]);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [anchor, setAnchor] = useState<SpatialAnchor | null>(null);
  const [anchorEditorOpen, setAnchorEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedPlace = useMemo(
    () =>
      editorMode?.kind === 'edit'
        ? places.find((place) => place.id === editorMode.placeId) ?? null
        : null,
    [editorMode, places],
  );

  function hydratePlace(place: Place) {
    setEditorMode({ kind: 'edit', placeId: place.id });
    setName(place.name);
    setIntro(place.intro ?? '');
    setSortOrder(String(place.sortOrder));
    setAnchor(place.anchor);
    setMessage(null);
  }

  function beginCreate() {
    const nextSortOrder = places.length
      ? Math.max(...places.map((place) => place.sortOrder)) + 10
      : 10;
    setEditorMode({ kind: 'create' });
    setName('');
    setIntro('');
    setSortOrder(String(nextSortOrder));
    setAnchor(null);
    setMessage(null);
    setMobileEditorOpen(true);
  }

  async function loadPlaces() {
    setAccessState('checking');
    setMessage(null);
    try {
      const nextPlaces = await fetchAdminPlaces(sceneId);
      setPlaces(nextPlaces);
      setAccessState('ready');
      setEditorMode((current) => {
        if (current?.kind === 'edit') {
          const refreshed = nextPlaces.find((place) => place.id === current.placeId);
          if (refreshed) {
            window.setTimeout(() => hydratePlace(refreshed), 0);
            return current;
          }
        }
        return current;
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setAccessState('email');
        return;
      }
      if (error instanceof ApiRequestError && error.status === 403) {
        setAccessState('forbidden');
        return;
      }
      setMessage(error instanceof Error ? error.message : '地点列表加载失败。');
      setAccessState('error');
    }
  }

  useEffect(() => {
    void loadPlaces();
  }, [sceneId]);

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
      await loadPlaces();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码验证失败。');
    } finally {
      setAuthBusy(false);
    }
  }

  function openAnchorEditor() {
    setMessage(null);
    if (anchor) focusAnchor(name.trim() || selectedPlace?.name || '当前地点', anchor);
    window.setTimeout(() => setAnchorEditorOpen(true), anchor ? 260 : 0);
  }

  async function savePlace() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setMessage('地点名称不能为空。');
      return;
    }
    if (!anchor) {
      setMessage('先去 3D 场景标定这个地点的位置和最佳视角。');
      return;
    }
    const parsedSortOrder = Number(sortOrder);
    if (!Number.isInteger(parsedSortOrder)) {
      setMessage('排序值需要是整数。');
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      let saved: Place;
      if (editorMode?.kind === 'edit') {
        saved = await updateAdminPlace(editorMode.placeId, {
          name: trimmedName,
          intro: intro.trim() || null,
          anchor,
          sortOrder: parsedSortOrder,
        });
      } else {
        saved = await createAdminPlace({
          sceneId,
          name: trimmedName,
          ...(intro.trim() ? { intro: intro.trim() } : {}),
          anchor,
          sortOrder: parsedSortOrder,
        });
      }

      setPlaces((current) =>
        [...current.filter((place) => place.id !== saved.id), saved].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
        ),
      );
      hydratePlace(saved);
      setMobileEditorOpen(true);
      setMessage('地点已保存。');
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setAccessState('email');
      } else if (error instanceof ApiRequestError && error.status === 403) {
        setAccessState('forbidden');
      } else {
        setMessage(error instanceof Error ? error.message : '地点保存失败。');
      }
    } finally {
      setSaving(false);
    }
  }

  if (anchorEditorOpen) {
    return (
      <SpatialAnchorEditorOverlay
        context="place"
        onCancel={() => setAnchorEditorOpen(false)}
        onSave={(nextAnchor) => {
          setAnchor(nextAnchor);
          setAnchorEditorOpen(false);
          setMessage('空间标定已更新，记得保存地点。');
        }}
      />
    );
  }

  if (accessState !== 'ready') {
    return (
      <div className="fixed inset-0 z-[20] grid place-items-center bg-[#f1f1ed]/96 p-5 text-[#181916] backdrop-blur-[18px]">
        <div className="w-full max-w-[430px] rounded-[28px] border border-black/8 bg-white/90 p-7 shadow-panel">
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#708653]">若水 · Admin</div>
              <h1 className="mb-0 mt-2 text-[28px] font-semibold tracking-[-0.045em]">地点管理</h1>
            </div>
            <button className="text-[12px] text-black/42 hover:text-black" onClick={() => switchAdminMode(null)} type="button">返回校园</button>
          </div>

          {message ? <div className="mb-5 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-[12px] leading-[1.6] text-[#8d4138]">{message}</div> : null}
          {accessState === 'checking' ? <div className="py-10 text-center text-[13px] text-black/42">正在读取管理员权限与地点…</div> : null}
          {accessState === 'email' ? (
            <form className="grid gap-4" onSubmit={handleRequestOtp}>
              <p className="m-0 text-[13px] leading-[1.7] text-black/48">地点生产属于管理员操作，请先登录。</p>
              <input autoComplete="email" className={fieldClassName} onChange={(event) => setEmail(event.target.value)} placeholder="管理员邮箱" required type="email" value={email} />
              <button className="h-11 rounded-full bg-[#191a18] text-[13px] font-medium text-white disabled:opacity-45" disabled={authBusy} type="submit">{authBusy ? '发送中…' : '获取验证码'}</button>
            </form>
          ) : null}
          {accessState === 'otp' ? (
            <form className="grid gap-4" onSubmit={handleVerifyOtp}>
              <p className="m-0 text-[13px] leading-[1.7] text-black/48">验证码已发送到 {email}</p>
              <input autoFocus className={`${fieldClassName} text-center font-mono text-[24px] tracking-[0.25em]`} inputMode="numeric" maxLength={6} onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required value={otpCode} />
              <button className="h-11 rounded-full bg-[#191a18] text-[13px] font-medium text-white disabled:opacity-45" disabled={authBusy || otpCode.length !== 6} type="submit">{authBusy ? '验证中…' : '进入地点管理'}</button>
            </form>
          ) : null}
          {accessState === 'forbidden' ? <div className="text-[14px] leading-[1.7] text-black/60">当前登录账号不在管理员名单中。</div> : null}
          {accessState === 'error' ? <button className="h-11 w-full rounded-full bg-[#191a18] text-[13px] text-white" onClick={() => void loadPlaces()} type="button">重新加载</button> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[20] flex bg-[#efefeb]/97 text-[#171816] backdrop-blur-[16px]">
      <aside
        className={cn(
          'flex w-[320px] shrink-0 flex-col border-r border-black/8 bg-[#f8f8f5]/94',
          mobileEditorOpen ? 'max-[760px]:hidden' : 'max-[760px]:w-full',
        )}
      >
        <header className="border-b border-black/8 px-5 pb-4 pt-[calc(1rem+var(--safe-top))]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#718653]">若水 · Admin</div>
              <h1 className="mb-0 mt-1.5 text-[22px] font-semibold tracking-[-0.04em]">地点管理</h1>
            </div>
            <button className="rounded-full bg-[#20261c] px-3 py-2 text-[10px] font-medium text-white" onClick={beginCreate} type="button">＋ 新地点</button>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px]">
            <button className="rounded-full bg-white px-2.5 py-1.5 text-black/48" onClick={() => switchAdminMode('review')} type="button">Story 审核</button>
            <button className="rounded-full bg-white px-2.5 py-1.5 text-black/48" onClick={() => switchAdminMode('comments')} type="button">评论</button>
            <button className="ml-auto px-2 py-1.5 text-black/34" onClick={() => switchAdminMode(null)} type="button">退出</button>
          </div>
          <div className="mt-3 text-[10px] text-black/34">{places.length} 个正式地点 · 按 sortOrder 排序</div>
        </header>

        <div className={cn('min-h-0 flex-1 overflow-y-auto p-2.5', scrollAreaClassNames.thin)}>
          {places.length === 0 ? (
            <div className="grid min-h-[280px] place-items-center px-5 text-center text-[12px] leading-[1.7] text-black/36">
              还没有正式地点。<br />先从若水广场开始。
            </div>
          ) : (
            <div className="grid gap-1.5">
              {places.map((place) => {
                const active = editorMode?.kind === 'edit' && editorMode.placeId === place.id;
                return (
                  <button
                    className={cn(
                      'rounded-[17px] px-3.5 py-3 text-left transition-colors',
                      active ? 'bg-white shadow-[0_1px_0_rgba(0,0,0,0.04)]' : 'hover:bg-white/60',
                    )}
                    key={place.id}
                    onClick={() => {
                      hydratePlace(place);
                      setMobileEditorOpen(true);
                    }}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-[14px] font-semibold">{place.name}</span>
                      <span className="shrink-0 text-[9px] text-black/28">#{place.sortOrder}</span>
                    </div>
                    <div className="mt-1.5 line-clamp-2 text-[10px] leading-[1.55] text-black/36">{place.intro || '还没有地点介绍'}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <main className={cn('min-w-0 flex-1 overflow-hidden', !mobileEditorOpen && 'max-[760px]:hidden')}>
        {!editorMode ? (
          <div className="grid h-full place-items-center px-6 text-center text-[13px] leading-[1.7] text-black/35">
            <div>选择一个地点编辑，<br />或创建第一个正式 Place。</div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex min-h-[64px] items-center justify-between gap-4 border-b border-black/8 bg-[#fafaf7]/88 px-6 pt-[var(--safe-top)] max-[760px]:px-4">
              <div className="flex min-w-0 items-center gap-3">
                <button className="hidden rounded-full px-2 py-1 text-[12px] text-black/48 max-[760px]:block" onClick={() => setMobileEditorOpen(false)} type="button">‹ 地点</button>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-[#718653]">{editorMode.kind === 'create' ? 'New Place' : 'Place'}</div>
                  <div className="mt-0.5 truncate text-[14px] font-semibold">{name.trim() || '未命名地点'}</div>
                </div>
              </div>
              <button className="h-9 rounded-full bg-[#20261c] px-4 text-[11px] font-medium text-white disabled:opacity-40" disabled={saving} onClick={() => void savePlace()} type="button">{saving ? '保存中…' : editorMode.kind === 'create' ? '创建地点' : '保存地点'}</button>
            </header>

            <div className={cn('min-h-0 flex-1 overflow-y-auto', scrollAreaClassNames.thin)}>
              <div className="mx-auto grid w-full max-w-[820px] gap-6 px-7 py-7 max-[760px]:px-4 max-[760px]:py-5">
                {message ? (
                  <div className={cn('rounded-[14px] px-4 py-3 text-[12px] leading-[1.6]', message === '地点已保存。' ? 'bg-[#edf4e6] text-[#53683c]' : 'bg-[#fff0ed] text-[#8d4138]')}>{message}</div>
                ) : null}

                <section className="grid gap-5 rounded-[22px] border border-black/8 bg-white/76 p-5">
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold text-black/48" htmlFor="admin-place-name">地点名称</label>
                    <input id="admin-place-name" className={fieldClassName} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder="例如：若水广场" value={name} />
                  </div>
                  <div>
                    <label className="mb-2 block text-[11px] font-semibold text-black/48" htmlFor="admin-place-intro">地点介绍</label>
                    <textarea id="admin-place-intro" className={`${fieldClassName} min-h-[150px] resize-y leading-[1.75]`} maxLength={2000} onChange={(event) => setIntro(event.target.value)} placeholder="它是什么地方？大家为什么会记得这里？" value={intro} />
                    <div className="mt-1.5 text-right text-[9px] text-black/25">{intro.length}/2000</div>
                  </div>
                  <div className="max-w-[180px]">
                    <label className="mb-2 block text-[11px] font-semibold text-black/48" htmlFor="admin-place-order">排序</label>
                    <input id="admin-place-order" className={fieldClassName} inputMode="numeric" onChange={(event) => setSortOrder(event.target.value.replace(/[^0-9-]/g, ''))} value={sortOrder} />
                  </div>
                </section>

                <section className="rounded-[22px] border border-black/8 bg-white/76 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/38">空间标定</div>
                      <div className={cn('mt-2 text-[13px] font-medium', anchor ? 'text-[#53683c]' : 'text-black/48')}>{anchorSummary(anchor)}</div>
                      <p className="mb-0 mt-2 max-w-[520px] text-[11px] leading-[1.65] text-black/36">Place 的 markerPosition 决定地图上的地点入口；camera pose 决定用户点击地点时首先看到的镜头。</p>
                    </div>
                    <button className="h-10 rounded-full border border-black/9 bg-white px-4 text-[11px] font-medium text-black/62" onClick={openAnchorEditor} type="button">{anchor ? '重新标定' : '去 3D 标定'}</button>
                  </div>
                  {anchor ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] text-black/34 max-[520px]:grid-cols-1">
                      <div className="rounded-[12px] bg-black/[0.03] px-3 py-2">Marker · {anchor.markerPosition.x.toFixed(3)}, {anchor.markerPosition.y.toFixed(3)}, {anchor.markerPosition.z.toFixed(3)}</div>
                      <div className="rounded-[12px] bg-black/[0.03] px-3 py-2">FOV · {anchor.cameraPose.fovDeg?.toFixed(1) ?? 'viewer default'}</div>
                    </div>
                  ) : null}
                </section>

                <div className="text-[10px] leading-[1.65] text-black/30">v1 不提供删除 Place。地点一旦被 Story 引用，删除需要单独设计迁移 / 降级语义；当前只允许创建与校准。</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export { AdminPlaceConsole };
