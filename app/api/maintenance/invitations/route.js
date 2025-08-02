import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../lib/db'
import { notificationService } from '../../../../lib/notificationService'

/**
 * Maintenance API for invitation system
 * Handles automated cleanup and maintenance tasks
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

    // For now, allow any authenticated user to run maintenance
    // In production, you might want to restrict this to admins
    
    const { task } = await request.json()

    let result = {}

    switch (task) {
      case 'cleanup_expired':
        result = await notificationService.cleanupExpiredInvitations()
        break

      case 'cleanup_old_rejected':
        // Clean up old rejected invitations (older than 30 days)
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        
        const oldRejectedInvitations = await prisma.invitation.findMany({
          where: {
            status: 'DECLINED',
            createdAt: { lt: cutoffDate }
          }
        })

        await prisma.$transaction(async (tx) => {
          // Delete old rejected invitations
          await tx.invitation.deleteMany({
            where: {
              status: 'DECLINED',
              createdAt: { lt: cutoffDate }
            }
          })

          // Clean up related notifications
          for (const invitation of oldRejectedInvitations) {
            await tx.notification.deleteMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              }
            })

            await tx.inboxItem.deleteMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              }
            })
          }
        })

        result = {
          success: true,
          cleanedRejected: oldRejectedInvitations.length,
          message: `Cleaned up ${oldRejectedInvitations.length} old rejected invitations`
        }
        break

      case 'sync_invitation_notifications':
        // Sync invitation statuses with notification states
        const invitations = await prisma.invitation.findMany({
          where: {
            status: { in: ['ACCEPTED', 'DECLINED', 'EXPIRED'] }
          }
        })

        let syncedCount = 0
        
        for (const invitation of invitations) {
          const user = await prisma.user.findUnique({
            where: { email: invitation.email }
          })

          if (user) {
            await prisma.notification.updateMany({
              where: {
                userId: user.id,
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              },
              data: { isRead: true }
            })

            if (invitation.status === 'DECLINED') {
              await prisma.inboxItem.updateMany({
                where: {
                  userId: user.id,
                  type: 'PROJECT_INVITATION',
                  metadata: { path: ['invitationId'], equals: invitation.id }
                },
                data: { status: 'DELETED' }
              })
            } else {
              await prisma.inboxItem.updateMany({
                where: {
                  userId: user.id,
                  type: 'PROJECT_INVITATION',
                  metadata: { path: ['invitationId'], equals: invitation.id }
                },
                data: { status: 'ARCHIVED' }
              })
            }

            syncedCount++
          }
        }

        result = {
          success: true,
          syncedCount,
          message: `Synced ${syncedCount} invitation notifications`
        }
        break

      case 'health_check':
        // Perform a health check on the invitation system
        const stats = await getInvitationSystemStats()
        result = {
          success: true,
          stats,
          message: 'Invitation system health check completed'
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid maintenance task' }, { status: 400 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Maintenance task error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET - Get invitation system statistics
export async function GET(request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await getInvitationSystemStats()
    
    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Get invitation stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to get invitation system statistics
async function getInvitationSystemStats() {
  const [
    totalInvitations,
    pendingInvitations,
    acceptedInvitations,
    declinedInvitations,
    expiredInvitations,
    expiredPendingInvitations,
    orphanedNotifications,
    orphanedInboxItems
  ] = await Promise.all([
    // Total invitations
    prisma.invitation.count(),
    
    // Pending invitations
    prisma.invitation.count({
      where: { 
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    }),
    
    // Accepted invitations
    prisma.invitation.count({
      where: { status: 'ACCEPTED' }
    }),
    
    // Declined invitations
    prisma.invitation.count({
      where: { status: 'DECLINED' }
    }),
    
    // Explicitly expired invitations
    prisma.invitation.count({
      where: { status: 'EXPIRED' }
    }),
    
    // Pending invitations that have expired
    prisma.invitation.count({
      where: { 
        status: 'PENDING',
        expiresAt: { lt: new Date() }
      }
    }),
    
    // Orphaned notifications (invitations that no longer exist)
    prisma.notification.count({
      where: {
        type: 'PROJECT_INVITATION',
        // This is a simplified check - in a real implementation you'd want to join with invitations
      }
    }),
    
    // Orphaned inbox items
    prisma.inboxItem.count({
      where: {
        type: 'PROJECT_INVITATION',
        status: { not: 'DELETED' }
      }
    })
  ])

  return {
    total: totalInvitations,
    pending: pendingInvitations,
    accepted: acceptedInvitations,
    declined: declinedInvitations,
    expired: expiredInvitations,
    expiredPending: expiredPendingInvitations,
    orphanedNotifications,
    orphanedInboxItems,
    needsCleanup: expiredPendingInvitations > 0 || orphanedNotifications > 0,
    lastUpdated: new Date().toISOString()
  }
}
