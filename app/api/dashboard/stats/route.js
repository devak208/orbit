import { NextResponse } from 'next/server'
import { getAuthSession } from '../../../../lib/auth'
import { prisma } from '../../../../lib/db'

export async function GET() {
  try {
    const session = await getAuthSession()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's projects (owned or member)
    const userProjects = await prisma.project.findMany({
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
      select: { id: true }
    })

    const projectIds = userProjects.map(p => p.id)

    // Get stats
    const [totalProjects, totalTasks, completedTasks, overdueTasks] = await Promise.all([
      // Total projects
      prisma.project.count({
        where: {
          OR: [
            { ownerId: user.id },
            { 
              members: {
                some: { userId: user.id }
              }
            }
          ]
        }
      }),
      
      // Total tasks in user's projects
      prisma.task.count({
        where: {
          projectId: { in: projectIds }
        }
      }),
      
      // Completed tasks
      prisma.task.count({
        where: {
          projectId: { in: projectIds },
          status: 'DONE'
        }
      }),
      
      // Overdue tasks
      prisma.task.count({
        where: {
          projectId: { in: projectIds },
          dueDate: { lt: new Date() },
          status: { not: 'DONE' }
        }
      })
    ])

    return NextResponse.json({
      totalProjects,
      totalTasks,
      completedTasks,
      overdueTasks
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
