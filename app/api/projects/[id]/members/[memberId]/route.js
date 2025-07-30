import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../../../lib/auth'
import { prisma } from '../../../../../../lib/db'

export async function PATCH(request, { params }) {
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

    const { role } = await request.json()

    if (!role || !['MEMBER', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update member role
    const updatedMember = await prisma.projectMember.update({
      where: { 
        id: params.memberId,
        projectId: params.id
      },
      data: { role },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'MEMBER_UPDATED',
        content: `changed ${updatedMember.user?.name}'s role to ${role.toLowerCase()}`,
        userId: user.id,
        projectId: params.id
      }
    })

    return NextResponse.json({ member: updatedMember })

  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request, { params }) {
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

    // Get member details before deletion
    const member = await prisma.projectMember.findUnique({
      where: {
        id: params.memberId,
        projectId: params.id
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    })

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    // Prevent removing the project owner
    if (member.role === 'OWNER') {
      return NextResponse.json({ error: 'Cannot remove project owner' }, { status: 400 })
    }

    // Remove member
    await prisma.projectMember.delete({
      where: {
        id: params.memberId,
        projectId: params.id
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'MEMBER_REMOVED',
        content: `removed ${member.user?.name} from the project`,
        userId: user.id,
        projectId: params.id
      }
    })

    return NextResponse.json({ message: 'Member removed successfully' })

  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
