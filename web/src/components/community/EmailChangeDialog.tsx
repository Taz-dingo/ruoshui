import { type FormEvent, useEffect, useState } from 'react';

import {
  fetchEmailChangeStatus,
  requestCurrentEmailChangeOtp,
  requestNewEmailChangeOtp,
  verifyCurrentEmailChangeOtp,
  verifyNewEmailChangeOtp,
} from '../../community/account-api';

interface EmailChangeDialogProps {
  onChanged?: (email: string) => void;
  onClose: () => void;
  open: boolean;
}

type EmailChangeStep = 'loading' | 'current' | 'currentOtp' | 'newEmail' | 'newOtp' | 'done';

const inputClassName =
  'h-12 w-full border-0 border-b border-black/10 bg-transparent px-0 text-[14px] outline-none focus:border-[#7f985f]';

function EmailChangeDialog({ onChanged, onClose, open }: EmailChangeDialogProps) {
  const [step, setStep] = useState<EmailChangeStep>('loading');
  const [currentEmail, setCurrentEmail] = useState('');
  const [currentCode, setCurrentCode] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCode, setNewCode] = useState('');
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setStep('loading');
    setCurrentCode('');
    setNewCode('');
    setNewEmail('');
    setProof('');
    setMessage(null);

    void fetchEmailChangeStatus()
      .then((status) => {
        if (cancelled) return;
        setCurrentEmail(status.email);
        setStep('current');
      })
      .catch((error) => {
        if (cancelled) return;
        setMessage(error instanceof Error ? error.message : '登录邮箱读取失败。');
        setStep('current');
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  async function handleRequestCurrentOtp() {
    setBusy(true);
    setMessage(null);
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

  if (!open) return null;

  return (
    <div
      aria-label="更换登录邮箱"
      aria-modal="true"
      className="fixed inset-0 z-[24] grid place-items-center bg-black/35 p-4 backdrop-blur-[8px] max-[760px]:items-end max-[760px]:p-0"
      role="dialog"
    >
      <div className="w-[min(470px,calc(100vw-2rem))] overflow-hidden rounded-[26px] border border-white/55 bg-[#f8f8f5]/98 text-[#191a18] shadow-panel max-[760px]:w-full max-[760px]:rounded-b-none max-[760px]:rounded-t-[26px]">
        <header className="flex min-h-[64px] items-center justify-between border-b border-black/[0.065] px-5">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#708653]">账号安全</div>
            <h2 className="mb-0 mt-1 text-[20px] font-semibold tracking-[-0.035em]">更换登录邮箱</h2>
          </div>
          <button className="h-9 w-9 rounded-full text-[20px] text-black/38 hover:bg-black/5" onClick={onClose} type="button">×</button>
        </header>

        <div className="px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-6">
          {message ? (
            <div className="mb-5 rounded-[14px] bg-[#fff0ed] px-4 py-3 text-[12px] leading-[1.6] text-[#8e4037]">
              {message}
            </div>
          ) : null}

          {step === 'loading' ? (
            <div className="grid min-h-[220px] place-items-center text-[12px] text-black/38">正在读取账号信息…</div>
          ) : null}

          {step === 'current' ? (
            <div className="grid gap-5">
              <div>
                <p className="m-0 text-[13px] leading-[1.75] text-black/52">先验证当前登录邮箱，再验证新邮箱。这样更换后仍然是同一个若水账号，Story 和互动不会迁移或重建。</p>
                <div className="mt-5 rounded-[16px] bg-black/[0.035] px-4 py-3">
                  <div className="text-[9px] uppercase tracking-[0.12em] text-black/28">当前邮箱</div>
                  <div className="mt-1.5 break-all text-[14px] font-medium">{currentEmail || '—'}</div>
                </div>
              </div>
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white disabled:opacity-40" disabled={busy || !currentEmail} onClick={() => void handleRequestCurrentOtp()} type="button">
                {busy ? '发送中…' : '验证当前邮箱'}
              </button>
              <p className="m-0 text-[10px] leading-[1.65] text-black/30">当前邮箱已经无法访问时，不提供绕过验证的自助入口，需要人工处理。</p>
            </div>
          ) : null}

          {step === 'currentOtp' ? (
            <form className="grid gap-5" onSubmit={handleVerifyCurrent}>
              <div>
                <h3 className="m-0 text-[22px] font-semibold tracking-[-0.035em]">确认是你本人</h3>
                <p className="mb-0 mt-2 text-[12px] leading-[1.7] text-black/42">验证码已发送到 {currentEmail}</p>
              </div>
              <input autoFocus className={`${inputClassName} text-center font-mono text-[25px] tracking-[0.24em]`} inputMode="numeric" maxLength={6} onChange={(event) => setCurrentCode(event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required value={currentCode} />
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white disabled:opacity-40" disabled={busy || currentCode.length !== 6} type="submit">{busy ? '验证中…' : '继续'}</button>
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
              <button className="h-12 rounded-full bg-[#20251d] text-[13px] font-medium text-white" onClick={onClose} type="button">完成</button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export { EmailChangeDialog };
