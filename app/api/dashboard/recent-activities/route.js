import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '../../../../lib/db'

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

    // Get user's projects
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

    const activities = await prisma.activity.findMany({
      where: {
        projectId: { in: projectIds }
      },
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
      take: 10
    })

    return NextResponse.json({ activities })

  } catch (error) {
    console.error('Recent activities error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
