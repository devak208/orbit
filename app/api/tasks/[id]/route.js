import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../lib/db'

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

    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        project: {
          OR: [
            { ownerId: user.id },
            { 
              members: {
                some: { userId: user.id }
              }
            }
          ]
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        labels: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json({ task })

  } catch (error) {
    console.error('Task detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request, { params }) {
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

    // Check if user has access to the task
    const existingTask = await prisma.task.findFirst({
      where: {
        id: params.id,
        project: {
          OR: [
            { ownerId: user.id },
            { 
              members: {
                some: { userId: user.id }
              }
            }
          ]
        }
      },
      include: {
        project: true
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found or insufficient permissions' }, { status: 404 })
    }

    const { title, description, status, priority, assigneeId, dueDate } = await request.json()

    const updatedTask = await prisma.task.update({
      where: { id: params.id },
      data: {
        ...(title && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(assigneeId !== undefined && { assigneeId }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null })
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            image: true
          }
        }
      }
    })

    // Create activity log
    let activityType = 'TASK_UPDATED'
    let activityContent = `updated task "${updatedTask.title}"`
    
    if (status && status !== existingTask.status) {
      if (status === 'DONE') {
        activityType = 'TASK_COMPLETED'
        activityContent = `completed task "${updatedTask.title}"`
      } else {
        activityContent = `changed status of "${updatedTask.title}" to ${status.toLowerCase()}`
      }
    }

    await prisma.activity.create({
      data: {
        type: activityType,
        content: activityContent,
        userId: user.id,
        projectId: existingTask.projectId,
        taskId: updatedTask.id
      }
    })

    return NextResponse.json({ task: updatedTask })

  } catch (error) {
    console.error('Update task error:', error)
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

    // Check if user has permission to delete the task
    const task = await prisma.task.findFirst({
      where: {
        id: params.id,
        project: {
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
      },
      include: {
        project: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or insufficient permissions' }, { status: 404 })
    }

    // Create activity log before deletion
    await prisma.activity.create({
      data: {
        type: 'TASK_DELETED',
        content: `deleted task "${task.title}"`,
        userId: user.id,
        projectId: task.projectId
      }
    })

    // Delete the task
    await prisma.task.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: 'Task deleted successfully' })

  } catch (error) {
    console.error('Delete task error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
