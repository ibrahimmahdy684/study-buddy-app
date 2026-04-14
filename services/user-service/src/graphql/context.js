import { verifyAuthToken } from "../utils/auth.js";
import { getTokenFromCookieHeader } from "../utils/CookieOptions.js";

export const buildContext = (req, res) => {  // ✅ accept both
  let token = getTokenFromCookieHeader(req.headers.cookie || "");

  if (!token) {
    const authHeader = req.headers.authorization || "";
    token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  }

  const decoded = verifyAuthToken(token);

  if (!decoded) {
    const headerUserId = req.headers["x-user-id"] || req.headers["user-id"] || null;

    if (headerUserId) {
      return {
        req,
        res,
        authUser: {
          id: String(headerUserId),
          email: req.headers["x-user-email"] || null,
        },
      };
    }

    return { req, res, authUser: null };  // ✅ include res
  }

  return {
    req,
    res,                                  // ✅ include res
    authUser: {
      id: decoded.id,
      email: decoded.email,
    },
  };
};