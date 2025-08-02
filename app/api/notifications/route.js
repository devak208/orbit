import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../lib/db'
import { notificationService } from '../../../lib/notificationService'

export async function GET(request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit')) || 50
    const offset = parseInt(url.searchParams.get('offset')) || 0
    const type = url.searchParams.get('type')
    const unreadOnly = url.searchParams.get('unread_only') === 'true'

    // Build where condition
    let whereCondition = { userId: user.id }
    
    if (type) {
      whereCondition.type = type
    }
    
    if (unreadOnly) {
      whereCondition.isRead = false
    }

    const [notifications, unreadCount, totalCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.notification.count({
        where: { 
          userId: user.id,
          isRead: false
        }
      }),
      prisma.notification.count({
        where: { userId: user.id }
      })
    ])

    // Enhance notifications with computed fields
    const enhancedNotifications = notifications.map(notification => ({
      ...notification,
      timeAgo: getTimeAgo(notification.createdAt),
      priority: notification.metadata?.priority || 'MEDIUM',
      actionable: isActionableNotification(notification.type),
      entityLink: getEntityLink(notification.metadata)
    }))

    return NextResponse.json({ 
      notifications: enhancedNotifications, 
      unreadCount,
      totalCount,
      pagination: {
        limit,
        offset,
        hasMore: notifications.length === limit
      }
    })

  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { action, notificationIds, options = {} } = await request.json()

    if (!action) {
      return NextResponse.json({ error: 'Action required' }, { status: 400 })
    }

    let result = {}

    switch (action) {
      case 'mark_read':
        if (!Array.isArray(notificationIds)) {
          return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
        }

        await notificationService.markAsRead(user.id, notificationIds)
        result.markedAsRead = notificationIds.length
        break

      case 'mark_unread':
        if (!Array.isArray(notificationIds)) {
          return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
        }

        await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: user.id
          },
          data: { isRead: false }
        })

        // Mark corresponding inbox items as unread
        await prisma.inboxItemRead.deleteMany({
          where: {
            userId: user.id,
            inboxItem: {
              metadata: {
                path: ['notificationId'],
                in: notificationIds
              }
            }
          }
        })

        result.markedAsUnread = notificationIds.length
        break

      case 'mark_all_read':
        const allUnread = await prisma.notification.findMany({
          where: {
            userId: user.id,
            isRead: false
          },
          select: { id: true }
        })

        if (allUnread.length > 0) {
          await notificationService.markAsRead(user.id, allUnread.map(n => n.id))
          result.markedAsRead = allUnread.length
        }
        break

      case 'archive':
        if (!Array.isArray(notificationIds)) {
          return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
        }

        await notificationService.archiveNotifications(user.id, notificationIds)
        result.archived = notificationIds.length
        break

      case 'delete':
        if (!Array.isArray(notificationIds)) {
          return NextResponse.json({ error: 'Invalid notification IDs' }, { status: 400 })
        }

        // Soft delete notifications
        await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId: user.id
          },
          data: {
            metadata: {
              ...{},
              deleted: true,
              deletedAt: new Date().toISOString()
            }
          }
        })

        // Archive corresponding inbox items
        await prisma.inboxItem.updateMany({
          where: {
            userId: user.id,
            metadata: {
              path: ['notificationId'],
              in: notificationIds
            }
          },
          data: { status: 'DELETED' }
        })

        result.deleted = notificationIds.length
        break

      case 'bulk_archive_read':
        // Archive all read notifications
        const readNotifications = await prisma.notification.findMany({
          where: {
            userId: user.id,
            isRead: true
          },
          select: { id: true }
        })

        if (readNotifications.length > 0) {
          await notificationService.archiveNotifications(user.id, readNotifications.map(n => n.id))
          result.bulkArchived = readNotifications.length
        }
        break

      case 'update_preferences':
        // Update user notification preferences
        const { preferences } = options
        
        // TODO: Implement user preferences update
        // For now, just return success
        result.preferencesUpdated = true
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, ...result })

  } catch (error) {
    console.error('Update notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get time ago
function getTimeAgo(date) {
  const now = new Date()
  const diffInMs = now - new Date(date)
  const diffInMins = Math.floor(diffInMs / (1000 * 60))
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInMins < 1) return 'Just now'
  if (diffInMins < 60) return `${diffInMins}m ago`
  if (diffInHours < 24) return `${diffInHours}h ago`
  if (diffInDays < 7) return `${diffInDays}d ago`
  
  return new Date(date).toLocaleDateString()
}

// Helper function to determine if notification is actionable
function isActionableNotification(type) {
  const actionableTypes = [
    'PROJECT_INVITATION',
    'TASK_ASSIGNED',
    'TASK_DUE_SOON',
    'TASK_OVERDUE'
  ]
  return actionableTypes.includes(type)
}

// Helper function to generate entity link
function getEntityLink(metadata) {
  if (!metadata) return null

  const { entityType, entityId, projectId } = metadata

  switch (entityType) {
    case 'project':
      return `/dashboard/projects/${entityId}`
    case 'task':
      return `/dashboard/projects/${projectId}/board?task=${entityId}`
    default:
      return null
  }
}
