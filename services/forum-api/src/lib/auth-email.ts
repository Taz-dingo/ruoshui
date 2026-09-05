import type { AuthEmailSender } from "./auth.js";

interface CloudflareEmailBinding {
  send(message: {
    from: { email: string; name?: string };
    html?: string;
    subject: string;
    text: string;
    to: string | string[];
  }): Promise<unknown>;
}

interface CreateCloudflareAuthEmailSenderOptions {
  binding: CloudflareEmailBinding;
  fromEmail: string;
  fromName?: string;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}

function createCloudflareAuthEmailSender(
  options: CreateCloudflareAuthEmailSenderOptions,
): AuthEmailSender {
  const fromName = options.fromName?.trim() || "若水";

  return {
    async sendLoginOtp({ code, email, expiresInMinutes }) {
      const safeCode = escapeHtml(code);
      const safeMinutes = escapeHtml(String(expiresInMinutes));

      await options.binding.send({
        from: {
          email: options.fromEmail,
          name: fromName,
        },
        to: email,
        subject: "若水登录验证码",
        text: `你的若水验证码是 ${code}，有效期 ${expiresInMinutes} 分钟。若非本人操作，可以忽略这封邮件。`,
        html: `<p>你的若水验证码是：</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${safeCode}</p><p>有效期 ${safeMinutes} 分钟。若非本人操作，可以忽略这封邮件。</p>`,
      });
    },
  };
}

export { createCloudflareAuthEmailSender };
export type { CloudflareEmailBinding, CreateCloudflareAuthEmailSenderOptions };
