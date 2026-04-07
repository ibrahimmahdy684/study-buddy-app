import { GraphQLError } from "graphql";

import {
  registerUser,
  loginUser,
  getUserById,
  updateUser,
  deleteUser,
} from "../services/AuthService.js";
import {
  registerSchema,
  loginSchema,
  updateUserSchema,
} from "../utils/validators.js";
import { buildAuthCookie, buildClearAuthCookie } from "../utils/CookieOptions.js";

const validationError = (zodError) => {
  const details = zodError.errors.map((error) => ({
    field: error.path?.[0] || "unknown",
    message: error.message,
  }));

  return new GraphQLError("Validation failed", {
    extensions: {
      code: "BAD_USER_INPUT",
      details,
    },
  });
};

const authError = () =>
  new GraphQLError("Not authenticated", {
    extensions: { code: "UNAUTHENTICATED" },
  });

const ensureAuthenticated = (context) => {
  if (!context.authUser?.id) {
    throw authError();
  }

  return context.authUser.id;
};

const throwServiceError = (error) => {
  const statusCode = error.statusCode || 500;

  if (statusCode === 401) {
    throw new GraphQLError(error.message, { extensions: { code: "UNAUTHENTICATED" } });
  }

  if (statusCode === 404) {
    throw new GraphQLError(error.message, { extensions: { code: "NOT_FOUND" } });
  }

  if (statusCode === 409) {
    throw new GraphQLError(error.message, { extensions: { code: "CONFLICT" } });
  }

  throw new GraphQLError(error.message || "Internal server error", {
    extensions: { code: "INTERNAL_SERVER_ERROR" },
  });
};

export const resolvers = {
  Query: {
    health: () => "user-service:ok",

    me: async (_, __, context) => {
      const userId = ensureAuthenticated(context);

      try {
        return await getUserById(userId);
      } catch (error) {
        throwServiceError(error);
      }
    },
  },

  Mutation: {
    register: async (_, { input }, context) => {
      const parsed = registerSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(parsed.error);
      }

      try {
        const { token, user } = await registerUser(parsed.data);
        context.res.setHeader("Set-Cookie", buildAuthCookie(token));

        return {
          message: "Account created successfully",
          user,
        };
      } catch (error) {
        throwServiceError(error);
      }
    },

    login: async (_, { input }, context) => {
      const parsed = loginSchema.safeParse(input);
      if (!parsed.success) {
        throw validationError(parsed.error);
      }

      try {
        const { token, user } = await loginUser(parsed.data);
        context.res.setHeader("Set-Cookie", buildAuthCookie(token));

        return {
          message: "Logged in successfully",
          user,
        };
      } catch (error) {
        throwServiceError(error);
      }
    },

    logout: (_, __, context) => {
      context.res.setHeader("Set-Cookie", buildClearAuthCookie());

      return {
        success: true,
        message: "Logged out successfully",
      };
    },

    updateMe: async (_, { input }, context) => {
      const userId = ensureAuthenticated(context);
      const parsed = updateUserSchema.safeParse(input);

      if (!parsed.success) {
        throw validationError(parsed.error);
      }

      try {
        return await updateUser(userId, parsed.data);
      } catch (error) {
        throwServiceError(error);
      }
    },

    deleteMe: async (_, __, context) => {
      const userId = ensureAuthenticated(context);

      try {
        await deleteUser(userId);
        context.res.setHeader("Set-Cookie", buildClearAuthCookie());

        return {
          success: true,
          message: "Account deleted successfully",
        };
      } catch (error) {
        throwServiceError(error);
      }
    },
  },
};
