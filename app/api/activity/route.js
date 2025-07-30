import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../lib/db'

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

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    let whereClause = {}

    if (projectId) {
      // Check if user has access to this project
      const project = await prisma.project.findFirst({
        where: {
          id: projectId,
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
        return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
      }
      whereClause = { projectId: projectId }
    } else {
      // Get all projects for the user
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
      whereClause = { projectId: { in: projectIds } }
    }

    const activities = await prisma.activity.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    })

    return NextResponse.json({ activities })

  } catch (error) {
    console.error('Activity error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
