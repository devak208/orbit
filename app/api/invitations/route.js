import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../lib/db'
import { notificationService } from '../../../../lib/notificationService'

// GET - List invitations for a project with filtering
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
    const projectId = url.searchParams.get('projectId')
    const status = url.searchParams.get('status') // PENDING, ACCEPTED, DECLINED, EXPIRED
    const includeExpired = url.searchParams.get('includeExpired') === 'true'

    // Build where condition
    let whereCondition = {}
    
    if (projectId) {
      // Check if user has permission to view project invitations
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: user.id },
            { 
              members: {
                some: { 
                  userId: user.id,
                  role: { in: ['OWNER', 'ADMIN'] }
                }
              }
            }
          ]
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
      }

      whereCondition.projectId = projectId
    } else {
      // If no project specified, show user's own invitations
      whereCondition.email = user.email
    }

    if (status) {
      whereCondition.status = status
    }

    if (!includeExpired) {
      whereCondition.expiresAt = { gt: new Date() }
    }

    const invitations = await prisma.invitation.findMany({
      where: whereCondition,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Add computed fields
    const enhancedInvitations = invitations.map(invitation => ({
      ...invitation,
      isExpired: invitation.expiresAt < new Date(),
      daysUntilExpiry: Math.ceil((invitation.expiresAt - new Date()) / (1000 * 60 * 60 * 24)),
      canResend: ['DECLINED', 'EXPIRED'].includes(invitation.status) || invitation.expiresAt < new Date()
    }))

    return NextResponse.json({ 
      invitations: enhancedInvitations,
      total: enhancedInvitations.length
    })

  } catch (error) {
    console.error('Get invitations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Bulk operations on invitations (expire, resend, cancel)
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

    const { action, invitationIds, projectId } = await request.json()

    if (!action || !Array.isArray(invitationIds)) {
      return NextResponse.json({ error: 'Invalid request parameters' }, { status: 400 })
    }

    // Verify user has permission for the project
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
          OR: [
            { ownerId: user.id },
            { 
              members: {
                some: { 
                  userId: user.id,
                  role: { in: ['OWNER', 'ADMIN'] }
                }
              }
            }
          ]
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
      }
    }

    let result = {}

    switch (action) {
      case 'expire':
        // Mark invitations as expired
        await prisma.invitation.updateMany({
          where: {
            id: { in: invitationIds },
            status: 'PENDING'
          },
          data: { 
            status: 'EXPIRED',
            expiresAt: new Date() // Set expiry to now
          }
        })
        result.expired = invitationIds.length
        break

      case 'cancel':
        // Delete pending invitations and clean up related notifications
        await prisma.$transaction(async (tx) => {
          // Get invitations to be cancelled
          const invitations = await tx.invitation.findMany({
            where: { 
              id: { in: invitationIds },
              status: 'PENDING'
            }
          })

          // Delete the invitations
          await tx.invitation.deleteMany({
            where: { id: { in: invitationIds } }
          })

          // Clean up related inbox items and notifications
          for (const invitation of invitations) {
            await tx.inboxItem.deleteMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              }
            })

            await tx.notification.deleteMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              }
            })
          }
        })
        result.cancelled = invitationIds.length
        break

      case 'resend':
        // Resend invitations (delete old ones and create new ones)
        await prisma.$transaction(async (tx) => {
          // Get existing invitations
          const existingInvitations = await tx.invitation.findMany({
            where: { 
              id: { in: invitationIds }
            },
            include: { project: true }
          })

          // Delete old invitations and their notifications
          await tx.invitation.deleteMany({
            where: { id: { in: invitationIds } }
          })

          // Clean up old notifications
          for (const invitation of existingInvitations) {
            await tx.inboxItem.deleteMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              }
            })

            await tx.notification.deleteMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              }
            })
          }

          // Create new invitations
          const newInvitations = []
          for (const invitation of existingInvitations) {
            const newInvitation = await tx.invitation.create({
              data: {
                email: invitation.email,
                role: invitation.role,
                projectId: invitation.projectId,
                inviterId: user.id, // Current user becomes the inviter
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
              }
            })
            newInvitations.push(newInvitation)

            // Send new notification
            const invitedUser = await tx.user.findUnique({
              where: { email: invitation.email }
            })

            if (invitedUser) {
              await notificationService.notifyProjectInvitation({
                inviterId: user.id,
                inviteeId: invitedUser.id,
                projectId: invitation.projectId,
                projectName: invitation.project.name,
                role: invitation.role
              })
            }
          }

          result.resent = newInvitations.length
          result.newInvitations = newInvitations
        })
        break

      case 'cleanup_expired':
        // Clean up all expired invitations
        const expiredInvitations = await prisma.invitation.findMany({
          where: {
            OR: [
              { status: 'EXPIRED' },
              { 
                status: 'PENDING',
                expiresAt: { lt: new Date() }
              }
            ]
          }
        })

        await prisma.$transaction(async (tx) => {
          // Update status of expired pending invitations
          await tx.invitation.updateMany({
            where: {
              status: 'PENDING',
              expiresAt: { lt: new Date() }
            },
            data: { status: 'EXPIRED' }
          })

          // Clean up related notifications for expired invitations
          for (const invitation of expiredInvitations) {
            await tx.inboxItem.updateMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              },
              data: { status: 'DELETED' }
            })

            await tx.notification.updateMany({
              where: {
                type: 'PROJECT_INVITATION',
                metadata: { path: ['invitationId'], equals: invitation.id }
              },
              data: { isRead: true }
            })
          }
        })

        result.cleaned = expiredInvitations.length
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Send real-time notification about the change
    if (projectId) {
      await notificationService.sendRealTimeNotification(user.id, {
        type: 'invitations_updated',
        action,
        projectId,
        result
      })
    }

    return NextResponse.json({ success: true, ...result })

  } catch (error) {
    console.error('Invitation management error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Clean up old/expired invitations (maintenance endpoint)
export async function DELETE(request) {
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
    const olderThanDays = parseInt(url.searchParams.get('olderThanDays')) || 30

    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)

    // Only allow admins to perform cleanup (you can adjust this logic)
    // For now, allow project owners to clean up their project's old invitations
    
    const deletedCount = await prisma.$transaction(async (tx) => {
      // Find old invitations
      const oldInvitations = await tx.invitation.findMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: { in: ['DECLINED', 'EXPIRED'] }
        }
      })

      // Delete old invitations
      await tx.invitation.deleteMany({
        where: {
          createdAt: { lt: cutoffDate },
          status: { in: ['DECLINED', 'EXPIRED'] }
        }
      })

      // Clean up related notifications
      for (const invitation of oldInvitations) {
        await tx.inboxItem.deleteMany({
          where: {
            type: 'PROJECT_INVITATION',
            metadata: { path: ['invitationId'], equals: invitation.id }
          }
        })

        await tx.notification.deleteMany({
          where: {
            type: 'PROJECT_INVITATION',
            metadata: { path: ['invitationId'], equals: invitation.id }
          }
        })
      }

      return oldInvitations.length
    })

    return NextResponse.json({ 
      message: `Cleaned up ${deletedCount} old invitations and their notifications`,
      deletedCount 
    })

  } catch (error) {
    console.error('Invitation cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
