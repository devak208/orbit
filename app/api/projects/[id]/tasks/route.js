import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../../lib/db'

export async function GET(request, { params }) {
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

    // Check if user has access to the project
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
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const tasks = await prisma.task.findMany({
      where: {
        projectId: params.id
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        labels: {
          include: {
            label: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ tasks })

  } catch (error) {
    console.error('Project tasks error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

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

    // Check if user has permission to create tasks in this project
    const project = await prisma.project.findFirst({
      where: {
        id: params.id,
        OR: [
          { ownerId: user.id },
          { 
            members: {
              some: { userId: user.id }
            }
          }
        ]
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
    }

    const { title, description, priority, assigneeId, dueDate, labelIds } = await request.json()

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Task title is required' }, { status: 400 })
    }

    const task = await prisma.$transaction(async (tx) => {
      // Create task
      const newTask = await tx.task.create({
        data: {
          title: title.trim(),
          description: description?.trim() || null,
          priority: priority || 'MEDIUM',
          status: 'TODO',
          projectId: params.id,
          creatorId: user.id,
          assigneeId: assigneeId || null,
          dueDate: dueDate ? new Date(dueDate) : null
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              image: true
            }
          }
        }
      })

      // Connect labels if provided
      if (labelIds && labelIds.length > 0) {
        await tx.task.update({
          where: { id: newTask.id },
          data: {
            labels: {
              connect: labelIds.map(id => ({ id }))
            }
          }
        })
      }

      // Create activity log
      await tx.activity.create({
        data: {
          type: 'TASK_CREATED',
          content: `created task "${newTask.title}"`,
          userId: user.id,
          projectId: params.id,
          taskId: newTask.id
        }
      })

      return newTask
    })

    return NextResponse.json({ task }, { status: 201 })

  } catch (error) {
    console.error('Create task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
