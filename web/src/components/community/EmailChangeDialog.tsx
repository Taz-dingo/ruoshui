import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';

import {
  fetchEmailChangeStatus,
  logout,
  requestCurrentEmailChangeOtp,
  requestNewEmailChangeOtp,
  verifyCurrentEmailChangeOtp,
  verifyNewEmailChangeOtp,
} from '../../community/account-api';
import {
  clearProfileAvatar,
  fetchUserProfile,
  requestProfileAvatarUpload,
  updateUserProfileDetails,
  uploadProfileAvatar,
} from '../../community/profile-api';
import { focusSurfaceClassNames } from '../../styles/system';
import { cn } from '../../utils/cn';

interface EmailChangeDialogProps {
  onChanged?: (email: string) => void;
  onClose: () => void;
  open: boolean;
}

type AccountStep = 'loading' | 'profile' | 'currentOtp' | 'newEmail' | 'newOtp' | 'done';

const inputClassName =
  'h-11 w-full border-0 border-b border-black/10 bg-transparent px-0 text-[14px] outline-none focus:border-[#7f985f]';
const sectionLabelClassName =
  'text-[10px] font-semibold uppercase tracking-[0.14em] text-black/32';

function normalizeOptionalText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function parseOptionalYear(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function EmailChangeDialog({ onChanged, onClose, open }: EmailChangeDialogProps) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<AccountStep>('loading');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarNonce, setAvatarNonce] = useState(0);
  const [enrollmentYear, setEnrollmentYear] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [department, setDepartment] = useState('');
  const [major, setMajor] = useState('');
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStep('loading');
    setCurrentCode('');
    setNewCode('');
    setNewEmail('');
    setProof('');
    setMessage(null);
    setSuccessMessage(null);

    void Promise.all([fetchUserProfile(), fetchEmailChangeStatus()])
      .then(([profile, emailStatus]) => {
        if (cancelled) return;
        setDisplayName(profile.displayName ?? '');
        setAvatarUrl(profile.avatarUrl);
        setEnrollmentYear(profile.alumniIdentity?.enrollmentYear?.toString() ?? '');
        setGraduationYear(profile.alumniIdentity?.graduationYear?.toString() ?? '');
        setDepartment(profile.alumniIdentity?.department ?? '');
        setMajor(profile.alumniIdentity?.major ?? '');
        setCurrentEmail(emailStatus.email);
        setStep('profile');
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : '账号信息读取失败。');
        setStep('profile');
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleSaveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedEnrollmentYear = parseOptionalYear(enrollmentYear);
    const parsedGraduationYear = parseOptionalYear(graduationYear);
    if (Number.isNaN(parsedEnrollmentYear) || Number.isNaN(parsedGraduationYear)) {
      setMessage('入学年份和毕业年份需要填写完整年份，例如 2019。');
      return;
    }

    setBusy(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const next = await updateUserProfileDetails({
        displayName: normalizeOptionalText(displayName),
        alumniIdentity: {
          enrollmentYear: parsedEnrollmentYear,
          graduationYear: parsedGraduationYear,
          department: normalizeOptionalText(department),
          major: normalizeOptionalText(major),
        },
      });
      setDisplayName(next.displayName ?? '');
      setEnrollmentYear(next.alumniIdentity?.enrollmentYear?.toString() ?? '');
      setGraduationYear(next.alumniIdentity?.graduationYear?.toString() ?? '');
      setDepartment(next.alumniIdentity?.department ?? '');
      setMajor(next.alumniIdentity?.major ?? '');
      setSuccessMessage('个人资料已保存。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '个人资料保存失败。');
    } finally {
      setBusy(false);
    }
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setMessage('头像支持 JPEG、PNG 或 WebP。');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage('头像请控制在 8 MB 以内。');
      return;
    }

    setAvatarBusy(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const ticket = await requestProfileAvatarUpload(file);
      const next = await uploadProfileAvatar(ticket, file);
      setAvatarUrl(next.avatarUrl);
      setAvatarNonce(Date.now());
      setSuccessMessage('头像已更新。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '头像更新失败。');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarBusy(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      await clearProfileAvatar();
      setAvatarUrl(null);
      setSuccessMessage('已恢复默认头像。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '头像删除失败。');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRequestCurrentOtp() {
    setBusy(true);
    setMessage(null);
    setSuccessMessage(null);
    try {
      const status = await requestCurrentEmailChangeOtp();
      setCurrentEmail(status.email);
      setCurrentCode('');
      setStep('currentOtp');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '验证码发送失败。');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCurrent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await verifyCurrentEmailChangeOtp(currentCode);
      setProof(result.proof);
      setStep('newEmail');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '当前邮箱验证失败。');
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await requestNewEmailChangeOtp(newEmail.trim(), proof);
      setNewCode('');
      setStep('newOtp');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '新邮箱验证码发送失败。');
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyNew(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await verifyNewEmailChangeOtp(newEmail.trim(), newCode, proof);
      setCurrentEmail(result.email);
      setStep('done');
      onChanged?.(result.email);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '新邮箱验证失败。');
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    if (!window.confirm('退出当前若水账号？')) return;
    setBusy(true);
    setMessage(null);
    try {
      await logout();
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '退出登录失败。');
      setBusy(false);
    }
  }

  if (!open) return null;

  const avatarInitial = displayName.trim().slice(0, 1) || '若';
  const profileAvatarSrc = avatarUrl
    ? `${avatarUrl}${avatarUrl.includes('?') ? '&' : '?'}v=${avatarNonce}`
    : null;

  return (
    <div
      aria-label="个人资料与账号"
      aria-modal="true"
      className={cn('fixed inset-0 z-[24] grid place-items-center p-4 max-[760px]:items-end max-[760px]:p-0', focusSurfaceClassNames.workspaceBackdrop)}
      role="dialog"
    >
      <div className={cn('flex max-h-[min(780px,calc(var(--app-height)-2rem))] w-[min(560px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] max-[760px]:h-[88dvh] max-[760px]:max-h-none max-[760px]:w-full max-[760px]:rounded-b-none max-[760px]:rounded-t-[28px]', focusSurfaceClassNames.workspacePanel)}>
        <header className="flex min-h-[68px] items-center justify-between border-b border-black/[0.065] px-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#708653]">若水</div>
            <h2 className="mb-0 mt-1 text-[21px] font-semibold tracking-[-0.035em]">
              {step === 'profile' || step === 'loading' ? '个人资料与账号' : '更换登录邮箱'}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {step !== 'profile' && step !== 'loading' ? (
              <button className="rounded-full px-3 py-2 text-[11px] text-black/42 hover:bg-black/5" onClick={() => { setMessage(null); setStep('profile'); }} type="button">返回</button>
            ) : null}
            <button className="h-9 w-9 rounded-full text-[20px] text-black/38 hover:bg-black/5" onClick={onClose} type="button">×</button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-6">
          {message ? <div className="mb-5 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-[12px] leading-[1.6] text-[#8e4037]">{message}</div> : null}
          {successMessage && step === 'profile' ? <div className="mb-5 rounded-[14px] bg-[#edf4e5] px-4 py-3 text-[12px] text-[#61764a]">{successMessage}</div> : null}

          {step === 'loading' ? <div className="grid min-h-[320px] place-items-center text-[12px] text-black/38">正在读取账号信息…</div> : null}

          {step === 'profile' ? (
            <form className="grid gap-8" onSubmit={handleSaveProfile}>
              <section>
                <div className={sectionLabelClassName}>个人资料</div>
                <div className="mt-5 flex items-center gap-4">
                  <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8ede2] text-[26px] font-semibold text-[#61764a]">
                    {profileAvatarSrc ? <img alt="你的头像" className="h-full w-full object-cover" src={profileAvatarSrc} /> : avatarInitial}
                  </div>
                  <div className="grid gap-2">
                    <input accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} ref={avatarInputRef} type="file" />
                    <button className="w-fit rounded-full bg-black/[0.055] px-4 py-2 text-[11px] font-medium text-black/62 hover:bg-black/[0.08] disabled:opacity-40" disabled={avatarBusy} onClick={() => avatarInputRef.current?.click()} type="button">{avatarBusy ? '处理中…' : avatarUrl ? '更换头像' : '上传头像'}</button>
                    {avatarUrl ? <button className="w-fit px-1 text-[10px] text-black/34 hover:text-black/58 disabled:opacity-40" disabled={avatarBusy} onClick={() => void handleRemoveAvatar()} type="button">恢复默认头像</button> : null}
                    <div className="text-[10px] leading-[1.5] text-black/28">JPEG / PNG / WebP，最大 8 MB</div>
                  </div>
                </div>
                <label className="mt-6 block">
                  <span className="text-[11px] text-black/42">昵称</span>
                  <input className={inputClassName} maxLength={80} onChange={(event) => setDisplayName(event.target.value)} placeholder="你希望大家怎么称呼你" value={displayName} />
                </label>
              </section>

              <section className="border-t border-black/[0.065] pt-6">
                <div className={sectionLabelClassName}>校友身份 · 可选</div>
                <p className="mb-0 mt-2 text-[11px] leading-[1.65] text-black/35">由本人填写，不代表学校认证。没有想填的内容可以全部留空。</p>
                <div className="mt-4 grid grid-cols-2 gap-x-5 gap-y-4 max-[520px]:grid-cols-1">
                  <label>
                    <span className="text-[11px] text-black/42">入学年份</span>
                    <input className={inputClassName} inputMode="numeric" maxLength={4} onChange={(event) => setEnrollmentYear(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="例如 2019" value={enrollmentYear} />
                  </label>
                  <label>
                    <span className="text-[11px] text-black/42">毕业年份</span>
                    <input className={inputClassName} inputMode="numeric" maxLength={4} onChange={(event) => setGraduationYear(event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="例如 2023" value={graduationYear} />
                  </label>
                  <label>
                    <span className="text-[11px] text-black/42">学院 / 系</span>
                    <input className={inputClassName} maxLength={120} onChange={(event) => setDepartment(event.target.value)} placeholder="例如 计算机学院" value={department} />
                  </label>
                  <label>
                    <span className="text-[11px] text-black/42">专业</span>
                    <input className={inputClassName} maxLength={120} onChange={(event) => setMajor(event.target.value)} placeholder="例如 计算机科学与技术" value={major} />
                  </label>
                </div>
                <button className="mt-5 h-11 rounded-full bg-[#20251d] px-5 text-[12px] font-medium text-white disabled:opacity-40" disabled={busy} type="submit">{busy ? '保存中…' : '保存个人资料'}</button>
              </section>

              <section className="border-t border-black/[0.065] pt-6">
                <div className={sectionLabelClassName}>账号与安全</div>
                <div className="mt-4 flex items-center justify-between gap-4 border-b border-black/[0.055] pb-4">
                  <div className="min-w-0">
                    <div className="text-[11px] text-black/36">登录邮箱</div>
                    <div className="mt-1 truncate text-[13px] font-medium">{currentEmail || '—'}</div>
                  </div>
                  <button className="shrink-0 rounded-full px-3 py-2 text-[11px] font-medium text-black/52 hover:bg-black/5" disabled={busy || !currentEmail} onClick={() => void handleRequestCurrentOtp()} type="button">更换</button>
                </div>
                <button className="mt-4 text-[11px] font-medium text-[#9b4b43] hover:text-[#7e3832] disabled:opacity-40" disabled={busy} onClick={() => void handleLogout()} type="button">退出登录</button>
              </section>
            </form>
          ) : null}

          {step === 'currentOtp' ? (
            <form className="grid gap-5" onSubmit={handleVerifyCurrent}>
              <div>
                <h3 className="m-0 text-[22px] font-semibold tracking-[-0.035em]">确认是你本人</h3>
                <p className="mb-0 mt-2 text-[12px] leading-[1.7] text-black/42">验证码已发送到 {currentEmail}</p>
              </div>
              <input autoFocus className={`${inputClassName} text-center font-mono text-[25px] tracking-[0.24em]`} inputMode="numeric" maxLength={6} onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required value={currentCode} />
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white disabled:opacity-40" disabled={busy || currentCode.length !== 6} type="submit">{busy ? '验证中…' : '继续'}</button>
              <p className="m-0 text-[10px] leading-[1.65] text-black/30">当前邮箱已经无法访问时，不提供绕过验证的自助入口，需要人工处理。</p>
            </form>
          ) : null}

          {step === 'newEmail' ? (
            <form className="grid gap-5" onSubmit={handleRequestNew}>
              <div>
                <h3 className="m-0 text-[22px] font-semibold tracking-[-0.035em]">填写新邮箱</h3>
                <p className="mb-0 mt-2 text-[12px] leading-[1.7] text-black/42">新邮箱验证成功后会立刻成为之后的登录邮箱。</p>
              </div>
              <input autoComplete="email" className={inputClassName} onChange={(event) => setNewEmail(event.target.value)} placeholder="新的邮箱地址" required type="email" value={newEmail} />
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white disabled:opacity-40" disabled={busy || !newEmail.trim()} type="submit">{busy ? '发送中…' : '发送新邮箱验证码'}</button>
            </form>
          ) : null}

          {step === 'newOtp' ? (
            <form className="grid gap-5" onSubmit={handleVerifyNew}>
              <div>
                <h3 className="m-0 text-[22px] font-semibold tracking-[-0.035em]">验证新邮箱</h3>
                <p className="mb-0 mt-2 break-all text-[12px] leading-[1.7] text-black/42">验证码已发送到 {newEmail}</p>
              </div>
              <input autoFocus className={`${inputClassName} text-center font-mono text-[25px] tracking-[0.24em]`} inputMode="numeric" maxLength={6} onChange={(event) => setNewCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required value={newCode} />
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white disabled:opacity-40" disabled={busy || newCode.length !== 6} type="submit">{busy ? '验证中…' : '完成更换'}</button>
            </form>
          ) : null}

          {step === 'done' ? (
            <div className="grid gap-5 py-2 text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#edf4e5] text-[20px] text-[#61764a]">✓</div>
              <div>
                <h3 className="m-0 text-[22px] font-semibold tracking-[-0.035em]">登录邮箱已更换</h3>
                <p className="mb-0 mt-2 break-all text-[12px] leading-[1.7] text-black/42">以后使用 {currentEmail} 登录。其他设备上的旧会话已经退出。</p>
              </div>
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white" onClick={() => setStep('profile')} type="button">回到账户</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { EmailChangeDialog };
