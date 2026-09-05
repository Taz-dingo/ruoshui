import type { AuthEmailSender } from "./auth.js";

const TENCENT_SES_ENDPOINT = "https://ses.tencentcloudapi.com/";
const TENCENT_SES_HOST = "ses.tencentcloudapi.com";
const TENCENT_SES_SERVICE = "ses";
const TENCENT_SES_ACTION = "SendEmail";
const TENCENT_SES_VERSION = "2020-10-02";
const CONTENT_TYPE = "application/json; charset=utf-8";
const SIGNED_HEADERS = "content-type;host";

interface CreateTencentSesAuthEmailSenderOptions {
  fetchFn?: typeof fetch;
  fromEmail: string;
  fromName?: string;
  now?: () => Date;
  region?: "ap-guangzhou" | "ap-hongkong";
  secretId: string;
  secretKey: string;
  templateId: number;
}

interface TencentSesResponse {
  Response?: {
    Error?: {
      Code?: string;
      Message?: string;
    };
    MessageId?: string;
    RequestId?: string;
  };
}

function textBytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", textBytes(value));
  return bytesToHex(new Uint8Array(digest));
}

async function hmacSha256(
  key: string | Uint8Array,
  value: string,
): Promise<Uint8Array> {
  const importedKey = await crypto.subtle.importKey(
    "raw",
    typeof key === "string" ? textBytes(key) : key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", importedKey, textBytes(value));
  return new Uint8Array(signature);
}

function sanitizeFromName(value: string | undefined): string {
  return (value?.trim() || "若水").replace(/[<>:\r\n]/g, "").trim() || "若水";
}

function formatFromAddress(name: string, email: string): string {
  return `${name} <${email.trim()}>`;
}

async function createTencentCloudAuthorization(input: {
  payload: string;
  secretId: string;
  secretKey: string;
  timestamp: number;
}): Promise<string> {
  const date = new Date(input.timestamp * 1000).toISOString().slice(0, 10);
  const canonicalHeaders = `content-type:${CONTENT_TYPE}\nhost:${TENCENT_SES_HOST}\n`;
  const hashedPayload = await sha256Hex(input.payload);
  const canonicalRequest = [
    "POST",
    "/",
    "",
    canonicalHeaders,
    SIGNED_HEADERS,
    hashedPayload,
  ].join("\n");
  const credentialScope = `${date}/${TENCENT_SES_SERVICE}/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    String(input.timestamp),
    credentialScope,
    await sha256Hex(canonicalRequest),
  ].join("\n");

  const secretDate = await hmacSha256(`TC3${input.secretKey}`, date);
  const secretService = await hmacSha256(secretDate, TENCENT_SES_SERVICE);
  const secretSigning = await hmacSha256(secretService, "tc3_request");
  const signature = bytesToHex(await hmacSha256(secretSigning, stringToSign));

  return `TC3-HMAC-SHA256 Credential=${input.secretId}/${credentialScope}, SignedHeaders=${SIGNED_HEADERS}, Signature=${signature}`;
}

function createTencentSesAuthEmailSender(
  options: CreateTencentSesAuthEmailSenderOptions,
): AuthEmailSender {
  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? (() => new Date());
  const fromName = sanitizeFromName(options.fromName);
  const region = options.region ?? "ap-guangzhou";

  return {
    async sendLoginOtp({ code, email }) {
      const timestamp = Math.floor(now().getTime() / 1000);
      const payload = JSON.stringify({
        FromEmailAddress: formatFromAddress(fromName, options.fromEmail),
        Destination: [email],
        Subject: "若水登录验证码",
        Template: {
          TemplateID: options.templateId,
          TemplateData: JSON.stringify({ code }),
        },
        TriggerType: 1,
      });
      const authorization = await createTencentCloudAuthorization({
        payload,
        secretId: options.secretId,
        secretKey: options.secretKey,
        timestamp,
      });

      const response = await fetchFn(TENCENT_SES_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: authorization,
          "Content-Type": CONTENT_TYPE,
          "X-TC-Action": TENCENT_SES_ACTION,
          "X-TC-Region": region,
          "X-TC-Timestamp": String(timestamp),
          "X-TC-Version": TENCENT_SES_VERSION,
        },
        body: payload,
      });

      let result: TencentSesResponse | null = null;
      try {
        result = (await response.json()) as TencentSesResponse;
      } catch {
        result = null;
      }

      const apiError = result?.Response?.Error;
      if (!response.ok || apiError) {
        const requestId = result?.Response?.RequestId;
        const codeText = apiError?.Code ?? `HTTP ${response.status}`;
        const detail = apiError?.Message ?? response.statusText ?? "Unknown Tencent SES error";
        throw new Error(
          `Tencent SES SendEmail failed (${codeText}): ${detail}${requestId ? ` [RequestId: ${requestId}]` : ""}`,
        );
      }
    },
  };
}

export { createTencentCloudAuthorization, createTencentSesAuthEmailSender };
export type { CreateTencentSesAuthEmailSenderOptions, TencentSesResponse };
