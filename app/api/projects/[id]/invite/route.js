import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../../lib/db'
import { notificationService } from '../../../../../lib/notificationService'

export async function POST(request, { params }) {
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

    // Check if user is an admin or owner of the project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
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

    const { email, role } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId: params.id,
        user: { email }
      }
    })

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this project' }, { status: 400 })
    }

    // Check for pending invitation (only block if PENDING)
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        projectId: params.id,
        email,
        status: 'PENDING',
        expiresAt: { gt: new Date() } // Only consider non-expired pending invitations
      }
    })

    if (existingInvitation) {
      return NextResponse.json({ 
        error: 'A pending invitation has already been sent to this email address' 
      }, { status: 400 })
    }

    // Clean up any expired or rejected/declined invitations before creating new one
    await prisma.invitation.deleteMany({
      where: {
        projectId: params.id,
        email,
        OR: [
          { status: { in: ['DECLINED', 'EXPIRED'] } },
          { 
            status: 'PENDING',
            expiresAt: { lt: new Date() } // Expired pending invitations
          }
        ]
      }
    })

    // Find the invited user to get their ID
    const invitedUser = await prisma.user.findUnique({
      where: { email }
    })

    // Create invitation and notification in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create invitation
      const invitation = await tx.invitation.create({
        data: {
          email,
          role: role || 'MEMBER',
          projectId: params.id,
          inviterId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
        }
      })

      return invitation
    })

    // If the invited user exists, create notification using the service
    if (invitedUser) {
      await notificationService.notifyProjectInvitation({
        inviterId: user.id,
        inviteeId: invitedUser.id,
        projectId: params.id,
        projectName: project.name,
        role: role || 'MEMBER',
        invitationId: result.id // Pass the invitation ID
      })
    } else {
      // For users not yet registered, create a simple inbox item
      console.log(`📧 Would send email invitation to ${email} for project ${project.name}`)
      // TODO: Implement email service here
    }

    return NextResponse.json({ invitation: result }, { status: 201 })

  } catch (error) {
    console.error('Invite member error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
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

    // Check if user is an admin or owner of the project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
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

    const { invitationId } = await request.json()

    if (!invitationId) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 })
    }

    // Delete invitation and related inbox items in a transaction
    await prisma.$transaction(async (tx) => {
      // Find the invitation first to get the email
      const invitation = await tx.invitation.findUnique({
        where: { 
          id: invitationId,
          projectId: params.id
        }
      })

      if (!invitation) {
        throw new Error('Invitation not found')
      }

      // Delete the invitation
      await tx.invitation.delete({
        where: { id: invitationId }
      })
    })

    // Use notification service to handle cancellation cleanup
    await notificationService.handleInvitationCancelled(invitationId, params.id)

    return NextResponse.json({ message: 'Invitation cancelled successfully' })

  } catch (error) {
    console.error('Cancel invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
