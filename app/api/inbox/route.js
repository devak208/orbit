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
    const filter = url.searchParams.get('filter') || 'active' // active, archived, all
    const type = url.searchParams.get('type') // filter by type
    const limit = parseInt(url.searchParams.get('limit')) || 50

    // Build where condition
    let whereCondition = {
      userId: user.id,
      status: filter === 'all' ? undefined : filter === 'archived' ? 'ARCHIVED' : { not: 'DELETED' }
    }

    if (filter === 'active') {
      whereCondition.status = 'ACTIVE'
    }

    if (type) {
      whereCondition.type = type
    }

    const items = await prisma.inboxItem.findMany({
      where: whereCondition,
      include: {
        reads: {
          where: { userId: user.id }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    // Transform items to include isRead flag and enhanced metadata
    const itemsWithReadStatus = items.map(item => ({
      ...item,
      isRead: item.reads.length > 0,
      reads: undefined, // Remove the reads array from response
      metadata: {
        ...item.metadata,
        // Add computed fields
        timeAgo: getTimeAgo(item.createdAt),
        priority: item.metadata?.priority || 'MEDIUM'
      }
    }))

    // Get summary statistics
    const stats = await getInboxStats(user.id)

    return NextResponse.json({ 
      items: itemsWithReadStatus,
      stats,
      pagination: {
        total: items.length,
        limit,
        hasMore: items.length === limit
      }
    })

  } catch (error) {
    console.error('Inbox error:', error)
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

    const { action, ids, options = {} } = await request.json()

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
    }

    let result = {}

    switch (action) {
      case 'mark_read':
        // Create InboxItemRead records for unread items
        for (const id of ids) {
          await prisma.inboxItemRead.upsert({
            where: {
              userId_inboxItemId: {
                userId: user.id,
                inboxItemId: id
              }
            },
            update: {},
            create: {
              userId: user.id,
              inboxItemId: id
            }
          })
        }

        // Get associated notification IDs and mark them as read
        const inboxItems = await prisma.inboxItem.findMany({
          where: { id: { in: ids }, userId: user.id },
          select: { metadata: true }
        })

        const notificationIds = inboxItems
          .map(item => item.metadata?.notificationId)
          .filter(Boolean)

        if (notificationIds.length > 0) {
          await notificationService.markAsRead(user.id, notificationIds)
        }

        result.markedAsRead = ids.length
        break

      case 'mark_unread':
        // Delete InboxItemRead records
        await prisma.inboxItemRead.deleteMany({
          where: {
            userId: user.id,
            inboxItemId: { in: ids }
          }
        })

        // Mark associated notifications as unread
        const unreadInboxItems = await prisma.inboxItem.findMany({
          where: { id: { in: ids }, userId: user.id },
          select: { metadata: true }
        })

        const unreadNotificationIds = unreadInboxItems
          .map(item => item.metadata?.notificationId)
          .filter(Boolean)

        if (unreadNotificationIds.length > 0) {
          await prisma.notification.updateMany({
            where: {
              id: { in: unreadNotificationIds },
              userId: user.id
            },
            data: { isRead: false }
          })
        }

        result.markedAsUnread = ids.length
        break

      case 'archive':
        await prisma.inboxItem.updateMany({
          where: {
            id: { in: ids },
            userId: user.id
          },
          data: { 
            status: 'ARCHIVED'
          }
        })

        result.archived = ids.length
        break

      case 'unarchive':
        await prisma.inboxItem.updateMany({
          where: {
            id: { in: ids },
            userId: user.id,
            status: 'ARCHIVED'
          },
          data: { 
            status: 'ACTIVE'
          }
        })

        result.unarchived = ids.length
        break

      case 'delete':
        await prisma.inboxItem.updateMany({
          where: {
            id: { in: ids },
            userId: user.id
          },
          data: { 
            status: 'DELETED'
          }
        })

        result.deleted = ids.length
        break

      case 'bulk_action':
        // Handle bulk actions based on options
        const { readAction, archiveAction } = options
        
        if (readAction) {
          // Mark all as read
          const allItems = await prisma.inboxItem.findMany({
            where: { userId: user.id, status: 'ACTIVE' }
          })
          
          for (const item of allItems) {
            await prisma.inboxItemRead.upsert({
              where: {
                userId_inboxItemId: {
                  userId: user.id,
                  inboxItemId: item.id
                }
              },
              update: {},
              create: {
                userId: user.id,
                inboxItemId: item.id
              }
            })
          }
          
          result.bulkMarkedAsRead = allItems.length
        }
        
        if (archiveAction) {
          // Archive all read items
          const readItems = await prisma.inboxItem.findMany({
            where: {
              userId: user.id,
              status: 'ACTIVE',
              reads: { some: { userId: user.id } }
            }
          })
          
          await prisma.inboxItem.updateMany({
            where: {
              id: { in: readItems.map(item => item.id) },
              userId: user.id
            },
            data: { status: 'ARCHIVED' }
          })
          
          result.bulkArchived = readItems.length
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Send real-time notification about the change
    await notificationService.sendRealTimeNotification(user.id, {
      type: 'inbox_updated',
      action,
      ids,
      result
    })

    return NextResponse.json({ success: true, ...result })

  } catch (error) {
    console.error('Inbox update error:', error)
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

// Helper function to get inbox statistics
async function getInboxStats(userId) {
  const [unreadCount, totalCount, archivedCount] = await Promise.all([
    prisma.inboxItem.count({
      where: {
        userId,
        status: 'ACTIVE',
        reads: { none: { userId } }
      }
    }),
    prisma.inboxItem.count({
      where: {
        userId,
        status: { not: 'DELETED' }
      }
    }),
    prisma.inboxItem.count({
      where: {
        userId,
        status: 'ARCHIVED'
      }
    })
  ])

  return {
    unread: unreadCount,
    total: totalCount,
    archived: archivedCount,
    active: totalCount - archivedCount
  }
}
