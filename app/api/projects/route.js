import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../lib/db'

export async function GET() {
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

    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: user.id },
          { 
            members: {
              some: { userId: user.id }
            }
          }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          }
        },
        tasks: {
          select: {
            status: true
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({ projects })

  } catch (error) {
    console.error('Projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    const { name, description, color, isPublic } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const project = await prisma.$transaction(async (tx) => {
      // Create project
      const newProject = await tx.project.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || null,
          isPublic: isPublic || false,
          ownerId: user.id
        },
        include: {
          owner: {
            select: {
              id: true,
              name: true,
              image: true
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

      // Add owner as project member with OWNER role
      await tx.projectMember.create({
        data: {
          userId: user.id,
          projectId: newProject.id,
          role: 'OWNER'
        }
      })

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'PROJECT_CREATED',
          content: `created project "${newProject.name}"`,
          userId: user.id,
          projectId: newProject.id
        }
      })

      // Create default labels
      const defaultLabels = [
        { name: 'Bug', color: '#ef4444' },
        { name: 'Feature', color: '#3b82f6' },
        { name: 'Enhancement', color: '#10b981' },
        { name: 'Documentation', color: '#8b5cf6' }
      ]

      for (const label of defaultLabels) {
        await tx.label.create({
          data: {
            name: label.name,
            color: label.color,
            projectId: newProject.id
          }
        })
      }

      return newProject
    })

    return NextResponse.json({ project }, { status: 201 })

  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
