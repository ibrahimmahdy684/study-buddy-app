const jwt = require("jsonwebtoken");
const { parse } = require("cookie");

function extractToken(req) {
  let token = null;

  const cookieHeader = req?.headers?.cookie || "";
  const cookies = parse(cookieHeader);
  if (cookies.token) {
    token = cookies.token;
  }

  const authHeader = req?.headers?.authorization || "";
  if (!token && authHeader.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  }

  return token;
}

function extractUser(req) {
  const token = extractToken(req);
  if (!token || !process.env.JWT_SECRET) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const id = decoded?.id || decoded?.userId || decoded?.sub || null;

    if (!id) {
      return null;
    }

    return {
      ...decoded,
      id: String(id),
    };
  } catch {
    return null;
  }
}

module.exports = { extractUser, extractToken };
