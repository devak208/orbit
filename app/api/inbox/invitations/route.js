import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { invitationId, action } = await request.json()

    if (!invitationId || !action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        email: user.email, // Can only accept/reject own invitations
        status: 'PENDING'
      },
      include: { project: true }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found or has expired' }, { status: 404 })
    }

    if (action === 'accept') {
      // Use a transaction to ensure data integrity
      await prisma.$transaction(async (tx) => {
        // 1. Add user to project members
        await tx.projectMember.create({
          data: {
            userId: user.id,
            projectId: invitation.projectId,
            role: invitation.role
          }
        })

        // 2. Update invitation status
        await tx.invitation.update({
          where: { id: invitationId },
          data: { status: 'ACCEPTED' }
        })

        // 3. Update inbox item status
        await tx.inboxItem.updateMany({
          where: {
            type: 'PROJECT_INVITATION',
            metadata: { path: ['invitationId'], equals: invitationId }
          },
          data: { status: 'ARCHIVED' }
        })

        // 4. Create an activity log entry
        await tx.activity.create({
          data: {
            type: 'MEMBER_JOINED',
            content: `joined the project \"${invitation.project.name}\" after accepting an invitation`,
            userId: user.id,
            projectId: invitation.projectId
          }
        })
      })

      return NextResponse.json({ message: 'Invitation accepted successfully!' })
    } else { // action === 'reject'
      await prisma.$transaction(async (tx) => {
        // 1. Update invitation status
        await tx.invitation.update({
          where: { id: invitationId },
          data: { status: 'DECLINED' }
        })

        // 2. Update inbox item status
        await tx.inboxItem.updateMany({
          where: {
            type: 'PROJECT_INVITATION',
            metadata: { path: ['invitationId'], equals: invitationId }
          },
          data: { status: 'ARCHIVED' }
        })
      })

      return NextResponse.json({ message: 'Invitation rejected' })
    }

  } catch (error) {
    console.error('Handle invitation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
