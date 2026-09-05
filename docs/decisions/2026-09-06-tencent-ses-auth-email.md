# Tencent SES for Auth Email

状态：`Accepted`

日期：`2026-09-06`

## Context

若水 v1 使用 Email OTP 建立持久 User。主要用户位于中国大陆，因此验证码邮件需要优先考虑 QQ / 163 / 126 等国内邮箱的触达稳定性和延迟。

Cloudflare Email Sending 可以直接通过 Worker binding 发信，但向任意收件人发信需要 Workers Paid。若水当前没有其他必须升级 Workers Paid 的需求，为 OTP 单独增加固定月费没有明显收益。

## Decision

- 保持上层 `AuthEmailSender` contract 不变。
- Cloudflare Worker 继续承载 Auth / D1 / Story API，但验证码投递改为直接调用 **腾讯云 SES API 3.0 `SendEmail`**。
- Worker 自己使用 Web Crypto 实现腾讯云推荐的 `TC3-HMAC-SHA256` 请求签名，不引入体积较大的 Tencent Cloud Node SDK。
- 默认 Region 为 `ap-guangzhou`；如有需要可配置为 `ap-hongkong`。
- 发件地址使用 `no-reply@auth.tazdingo.net`，显示名为 `若水`。
- 使用腾讯云 SES 审核通过的普通发送模板。模板只保留一个变量 `{{code}}`；验证码有效期当前固定为 10 分钟，直接写入模板静态文案，避免普通发送模板的变量限制。
- `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`、`AUTH_OTP_SECRET` 必须作为 Worker secret 管理，不进入 Git。
- `TENCENT_SES_TEMPLATE_ID` 为非敏感配置，但只有模板审核通过后才能配置并启用生产 Auth。

## Production requirements

腾讯云侧：

1. 开通 SES。
2. 验证 `auth.tazdingo.net` 发信域名并按 SES 要求配置 SPF / DKIM 等 DNS。
3. 创建并验证发信地址 `no-reply@auth.tazdingo.net`。
4. 创建验证码模板并等待审核通过。模板正文至少包含 `{{code}}`，并写明“10 分钟内有效”。
5. 建议创建权限最小化的腾讯云子账号 / API 密钥，只授予若水发送 SES 邮件所需权限。

Worker 侧：

- secret: `TENCENT_CLOUD_SECRET_ID`
- secret: `TENCENT_CLOUD_SECRET_KEY`
- secret: `AUTH_OTP_SECRET`
- var: `TENCENT_SES_TEMPLATE_ID`
- var: `TENCENT_SES_REGION=ap-guangzhou`
- var: `AUTH_EMAIL_FROM=no-reply@auth.tazdingo.net`
- var: `AUTH_EMAIL_FROM_NAME=若水`

只有以上必要 Auth 配置完整时，Worker 才启用 Auth routes。

## Consequences

- 不再需要 Cloudflare Email Service binding，也不需要仅为了 OTP 升级 Workers Paid。
- OTP/User/Session/Story 权限逻辑保持不变；未来更换邮件服务商仍只需要替换 `AuthEmailSender` adapter。
- 腾讯云 SES 默认发送接口要求使用审核模板，因此生产 smoke 必须等模板审核通过后执行。
- 发送失败会保留腾讯云 `Error Code` 与 `RequestId` 到服务端错误信息，便于排障，但不得记录 SecretKey、OTP 明文或完整鉴权 header。

## Alternatives considered

### Cloudflare Email Sending

拒绝作为当前生产方案。集成更直接，但向任意用户发信需要 Workers Paid；若水当前规模不足以证明固定月费有价值。

### Resend / Brevo

可用，但若水的主要收件人位于中国大陆；在成本接近的情况下优先选择面向国内邮箱场景的腾讯云 SES。
