import { defineService } from "srpc-core/rpc";
import { NotificationService } from "../generated/srpc-types.ts";
import { NotificationStatus } from "../generated/srpc-types.ts";
import { empty, nextId, now, paginate, paginationMeta, requireEntity } from "./helpers.ts";
import { store } from "./store.ts";

export const notificationService = defineService(NotificationService, {
  listNotifications({ pagination, userId, channel, status, unreadOnly }) {
    const all = [...store.notifications.values()].filter(notification => {
      if (notification.userId !== userId) {
        return false;
      }
      if (channel && notification.channel !== channel) {
        return false;
      }
      if (status && notification.status !== status) {
        return false;
      }
      if (unreadOnly && notification.status === NotificationStatus.READ) {
        return false;
      }
      return true;
    });

    return {
      items: paginate(all, pagination),
      meta: paginationMeta(pagination, all.length),
    };
  },

  getNotification(params, ctx) {
    return requireEntity(store.notifications.get(params.id), "Notification", params.id);
  },
  sendNotification(data) {
    const notification = {
      id: nextId("notification"),
      userId: data.userId,
      channel: data.channel,
      status: NotificationStatus.SENT,
      title: data.title,
      body: data.body,
      actionUrl: data.actionUrl,
      metadata: data.metadata,
      sentAt: now(),
      createdAt: now(),
    };
    store.notifications.set(notification.id, notification);
    return notification;
  },

  markAsRead({ userId, notificationIds }) {
    const updated = notificationIds
      .map(id => store.notifications.get(id))
      .filter((notification): notification is NonNullable<typeof notification> => {
        return Boolean(notification && notification.userId === userId);
      });

    for (const notification of updated) {
      notification.status = NotificationStatus.READ;
      notification.readAt = now();
    }

    return {
      items: updated,
      meta: paginationMeta({ page: 1, pageSize: updated.length || 1 }, updated.length),
    };
  },

  markAllAsRead({ id: userId }) {
    for (const notification of store.notifications.values()) {
      if (notification.userId === userId && notification.status !== NotificationStatus.READ) {
        notification.status = NotificationStatus.READ;
        notification.readAt = now();
      }
    }
    return empty();
  },

  deleteNotification({ id }) {
    store.notifications.delete(id);
    return empty();
  },
});
