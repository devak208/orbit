import { prisma } from './db'
import { io } from 'socket.io-client'

/**
 * Comprehensive Notification Service
 * Handles event generation, recipient determination, storage, and real-time delivery
 */
export class NotificationService {
  constructor() {
    this.socketClient = null
  }

  /**
   * Initialize WebSocket connection for real-time notifications
   */
  initializeSocket() {
    if (typeof window !== 'undefined' && !this.socketClient) {
      this.socketClient = io('http://localhost:3001', {
        transports: ['websocket', 'polling']
      })
    }
  }

  /**
   * Create and dispatch a notification event
   */
  async createNotification({
    type,
    title,
    content,
    userId,
    entityId,
    entityType,
    metadata = {},
    priority = 'MEDIUM'
  }) {
    try {
      // Create notification record
      const notification = await prisma.notification.create({
        data: {
          type,
          title,
          content,
          userId,
          metadata: {
            ...metadata,
            entityId,
            entityType,
            priority,
            createdAt: new Date().toISOString()
          }
        }
      })

      // Create inbox item for real-time access
      const inboxItem = await prisma.inboxItem.create({
        data: {
          title,
          content,
          type: this.mapNotificationTypeToInboxType(type),
          userId,
          metadata: {
            ...metadata,
            notificationId: notification.id,
            entityId,
            entityType,
            priority
          }
        }
      })

      // Send real-time notification
      await this.sendRealTimeNotification(userId, {
        notification,
        inboxItem,
        type: 'new_notification'
      })

      // Handle delivery preferences (email, etc.)
      await this.handleDeliveryChannels(userId, notification)

      return { notification, inboxItem }
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Send real-time notification via WebSocket
   */
  async sendRealTimeNotification(userId, data) {
    try {
      if (this.socketClient) {
        this.socketClient.emit('user-notification', {
          userId,
          ...data,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error sending real-time notification:', error)
    }
  }

  /**
   * Handle different delivery channels based on user preferences
   */
  async handleDeliveryChannels(userId, notification) {
    try {
      // Get user preferences (mock for now, implement user preferences later)
      const userPreferences = await this.getUserPreferences(userId)

      // Email notifications
      if (userPreferences.email && this.shouldSendEmail(notification.type)) {
        await this.sendEmailNotification(userId, notification)
      }

      // SMS notifications (if implemented)
      if (userPreferences.sms && this.shouldSendSMS(notification.type)) {
        await this.sendSMSNotification(userId, notification)
      }

      // Push notifications
      if (userPreferences.push) {
        await this.sendPushNotification(userId, notification)
      }
    } catch (error) {
      console.error('Error handling delivery channels:', error)
    }
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    // For now, return default preferences
    // TODO: Implement user preferences table and API
    return {
      email: true,
      sms: false,
      push: true,
      inApp: true
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId, notification) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      })

      if (!user?.email) return

      // TODO: Implement email service (SendGrid, Nodemailer, etc.)
      console.log('📧 Email notification would be sent to:', user.email, {
        title: notification.title,
        content: notification.content
      })
    } catch (error) {
      console.error('Error sending email notification:', error)
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(userId, notification) {
    // TODO: Implement SMS service (Twilio, etc.)
    console.log('📱 SMS notification would be sent:', notification.title)
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, notification) {
    // TODO: Implement push notification service
    console.log('🔔 Push notification would be sent:', notification.title)
  }

  /**
   * Determine if email should be sent for this notification type
   */
  shouldSendEmail(type) {
    const emailTypes = [
      'PROJECT_INVITATION',
      'TASK_ASSIGNED',
      'TASK_DUE_SOON',
      'TASK_OVERDUE'
    ]
    return emailTypes.includes(type)
  }

  /**
   * Determine if SMS should be sent for this notification type
   */
  shouldSendSMS(type) {
    const smsTypes = [
      'TASK_OVERDUE',
      'PROJECT_INVITATION'
    ]
    return smsTypes.includes(type)
  }

  /**
   * Map notification type to inbox item type
   */
  mapNotificationTypeToInboxType(notificationType) {
    const mapping = {
      'TASK_ASSIGNED': 'TASK_ASSIGNMENT',
      'TASK_MENTIONED': 'MENTION',
      'PROJECT_INVITATION': 'PROJECT_INVITATION',
      'TASK_DUE_SOON': 'TASK_UPDATE',
      'TASK_OVERDUE': 'TASK_UPDATE',
      'COMMENT_ADDED': 'COMMENT',
      'PROJECT_UPDATED': 'SYSTEM'
    }
    return mapping[notificationType] || 'SYSTEM'
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId, notificationIds) {
    try {
      // Mark notifications as read
      await prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId
        },
        data: { isRead: true }
      })

      // Mark corresponding inbox items as read
      const inboxItems = await prisma.inboxItem.findMany({
        where: {
          userId,
          metadata: {
            path: ['notificationId'],
            in: notificationIds
          }
        }
      })

      for (const item of inboxItems) {
        await prisma.inboxItemRead.upsert({
          where: {
            userId_inboxItemId: {
              userId,
              inboxItemId: item.id
            }
          },
          update: {},
          create: {
            userId,
            inboxItemId: item.id
          }
        })
      }

      // Send real-time update
      await this.sendRealTimeNotification(userId, {
        type: 'notifications_read',
        notificationIds
      })

      return true
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      throw error
    }
  }

  /**
   * Archive notifications
   */
  async archiveNotifications(userId, notificationIds) {
    try {
      // Find corresponding inbox items
      const inboxItems = await prisma.inboxItem.findMany({
        where: {
          userId,
          metadata: {
            path: ['notificationId'],
            in: notificationIds
          }
        }
      })

      // Archive inbox items
      await prisma.inboxItem.updateMany({
        where: {
          id: { in: inboxItems.map(item => item.id) },
          userId
        },
        data: { status: 'ARCHIVED' }
      })

      // Send real-time update
      await this.sendRealTimeNotification(userId, {
        type: 'notifications_archived',
        notificationIds
      })

      return true
    } catch (error) {
      console.error('Error archiving notifications:', error)
      throw error
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId) {
    try {
      const count = await prisma.inboxItem.count({
        where: {
          userId,
          status: 'ACTIVE',
          reads: {
            none: {
              userId
            }
          }
        }
      })
      return count
    } catch (error) {
      console.error('Error getting unread count:', error)
      return 0
    }
  }

  /**
   * Event handlers for specific notification types
   */

  // Project invitation notification
  async notifyProjectInvitation({ inviterId, inviteeId, projectId, projectName, role }) {
    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { name: true, email: true }
    })

    return this.createNotification({
      type: 'PROJECT_INVITATION',
      title: `Project Invitation: ${projectName}`,
      content: `${inviter.name || inviter.email} invited you to join "${projectName}" as ${role.toLowerCase()}`,
      userId: inviteeId,
      entityId: projectId,
      entityType: 'project',
      metadata: {
        inviterId,
        projectId,
        projectName,
        role,
        inviterName: inviter.name || inviter.email
      },
      priority: 'HIGH'
    })
  }

