import { defineService } from "srpc-core/rpc";
import type { SrpcHandlerContext } from "srpc-core/rpc";
import { AuthService, UserService } from "../generated/srpc-types.ts";
import type { UserPreferences, UserProfile } from "../generated/srpc-types.ts";
import {
  UserStatus,
} from "../generated/srpc-types.ts";
import { empty, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { defaultUser, store } from "./store.ts";

function createLoginResponse(user: ReturnType<typeof defaultUser>) {
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  return {
    accessToken: `access-${user.id}-${Date.now()}`,
    refreshToken: `refresh-${user.id}-${Date.now()}`,
    expiresAt,
    user,
  };
}

function createUserFromRegister(email: string, profile: UserProfile, preferences?: UserPreferences) {
  const id = nextId("user");
  const user = defaultUser(id);
  user.email = email;
  user.profile = profile;
  if (preferences) {
    user.preferences = preferences;
  }
  store.users.set(id, user);
  return user;
}

export const userService = defineService(UserService, {
  getUser({ id }, ctx: SrpcHandlerContext) {
    console.log(`getUser id=${id} token=${ctx.getBearerToken() ?? "none"}`);
    return requireEntity(store.users.get(id), "User", id);
  },

  listUsers({ pagination, role, status, query }) {
    const all = [...store.users.values()].filter(user => {
      if (role && user.role !== role) {
        return false;
      }
      if (status && user.status !== status) {
        return false;
      }
      if (query) {
        const haystack = `${user.email} ${user.profile.firstName} ${user.profile.lastName}`.toLowerCase();
        if (!haystack.includes(query.toLowerCase())) {
          return false;
        }
      }
      return true;
    });

    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  createUser({ email, profile, preferences }) {
    return createUserFromRegister(email, profile, preferences);
  },

  updateUser({ userId, profile }) {
    const user = requireEntity(store.users.get(userId), "User", userId);
    user.profile = profile;
    user.updatedAt = now();
    return user;
  },

  updateUserStatus({ id }) {
    const user = requireEntity(store.users.get(id), "User", id);
    user.status = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    user.updatedAt = now();
    return user;
  },

  deleteUser({ id }) {
    store.users.delete(id);
    return empty();
  },

  addAddress({ userId, address }) {
    const user = requireEntity(store.users.get(userId), "User", userId);
    user.addresses = [...user.addresses, address];
    user.updatedAt = now();
    return user;
  },

  updateAddress({ userId, address }) {
    const user = requireEntity(store.users.get(userId), "User", userId);
    user.addresses = user.addresses.map(item => (item.id === address.id ? address : item));
    user.updatedAt = now();
    return user;
  },

  removeAddress({ userId, addressId }) {
    const user = requireEntity(store.users.get(userId), "User", userId);
    user.addresses = user.addresses.filter(item => item.id !== addressId);
    user.updatedAt = now();
    return user;
  },
});

export const authService = defineService(AuthService, {
  register(data) {
    const user = createUserFromRegister(data.email, data.profile, data.preferences);
    return createLoginResponse(user);
  },

  login({ email }) {
    const user = requireEntity(
      [...store.users.values()].find(item => item.email === email),
      "User",
      email
    );
    user.lastLoginAt = now();
    return createLoginResponse(user);
  },

  logout() {
    return empty();
  },

  refreshToken({ refreshToken }) {
    const userId = refreshToken.split("-")[1];
    const user = requireEntity(store.users.get(userId ?? ""), "User", userId ?? "");
    return createLoginResponse(user);
  },

  changePassword() {
    return empty();
  },

  verifyEmail({ id }) {
    const user = requireEntity(store.users.get(id), "User", id);
    user.emailVerifiedAt = now();
    user.status = UserStatus.ACTIVE;
    user.updatedAt = now();
    return user;
  },

  requestPasswordReset() {
    return empty();
  },
});
