import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET(request, { params }) {
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

    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: user.id },
          { 
            members: {
              some: { userId: user.id }
            }
          },
          { isPublic: true }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        members: {
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
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            updatedAt: 'desc'
          }
        },
        labels: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if current user has OWNER or ADMIN role to include invitations
    const currentMember = project.members?.find(m => m.user?.id === user.id)
    const currentUserRole = currentMember?.role || (project.ownerId === user.id ? 'OWNER' : null)
    
    // Only include invitations if user is OWNER or ADMIN
    if (currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') {
      const invitations = await prisma.invitation.findMany({
        where: {
          projectId: params.id,
          status: 'PENDING'
        },
        include: {
          inviter: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          }
        }
      })
      
      project.invitations = invitations
    } else {
      project.invitations = []
    }

    return NextResponse.json({ project, currentUserId: user.id })

  } catch (error) {
    console.error('Project detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Check if user has permission to edit the project
    const existingProject = await prisma.project.findFirst({
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

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
    }

    const { name, description, color, isPublic } = await request.json()

    const updatedProject = await prisma.project.update({
      where: { id: params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color && { color }),
        ...(isPublic !== undefined && { isPublic })
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        members: {
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
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'PROJECT_UPDATED',
        content: `updated project "${updatedProject.name}"`,
        userId: user.id,
        projectId: updatedProject.id
      }
    })

    return NextResponse.json({ project: updatedProject })

  } catch (error) {
    console.error('Update project error:', error)
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

    // Check if user is the owner
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        ownerId: user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
    }

    // Delete the project (this will cascade delete related records)
    await prisma.project.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Project deleted successfully' })

  } catch (error) {
    console.error('Delete project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
