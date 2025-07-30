import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../../lib/db'

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

    // Check for pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        projectId: params.id,
        email
      }
    })

    if (existingInvitation) {
      return NextResponse.json({ error: 'An invitation has already been sent to this email address' }, { status: 400 })
    }

    // Create invitation and inbox item in a transaction
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

      // Find the invited user if they exist
      const invitedUser = await tx.user.findUnique({
        where: { email }
      })

      // Create inbox item if the user exists
      if (invitedUser) {
        await tx.inboxItem.create({
          data: {
            title: `Project Invitation: ${project.name}`,
            content: `${user.name || user.email} invited you to join the project "${project.name}" as a ${role || 'MEMBER'}.`,
            type: 'PROJECT_INVITATION',
            status: 'ACTIVE',
            userId: invitedUser.id,
            metadata: {
              invitationId: invitation.id,
              projectId: params.id,
              projectName: project.name,
              inviterId: user.id,
              role: role || 'MEMBER'
            }
          }
        })
      }

      return invitation
    })

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

      // Find and delete related inbox items
      const inboxItems = await tx.inboxItem.findMany({
        where: {
          type: 'PROJECT_INVITATION'
        }
      })
      
      // Filter items that match the invitation ID in metadata
      const itemsToDelete = inboxItems.filter(item => 
        item.metadata && 
        typeof item.metadata === 'object' && 
        item.metadata.invitationId === invitationId
      )
      
      // Delete the matching items
      if (itemsToDelete.length > 0) {
        await tx.inboxItem.deleteMany({
          where: {
            id: {
              in: itemsToDelete.map(item => item.id)
            }
          }
        })
      }
    })

    return NextResponse.json({ message: 'Invitation cancelled successfully' })

  } catch (error) {
    console.error('Cancel invitation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
