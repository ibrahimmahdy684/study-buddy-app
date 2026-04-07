import { verifyAuthToken } from "../utils/auth.js";
import { getTokenFromCookieHeader } from "../utils/CookieOptions.js";

export const buildContext = (req, res) => {
  const token = getTokenFromCookieHeader(req.headers.cookie || "");

  if (!token) {
    return { req, res, authUser: null };
  }

  const decoded = verifyAuthToken(token);

  if (!decoded) {
    return { req, res, authUser: null };
  }

  return {
    req,
    res,
    authUser: {
      id: decoded.id,
      email: decoded.email,
    },
  };
};
