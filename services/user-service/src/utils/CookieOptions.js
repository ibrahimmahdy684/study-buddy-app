import { parse, serialize } from "cookie";

const isProd = process.env.NODE_ENV === "production";

const baseCookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "strict" : "lax",
  path: "/",
};

export const buildAuthCookie = (token) =>
  serialize("token", token, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60,
  });

export const buildClearAuthCookie = () =>
  serialize("token", "", {
    ...baseCookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });

export const getTokenFromCookieHeader = (cookieHeader) => {
  if (!cookieHeader) {
    return null;
  }

  const parsed = parse(cookieHeader);
  return parsed.token || null;
};