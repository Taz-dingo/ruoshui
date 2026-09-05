import assert from "node:assert/strict";
import test from "node:test";

import {
  createTencentCloudAuthorization,
  createTencentSesAuthEmailSender,
} from "./auth-email.js";

const fixedTimestamp = 1_700_000_000;

function createOtpPayload() {
  return JSON.stringify({
    FromEmailAddress: "若水 <no-reply@auth.tazdingo.net>",
    Destination: ["user@example.com"],
    Subject: "若水登录验证码",
    Template: {
      TemplateID: 123456,
      TemplateData: JSON.stringify({ code: "123456" }),
    },
    TriggerType: 1,
  });
}

test("Tencent Cloud TC3 signature is deterministic for the SES request", async () => {
  const authorization = await createTencentCloudAuthorization({
    payload: createOtpPayload(),
    secretId: "AKIDEXAMPLE",
    secretKey: "SECRETEXAMPLE",
    timestamp: fixedTimestamp,
  });

  assert.equal(
    authorization,
    "TC3-HMAC-SHA256 Credential=AKIDEXAMPLE/2023-11-14/ses/tc3_request, SignedHeaders=content-type;host, Signature=f20816eaf0a5d5924165611f7ed3e1e90eb2bc92acfa63f46578a3ad2a164b69",
  );
});

test("Tencent SES sender uses the approved template and only sends the OTP code as template data", async () => {
  let capturedRequest: { input: RequestInfo | URL; init?: RequestInit } | null = null;
  const sender = createTencentSesAuthEmailSender({
    fetchFn: async (input, init) => {
      capturedRequest = { input, init };
      return new Response(
        JSON.stringify({ Response: { MessageId: "message_1", RequestId: "request_1" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
    fromEmail: "no-reply@auth.tazdingo.net",
    fromName: "若水",
    now: () => new Date(fixedTimestamp * 1000),
    region: "ap-guangzhou",
    secretId: "AKIDEXAMPLE",
    secretKey: "SECRETEXAMPLE",
    templateId: 123456,
  });

  await sender.sendLoginOtp({
    code: "123456",
    email: "user@example.com",
    expiresInMinutes: 10,
  });

  assert.ok(capturedRequest);
  assert.equal(String(capturedRequest.input), "https://ses.tencentcloudapi.com/");
  assert.equal(capturedRequest.init?.method, "POST");
  const headers = new Headers(capturedRequest.init?.headers);
  assert.equal(headers.get("x-tc-action"), "SendEmail");
  assert.equal(headers.get("x-tc-version"), "2020-10-02");
  assert.equal(headers.get("x-tc-region"), "ap-guangzhou");
  assert.equal(headers.get("x-tc-timestamp"), String(fixedTimestamp));
  assert.equal(
    headers.get("authorization"),
    "TC3-HMAC-SHA256 Credential=AKIDEXAMPLE/2023-11-14/ses/tc3_request, SignedHeaders=content-type;host, Signature=f20816eaf0a5d5924165611f7ed3e1e90eb2bc92acfa63f46578a3ad2a164b69",
  );
  assert.deepEqual(JSON.parse(String(capturedRequest.init?.body)), JSON.parse(createOtpPayload()));
});

test("Tencent SES API errors are surfaced with code and request id", async () => {
  const sender = createTencentSesAuthEmailSender({
    fetchFn: async () =>
      new Response(
        JSON.stringify({
          Response: {
            Error: {
              Code: "FailedOperation.InvalidTemplateID",
              Message: "template unavailable",
            },
            RequestId: "request_error",
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    fromEmail: "no-reply@auth.tazdingo.net",
    now: () => new Date(fixedTimestamp * 1000),
    secretId: "AKIDEXAMPLE",
    secretKey: "SECRETEXAMPLE",
    templateId: 123456,
  });

  await assert.rejects(
    () =>
      sender.sendLoginOtp({
        code: "123456",
        email: "user@example.com",
        expiresInMinutes: 10,
      }),
    /FailedOperation\.InvalidTemplateID.*request_error/,
  );
});