  // Task assignment notification
  async notifyTaskAssigned({ taskId, assigneeId, assignerId, taskTitle, projectId }) {
    const assigner = await prisma.user.findUnique({
      where: { id: assignerId },
      select: { name: true, email: true }
    })

    return this.createNotification({
      type: 'TASK_ASSIGNED',
      title: `Task Assigned: ${taskTitle}`,
      content: `${assigner.name || assigner.email} assigned you to "${taskTitle}"`,
      userId: assigneeId,
      entityId: taskId,
      entityType: 'task',
      metadata: {
        taskId,
        assignerId,
        projectId,
        taskTitle,
        assignerName: assigner.name || assigner.email
      }
    })
  }

  // Task mention notification
  async notifyTaskMention({ taskId, mentionedUserId, mentionerId, taskTitle, commentContent, projectId }) {
    const mentioner = await prisma.user.findUnique({
      where: { id: mentionerId },
      select: { name: true, email: true }
    })

    return this.createNotification({
      type: 'TASK_MENTIONED',
      title: `Mentioned in: ${taskTitle}`,
      content: `${mentioner.name || mentioner.email} mentioned you in a comment on "${taskTitle}"`,
      userId: mentionedUserId,
      entityId: taskId,
      entityType: 'task',
      metadata: {
        taskId,
        mentionerId,
        projectId,
        taskTitle,
        commentContent: commentContent.substring(0, 100) + '...',
        mentionerName: mentioner.name || mentioner.email
      }
    })
  }

  // Task due soon notification
  async notifyTaskDueSoon({ taskId, assigneeId, taskTitle, dueDate, projectId }) {
    return this.createNotification({
      type: 'TASK_DUE_SOON',
      title: `Task Due Soon: ${taskTitle}`,
      content: `"${taskTitle}" is due on ${new Date(dueDate).toLocaleDateString()}`,
      userId: assigneeId,
      entityId: taskId,
      entityType: 'task',
      metadata: {
        taskId,
        projectId,
        taskTitle,
        dueDate
      },
      priority: 'HIGH'
    })
  }

  // Task overdue notification
  async notifyTaskOverdue({ taskId, assigneeId, taskTitle, dueDate, projectId }) {
    return this.createNotification({
      type: 'TASK_OVERDUE',
      title: `Task Overdue: ${taskTitle}`,
      content: `"${taskTitle}" was due on ${new Date(dueDate).toLocaleDateString()}`,
      userId: assigneeId,
      entityId: taskId,
      entityType: 'task',
      metadata: {
        taskId,
        projectId,
        taskTitle,
        dueDate
      },
      priority: 'URGENT'
    })
  }
}

// Export singleton instance
export const notificationService = new NotificationService()
