import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../lib/db'
import { notificationService } from '../../../../lib/notificationService'

/**
 * Manual notification trigger endpoint (for testing and administrative purposes)
 */
export async function POST(request) {
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

    const { type, data } = await request.json()

    if (!type) {
      return NextResponse.json({ error: 'Notification type is required' }, { status: 400 })
    }

    let result = null

    switch (type) {
      case 'project_invitation':
        const { projectId, inviteeEmail, role } = data
        
        if (!projectId || !inviteeEmail) {
          return NextResponse.json({ error: 'Project ID and invitee email are required' }, { status: 400 })
        }

        const project = await prisma.project.findUnique({
          where: { id: projectId }
        })

        const invitee = await prisma.user.findUnique({
          where: { email: inviteeEmail }
        })

        if (!project || !invitee) {
          return NextResponse.json({ error: 'Project or invitee not found' }, { status: 404 })
        }

        result = await notificationService.notifyProjectInvitation({
          inviterId: user.id,
          inviteeId: invitee.id,
          projectId,
          projectName: project.name,
          role: role || 'MEMBER'
        })
        break

      case 'task_assigned':
        const { taskId, assigneeId } = data
        
        if (!taskId || !assigneeId) {
          return NextResponse.json({ error: 'Task ID and assignee ID are required' }, { status: 400 })
        }

        const task = await prisma.task.findUnique({
          where: { id: taskId },
          include: { project: true }
        })

        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        result = await notificationService.notifyTaskAssigned({
          taskId,
          assigneeId,
          assignerId: user.id,
          taskTitle: task.title,
          projectId: task.projectId
        })
        break

      case 'task_mention':
        const { taskId: mentionTaskId, mentionedUserId, commentContent } = data
        
        if (!mentionTaskId || !mentionedUserId) {
          return NextResponse.json({ error: 'Task ID and mentioned user ID are required' }, { status: 400 })
        }

        const mentionTask = await prisma.task.findUnique({
          where: { id: mentionTaskId },
          include: { project: true }
        })

        if (!mentionTask) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        result = await notificationService.notifyTaskMention({
          taskId: mentionTaskId,
          mentionedUserId,
          mentionerId: user.id,
          taskTitle: mentionTask.title,
          commentContent: commentContent || 'You were mentioned in a comment.',
          projectId: mentionTask.projectId
        })
        break

      case 'task_due_soon':
        const { taskId: dueTaskId, assigneeId: dueAssigneeId } = data
        
        if (!dueTaskId || !dueAssigneeId) {
          return NextResponse.json({ error: 'Task ID and assignee ID are required' }, { status: 400 })
        }

        const dueTask = await prisma.task.findUnique({
          where: { id: dueTaskId },
          include: { project: true }
        })

        if (!dueTask) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        result = await notificationService.notifyTaskDueSoon({
          taskId: dueTaskId,
          assigneeId: dueAssigneeId,
          taskTitle: dueTask.title,
          dueDate: dueTask.dueDate,
          projectId: dueTask.projectId
        })
        break

      case 'task_overdue':
        const { taskId: overdueTaskId, assigneeId: overdueAssigneeId } = data
        
        if (!overdueTaskId || !overdueAssigneeId) {
          return NextResponse.json({ error: 'Task ID and assignee ID are required' }, { status: 400 })
        }

        const overdueTask = await prisma.task.findUnique({
          where: { id: overdueTaskId },
          include: { project: true }
        })

        if (!overdueTask) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }

        result = await notificationService.notifyTaskOverdue({
          taskId: overdueTaskId,
          assigneeId: overdueAssigneeId,
          taskTitle: overdueTask.title,
          dueDate: overdueTask.dueDate,
          projectId: overdueTask.projectId
        })
        break

      case 'test_notification':
        // Create a test notification for the current user
        result = await notificationService.createNotification({
          type: 'PROJECT_UPDATED',
          title: 'Test Notification',
          content: 'This is a test notification to verify the system is working correctly.',
          userId: user.id,
          entityId: 'test',
          entityType: 'system',
          metadata: {
            isTest: true,
            createdBy: user.id
          },
          priority: 'MEDIUM'
        })
        break

      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true, 
      notification: result?.notification,
      inboxItem: result?.inboxItem,
      message: `${type.replace('_', ' ')} notification created successfully`
    })

  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get notification statistics and system health
 */
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

    // Get notification statistics
    const [
      totalNotifications,
      unreadNotifications,
      recentNotifications,
      notificationsByType
    ] = await Promise.all([
      prisma.notification.count({
        where: { userId: user.id }
      }),
      prisma.notification.count({
        where: { userId: user.id, isRead: false }
      }),
      prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          createdAt: true,
          isRead: true
        }
      }),
      prisma.notification.groupBy({
        by: ['type'],
        where: { userId: user.id },
        _count: { type: true }
      })
    ])

    // Get inbox statistics
    const inboxStats = await notificationService.getUnreadCount(user.id)

    return NextResponse.json({
      stats: {
        total: totalNotifications,
        unread: unreadNotifications,
        inboxUnread: inboxStats
      },
      recentNotifications,
      notificationsByType: notificationsByType.reduce((acc, item) => {
        acc[item.type] = item._count.type
        return acc
      }, {}),
      systemHealth: {
        notificationService: 'active',
        webSocketConnected: notificationService.socketClient?.connected || false
      }
    })

  } catch (error) {
    console.error('Get notification stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
