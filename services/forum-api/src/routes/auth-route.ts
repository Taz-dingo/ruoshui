import {
  requestEmailOtpInputSchema,
  updateUserProfileInputSchema,
  verifyEmailOtpInputSchema,
} from "@ruoshui/shared";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import type { AuthService } from "../lib/auth.js";

const SESSION_COOKIE_NAME = "ruoshui_session";

interface CreateAuthRouteOptions {
  authService: AuthService;
}

function isSecureRequest(requestUrl: string): boolean {
  return new URL(requestUrl).protocol === "https:";
}

function requireSessionUser(
  user: Awaited<ReturnType<AuthService["getUserForSessionToken"]>>,
): asserts user is NonNullable<typeof user> {
  if (!user) {
    const error = new Error("Authentication required.");
    Object.assign(error, { status: 401 });
    throw error;
  }
}

function createAuthRoute(options: CreateAuthRouteOptions): Hono {
  const route = new Hono();

  route.post("/email/request-otp", async (context) => {
    const input = requestEmailOtpInputSchema.parse(await context.req.json());
    await options.authService.requestLoginOtp(input.email);
    return context.json({ ok: true }, 202);
  });

  route.post("/email/verify", async (context) => {
    const input = verifyEmailOtpInputSchema.parse(await context.req.json());
    const result = await options.authService.verifyLoginOtp(input.email, input.code);
    const maxAgeSeconds = Math.max(
      1,
      Math.floor((result.expiresAt.getTime() - Date.now()) / 1000),
    );

    setCookie(context, SESSION_COOKIE_NAME, result.sessionToken, {
      httpOnly: true,
      maxAge: maxAgeSeconds,
      path: "/",
      sameSite: "Lax",
      secure: isSecureRequest(context.req.url),
    });

    return context.json({ ok: true, user: result.user });
  });

  route.get("/me", async (context) => {
    const user = await options.authService.getUserForSessionToken(
      getCookie(context, SESSION_COOKIE_NAME),
    );
    return context.json({ user });
  });

  route.patch("/profile", async (context) => {
    const sessionToken = getCookie(context, SESSION_COOKIE_NAME);
    const user = await options.authService.getUserForSessionToken(sessionToken);
    requireSessionUser(user);

    const input = updateUserProfileInputSchema.parse(await context.req.json());
    const updatedUser = await options.authService.updateDisplayName(user.id, input.displayName);
    return context.json({ ok: true, user: updatedUser });
  });

  route.post("/logout", async (context) => {
    const sessionToken = getCookie(context, SESSION_COOKIE_NAME);
    await options.authService.logout(sessionToken);
    deleteCookie(context, SESSION_COOKIE_NAME, { path: "/" });
    return context.json({ ok: true });
  });

  return route;
}

export { SESSION_COOKIE_NAME, createAuthRoute };
