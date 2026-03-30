import { db } from "@/lib/db"
import { NotificationType } from "@prisma/client"
import { randomUUID } from "crypto"

export interface CreateNotificationInput {
  userId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export class NotificationService {
  static async create(input: CreateNotificationInput) {
    return db.notification.create({
      data: {
        id: randomUUID(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        read: false,
        createdAt: new Date(),
      },
    })
  }

  static async list(userId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize
    const [notifications, total] = await Promise.all([
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
      db.notification.count({ where: { userId } }),
    ])
    return { notifications, total }
  }

  static async unreadCount(userId: string) {
    return db.notification.count({ where: { userId, read: false } })
  }

  static async markRead(notificationId: string, userId: string) {
    return db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    })
  }

  static async markAllRead(userId: string) {
    return db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
  }
}
